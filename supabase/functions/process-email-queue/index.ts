// Drains public.email_queue. Called by pg_cron every 10 min (and can be invoked manually).
// Picks up to N pending rows scheduled for now-or-before, sends them via sendMail()
// (which auto-picks Brevo→Resend and increments daily counters). If no provider has
// capacity left, sendMail throws the queue back to pending status with a delayed
// scheduled_for to retry the next day.
import { sendMail, corsHeaders } from "../_shared/mailer.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BATCH_SIZE = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // pick batch
  const { data: rows, error } = await supabase
    .from("email_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) return json({ ok: false, error: error.message }, 500);
  if (!rows?.length) return json({ ok: true, processed: 0 });

  let sent = 0, failed = 0, requeued = 0;

  for (const r of rows) {
    await supabase.from("email_queue").update({ status: "processing", attempts: r.attempts + 1 }).eq("id", r.id);

    // Check provider capacity first — if both saturated, requeue for tomorrow
    const { data: provider } = await supabase.rpc("pick_email_provider");
    if (!provider) {
      const next = new Date();
      next.setUTCHours(next.getUTCHours() + 6); // retry in 6h
      await supabase.from("email_queue").update({
        status: "pending",
        scheduled_for: next.toISOString(),
        last_error: "quota_saturated",
      }).eq("id", r.id);
      requeued++;
      continue;
    }

    const result = await sendMail({
      to: r.to_email,
      subject: r.subject,
      html: r.html,
      text: r.text_content ?? undefined,
      kind: r.kind ?? "transactional",
      campaignId: r.campaign_id ?? undefined,
      recipientUserId: r.recipient_user_id ?? undefined,
      reply_to: r.reply_to ?? undefined,
      from: r.from_address ?? undefined,
      unsubscribeUrl: r.unsubscribe_url ?? undefined,
      bypassUnsubscribeCheck: r.bypass_unsubscribe_check ?? false,
    });

    if (result.ok) {
      await supabase.from("email_queue").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", r.id);
      sent++;
    } else if (r.attempts >= 5) {
      await supabase.from("email_queue").update({
        status: "failed",
        last_error: result.error?.slice(0, 500),
      }).eq("id", r.id);
      failed++;
    } else {
      const next = new Date(Date.now() + 60 * 60 * 1000); // retry in 1h
      await supabase.from("email_queue").update({
        status: "pending",
        scheduled_for: next.toISOString(),
        last_error: result.error?.slice(0, 500),
      }).eq("id", r.id);
      requeued++;
    }
  }

  return json({ ok: true, processed: rows.length, sent, failed, requeued });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
