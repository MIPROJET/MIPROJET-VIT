import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auth",
};

const COUNTRY_NAMES: Record<string, string> = {
  KE: "Kenya", TN: "Tunisie", RW: "Rwanda", ZW: "Zimbabwe", TZ: "Tanzanie",
  ZA: "Afrique du Sud", CM: "Cameroun", MA: "Maroc", ET: "Éthiopie",
  MG: "Madagascar", GA: "Gabon", BJ: "Bénin", BF: "Burkina Faso",
  CI: "Côte d'Ivoire", SN: "Sénégal", TG: "Togo", NE: "Niger", ML: "Mali",
  CD: "RD Congo", CG: "Congo", NG: "Nigeria", GH: "Ghana", UG: "Ouganda",
  ZM: "Zambie", MZ: "Mozambique", AO: "Angola", NA: "Namibie", BW: "Botswana",
  MW: "Malawi", SZ: "Eswatini", LS: "Lesotho", DJ: "Djibouti", ER: "Érythrée",
  SO: "Somalie", SS: "Soudan du Sud", SD: "Soudan", EG: "Égypte", LY: "Libye",
  DZ: "Algérie", MR: "Mauritanie", GM: "Gambie", GN: "Guinée",
  GW: "Guinée-Bissau", SL: "Sierra Leone", LR: "Libéria", CV: "Cap-Vert",
  ST: "Sao Tomé", GQ: "Guinée équatoriale", CF: "Centrafrique", TD: "Tchad",
  BI: "Burundi", KM: "Comores", MU: "Maurice", SC: "Seychelles",
  RE: "Réunion", YT: "Mayotte",
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

function parseDeadline(s: string): string | null {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, mo, d, y, H, M, S] = m;
  return `${y}-${mo}-${d}T${H}:${M}:${S}+00:00`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("x-auth") || "";
  if (auth !== Deno.env.get("LOVABLE_API_KEY")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const csv: string = body?.csv || "";
  const truncate: boolean = !!body?.truncate;
  if (!csv) {
    return new Response(JSON.stringify({ error: "missing csv" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Filtre Afrique de l'Ouest (CEDEAO + Mauritanie + Cap-Vert)
  const WEST_AFRICA = new Set(["BJ","BF","CI","GH","GN","GW","LR","ML","NE","NG","SN","SL","TG","CV","GM","MR"]);

  const rows = parseCSV(csv);
  const records: any[] = [];
  let skipped = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 3) continue;
    const title = (r[0] || "").trim();
    if (!title) continue;
    const deadline = parseDeadline(r[1] || "");
    const cc = (r[2] || "").trim().toUpperCase();
    if (!WEST_AFRICA.has(cc)) { skipped++; continue; }
    records.push({
      notice_title: title,
      notice_deadline: deadline,
      country_code: cc,
      country_name: COUNTRY_NAMES[cc] || cc,
      status: "published",
    });
  }

  if (truncate) {
    await supabase.from("tenders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  let inserted = 0;
  const batchSize = 200;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("tenders").insert(batch);
    if (error) {
      return new Response(JSON.stringify({ inserted, error: error.message, at: i }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    inserted += batch.length;
  }

  return new Response(JSON.stringify({ inserted, total: records.length, skipped_non_west_africa: skipped }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
