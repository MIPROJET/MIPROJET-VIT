// Sends two emails when an investor manifests interest:
//   1) to invest@ivoireprojet.com — internal notification with full prospect details
//   2) to the candidate — branded confirmation
//
// Body: { prospectId: string } OR full prospect payload
import { sendMail, brandedEmailShell, corsHeaders } from "../_shared/mailer.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ADMIN_INBOX = "invest@ivoireprojet.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let prospect: any = body;
    if (body.prospectId) {
      const { data } = await supabase
        .from("investor_prospects")
        .select("*")
        .eq("id", body.prospectId)
        .maybeSingle();
      prospect = data;
    }
    if (!prospect) return json({ ok: false, error: "Prospect not found" }, 404);

    // Resolve project title (if id given)
    let projectTitle = prospect.project_title ?? "—";
    if (prospect.project_id) {
      const { data: p } = await supabase
        .from("projects")
        .select("title")
        .eq("id", prospect.project_id)
        .maybeSingle();
      if (p?.title) projectTitle = p.title;
    }

    const row = (label: string, value: any) =>
      value
        ? `<tr><td style="padding:6px 12px;color:#64748b;font-size:13px;white-space:nowrap;">${label}</td><td style="padding:6px 12px;color:#0f172a;font-size:14px;font-weight:600;">${escape(String(value))}</td></tr>`
        : "";

    const types = Array.isArray(prospect.engagement_type) ? prospect.engagement_type.join(", ") : "";

    const adminInner = `
      <p style="margin:0 0 12px;font-size:15px;">Nouvelle <strong>manifestation d'intérêt investisseur</strong> reçue sur la plateforme MIPROJET.</p>
      <div style="background:#f0fdf4;border-left:4px solid #15803d;padding:14px 16px;border-radius:0 10px 10px 0;margin:18px 0;">
        <p style="margin:0;font-size:13px;color:#15803d;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Projet concerné</p>
        <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:#0c2340;">${escape(projectTitle)}</p>
      </div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        ${row("Nom", prospect.full_name)}
        ${row("Email", prospect.email)}
        ${row("Téléphone", prospect.phone)}
        ${row("Pays", prospect.country)}
        ${row("Capacité", prospect.investment_capacity)}
        ${row("Type d'engagement", types)}
        ${row("Retour attendu", prospect.expected_return_pct ? prospect.expected_return_pct + " %" : null)}
        ${row("Actionnariat", prospect.wants_equity ? `Oui (${prospect.equity_share_pct ?? "?"} %)` : "Non")}
        ${row("Horizon", prospect.time_horizon)}
      </table>
      ${prospect.message ? `<div style="margin-top:18px;"><p style="margin:0 0 6px;font-size:13px;color:#64748b;font-weight:600;">Message du candidat</p><div style="background:#f8fafc;border-radius:10px;padding:14px;font-size:14px;line-height:1.6;color:#1e293b;white-space:pre-wrap;">${escape(prospect.message)}</div></div>` : ""}
      <p style="margin:18px 0 0;font-size:13px;color:#64748b;">À traiter sous 48 h. Reply-To pré-rempli avec l'email du candidat.</p>
    `;

    const adminHtml = brandedEmailShell({
      innerHtml: adminInner,
      title: `Nouvel intérêt : ${projectTitle}`,
      preheader: `${prospect.full_name} — ${prospect.email}`,
      ctaUrl: "https://ivoireprojet.com/admin/dashboard",
      ctaLabel: "Ouvrir dans l'admin",
      showGreeting: false,
    });

    const userInner = `
      <p style="margin:0 0 14px;font-size:15px;">Merci d'avoir manifesté votre intérêt pour le projet <strong>${escape(projectTitle)}</strong>.</p>
      <p style="margin:0 0 14px;font-size:15px;">Votre demande a bien été enregistrée. Notre équipe MIPROJET vous recontactera sous <strong>48 heures</strong> pour un premier échange de qualification.</p>
      <div style="background:#f0fdf4;border-left:4px solid #15803d;padding:14px 16px;border-radius:0 10px 10px 0;margin:18px 0;">
        <p style="margin:0;font-size:14px;color:#0c2340;">À l'issue de cet échange, et selon le profil de votre demande, l'<strong>Information Memorandum confidentiel</strong> du projet pourra vous être transmis.</p>
      </div>
      <p style="margin:0;font-size:14px;color:#475569;">Pour toute urgence : <a href="mailto:invest@ivoireprojet.com" style="color:#15803d;font-weight:600;">invest@ivoireprojet.com</a> · +225 07 07 16 79 21</p>
    `;
    const userHtml = brandedEmailShell({
      innerHtml: userInner,
      title: "Votre intérêt a bien été enregistré",
      preheader: `Confirmation — ${projectTitle}`,
      recipientName: prospect.full_name,
    });

    // 1) admin
    const adminRes = await sendMail({
      to: ADMIN_INBOX,
      subject: `🚀 Nouvel intérêt investisseur — ${projectTitle}`,
      html: adminHtml,
      kind: "investor_interest_admin",
      reply_to: prospect.email,
      bypassUnsubscribeCheck: true,
    });

    // 2) candidate
    const userRes = await sendMail({
      to: prospect.email,
      subject: `✅ Votre intérêt pour ${projectTitle} a bien été reçu`,
      html: userHtml,
      kind: "investor_interest_confirm",
      bypassUnsubscribeCheck: true,
    });

    return json({ ok: true, admin: adminRes, user: userRes });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function escape(s: string) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
