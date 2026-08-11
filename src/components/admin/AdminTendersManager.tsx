import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Archive, RotateCcw, Trash2, ExternalLink, Search, ClipboardList, Download, Play, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { countryNameFromCode, normalizeCountryCode } from "@/lib/countries";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminBulkBar, RowCheckbox, useBulkSelection, bulkIcons, AdminRoleBadge } from "@/components/admin/ui/AdminBulkBar";
import { CountryFlag } from "@/components/tenders/CountryFlag";

type Tender = any;
type Batch = any;

const WEST_AFRICA_COUNTRIES = [
  ["BJ", "Bénin"],
  ["BF", "Burkina Faso"],
  ["CV", "Cap-Vert"],
  ["CI", "Côte d'Ivoire"],
  ["GM", "Gambie"],
  ["GH", "Ghana"],
  ["GN", "Guinée"],
  ["GW", "Guinée-Bissau"],
  ["LR", "Libéria"],
  ["ML", "Mali"],
  ["MR", "Mauritanie"],
  ["NE", "Niger"],
  ["NG", "Nigéria"],
  ["SN", "Sénégal"],
  ["SL", "Sierra Leone"],
  ["TG", "Togo"],
] as const;

const WEST_AFRICA: ReadonlySet<string> = new Set(WEST_AFRICA_COUNTRIES.map(([code]) => code));

const detectSector = (t: string) => {
  const tl = t.toLowerCase();
  const map: [string, string[]][] = [
    ["Santé", ["health", "medic", "hospital", "clinic", "nursing", "pharma", "santé"]],
    ["Éducation", ["school", "training", "education", "university", "formation"]],
    ["Énergie", ["power", "energy", "electric", "solar", "hvac", "generator"]],
    ["Construction & BTP", ["construction", "build", "road", "runway", "renovation", "works", "rehabilitation"]],
    ["Agriculture", ["agro", "agric", "farm", "coffee", "livestock", "irrigation"]],
    ["TIC & Numérique", ["software", "website", "digital", "data", "monitoring"]],
    ["Transport", ["transport", "vehicle", "logistic", "fleet", "shipping"]],
    ["Environnement", ["water", "sanitation", "waste", "environment", "mosquito"]],
    ["Fournitures", ["supply", "procurement", "equipment", "furniture", "blinds"]],
  ];
  for (const [s, kws] of map) if (kws.some((k) => tl.includes(k))) return s;
  return "Autres";
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const splitCSVLine = (line: string) => {
  const counts = [",", ";", "\t"].map((d) => [d, (line.match(new RegExp(d === "\t" ? "\\t" : d, "g")) || []).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
};

const parseCSV = (text: string) => {
  const delimiter = splitCSVLine(text.split(/\r?\n/).find((l) => l.trim()) || ",");
  const lines: string[][] = [];
  let cur: string[] = [];
  let val = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { val += '"'; i++; }
      else if (c === '"') inQ = false;
      else val += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === delimiter) { cur.push(val); val = ""; }
      else if (c === "\n") { cur.push(val); lines.push(cur); cur = []; val = ""; }
      else if (c !== "\r") val += c;
    }
  }
  if (val || cur.length) { cur.push(val); lines.push(cur); }
  return lines.filter((r) => r.some((x) => x.trim()));
};

// Universal parser: CSV, TSV, TXT, XLSX, XLS, JSON, JSONL.
// Returns { header, rows } where rows are string[][] aligned to header.
const parseAnyFile = async (file: File): Promise<{ header: string[]; rows: string[][] }> => {
  const name = file.name.toLowerCase();
  const isExcel = /\.(xlsx|xls|xlsm|ods)$/.test(name);
  const isJson = /\.(json|jsonl|ndjson)$/.test(name);

  if (isExcel) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "", raw: false, blankrows: false });
    if (!aoa.length) return { header: [], rows: [] };
    const header = (aoa[0] as any[]).map((h) => String(h ?? "").trim().toLowerCase());
    const rows = aoa.slice(1).map((r) => (r as any[]).map((v) => (v == null ? "" : String(v))));
    return { header, rows };
  }

  const text = await file.text();

  if (isJson) {
    let arr: any[] = [];
    try {
      const trimmed = text.trim();
      if (trimmed.startsWith("[")) arr = JSON.parse(trimmed);
      else arr = trimmed.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
    } catch (e) {
      throw new Error("JSON invalide");
    }
    if (!arr.length) return { header: [], rows: [] };
    const header = Array.from(new Set(arr.flatMap((o) => Object.keys(o || {})))).map((k) => k.toLowerCase());
    const rows = arr.map((o) => header.map((k) => {
      const v = o?.[k] ?? o?.[k.toUpperCase()] ?? "";
      return v == null ? "" : String(v);
    }));
    return { header, rows };
  }

  // CSV/TSV/TXT — reuse CSV parser (delimiter auto-detected: , ; \t)
  const parsed = parseCSV(text);
  const header = parsed.shift()?.map((h) => h.trim().toLowerCase()) || [];
  return { header, rows: parsed };
};

const parseDeadline = (s: string) => {
  const raw = (s || "").trim();
  if (!raw) return null;
  const iso = new Date(raw.replace(" ", "T"));
  if (!Number.isNaN(+iso)) return iso.toISOString();
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?::|\s)?(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?$/);
  if (!m) return null;
  const [, a, b, yyyy, hh = "0", mi = "0", ss = "0"] = m;
  const first = Number(a);
  const second = Number(b);
  const dd = first > 12 ? a : b;
  const mm = first > 12 ? b : a;
  return new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${hh.padStart(2, "0")}:${mi.padStart(2, "0")}:${ss.padStart(2, "0")}Z`).toISOString();
};

const norm = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
// DB has UNIQUE(notice_title, notice_deadline) — dedup MUST match that exact pair.
const tenderKey = (title: string, deadline: string | null, _country: string) => `${norm(title)}|${deadline || ""}`;
const pick = (row: string[], headers: string[], names: string[], fallback: number) => {
  const idx = names.map((n) => headers.indexOf(n)).find((i) => i >= 0);
  return row[idx ?? fallback] || "";
};

const FIELD_DEFS = [
  { key: "notice_title", label: "Titre de l'avis", names: ["notice_title", "title", "titre", "objet"], fallback: 0, required: true },
  { key: "notice_deadline", label: "Date limite", names: ["notice_deadline", "deadline", "date limite", "date_limite"], fallback: 1, required: true },
  { key: "country_code", label: "Pays", names: ["country_code", "org_country", "country", "pays"], fallback: 2, required: true },
] as const;

const detectMapping = (header: string[]) =>
  FIELD_DEFS.map((f) => {
    const idx = f.names.map((n) => header.indexOf(n)).find((i) => i >= 0);
    const resolved = idx ?? f.fallback;
    return {
      key: f.key,
      label: f.label,
      required: f.required,
      column: header[resolved] ?? `colonne ${resolved + 1}`,
      index: resolved,
      matched: idx !== undefined,
    };
  });

const downloadCSV = (filename: string, rows: (string | number)[][]) => {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

type FailedRow = { line: number; reason: string; title: string; deadline: string; country: string };

export const AdminTendersManager = () => {
  const perms = useAdminPermissions();
  const [tab, setTab] = useState("import");
  const [active, setActive] = useState<Tender[]>([]);
  const [archived, setArchived] = useState<Tender[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [q, setQ] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<{ inserted: number; updated: number; skipped: number; total: number; unique: number; eligible: number; outside: number; invalid: number; duplicates: number } | null>(null);
  const [preview, setPreview] = useState<{ total: number; eligible: number; outside: number; invalid: number; duplicates: number; countries: Record<string, number> } | null>(null);
  const [mode, setMode] = useState<"skip" | "replace" | "wipe">("replace");
  const fileRef = useRef<HTMLInputElement>(null);
  // Prévisualisation avant import
  const parsedRef = useRef<{ header: string[]; rows: string[][] } | null>(null);
  const [staged, setStaged] = useState<{
    fileName: string;
    header: string[];
    mapping: ReturnType<typeof detectMapping>;
    sample: string[][];
    rowCount: number;
  } | null>(null);
  // Journal d'import
  const [failedRows, setFailedRows] = useState<FailedRow[]>([]);
  const [log, setLog] = useState<{ created: number; updated: number; skipped: number; errors: number; fileName: string; at: string } | null>(null);

  const reload = async () => {
    const [a, ar, b] = await Promise.all([
      (supabase as any).from("tenders").select("*").eq("status", "active").order("notice_deadline").limit(1000),
      (supabase as any).from("tenders").select("*").eq("status", "archived").order("updated_at", { ascending: false }).limit(500),
      (supabase as any).from("tender_import_batches").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setActive(a.data || []);
    setArchived(ar.data || []);
    setBatches(b.data || []);
  };
  useEffect(() => { reload(); }, []);

  const analyzeRows = (rows: string[][], header: string[]) => {
    const seen = new Set<string>();
    const countries: Record<string, number> = {};
    let eligible = 0, outside = 0, invalid = 0, duplicates = 0;
    for (const r of rows) {
      const title = pick(r, header, ["notice_title", "title", "titre", "objet"], 0);
      const deadline = pick(r, header, ["notice_deadline", "deadline", "date limite", "date_limite"], 1);
      const country = pick(r, header, ["country_code", "org_country", "country", "pays"], 2);
      const dl = parseDeadline((deadline || "").trim());
      const iso = normalizeCountryCode(country);
      if (!title || !dl || !iso) { invalid++; continue; }
      if (!WEST_AFRICA.has(iso)) { outside++; continue; }
      const key = tenderKey(title, dl, iso);
      if (seen.has(key)) { duplicates++; continue; }
      seen.add(key);
      countries[iso] = (countries[iso] || 0) + 1;
      eligible++;
    }
    return { total: rows.length, eligible, outside, invalid, duplicates, countries };
  };

  /** Étape 1 — analyse locale du fichier : 10 premières lignes + mapping des colonnes. */
  const handleFile = async (file: File) => {
    if (!file) return;
    setReport(null);
    setLog(null);
    setFailedRows([]);
    setStaged(null);
    setPreview(null);
    try {
      const { header, rows } = await parseAnyFile(file);
      if (!header || !header.length) throw new Error("Fichier vide ou format non reconnu");
      parsedRef.current = { header, rows };
      setPreview(analyzeRows(rows, header));
      setStaged({
        fileName: file.name,
        header,
        mapping: detectMapping(header),
        sample: rows.slice(0, 10),
        rowCount: rows.length,
      });
      setTab("import");
      toast({ title: "Fichier analysé", description: `${rows.length} ligne(s) détectée(s). Validez le mapping puis lancez l'import.` });
    } catch (e: any) {
      toast({ title: "Erreur de lecture", description: e.message, variant: "destructive" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /** Étape 2 — import réel, après validation de la prévisualisation. */
  const runImport = async () => {
    if (!parsedRef.current || !staged) return;
    if (!perms.canWrite) { toast({ title: "Droits insuffisants", variant: "destructive" }); return; }
    if (mode === "wipe" && !confirm("Vider TOUS les appels d'offres existants avant import ?")) return;
    setImporting(true);
    setProgress(0);
    setReport(null);
    setFailedRows([]);
    const fails: FailedRow[] = [];
    try {
      const { header, rows } = parsedRef.current;
      const file = { name: staged.fileName };
      const preflight = analyzeRows(rows, header);
      setPreview(preflight);

      const { data: batch } = await (supabase as any)
        .from("tender_import_batches")
        .insert({ filename: file.name, total_rows: rows.length, imported_rows: 0, duplicate_rows: 0 })
        .select()
        .single();

      if (mode === "wipe") {
        await (supabase as any).from("tenders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }

      // Import haute capacité (100 000+ lignes) : pas d'index préalable en mémoire,
      // on s'appuie sur la contrainte UNIQUE(notice_title, notice_deadline) via upsert.
      const fileSeen = new Set<string>();
      let processed = 0, skipped = 0, failed = 0, updated = 0;
      const CHUNK = 500;
      const ignoreDuplicates = mode === "skip";

      const buildRow = (title: string, dl: string, iso: string) => {
        const cn = countryNameFromCode(iso);
        const sector = detectSector(title);
        return {
          notice_title: title.trim(),
          notice_deadline: dl,
          country_code: iso,
          country_name: cn,
          sector,
          summary: `Appel d'offres publié au ${cn} dans le secteur ${sector}. Objet : ${title.slice(0, 140)}.`,
          title_en: title.trim(),
          summary_fr: `Appel d'offres publié au ${cn} dans le secteur ${sector}. Objet : ${title.slice(0, 140)}.`,
          slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 8)}`,
          status: "active",
        };
      };

      const flush = async (staged: any[]) => {
        if (!staged.length) return;
        const clean = staged.map(({ __line, ...rest }: any) => rest);
        // Compte créations vs mises à jour pour le journal
        try {
          const titles = clean.map((r) => r.notice_title);
          const { data: existing } = await (supabase as any)
            .from("tenders").select("notice_title,notice_deadline").in("notice_title", titles);
          const set = new Set((existing || []).map((e: any) => `${norm(e.notice_title)}|${e.notice_deadline}`));
          updated += clean.filter((r) => set.has(`${norm(r.notice_title)}|${r.notice_deadline}`)).length;
        } catch { /* comptage best-effort */ }
        const { error } = await (supabase as any)
          .from("tenders")
          .upsert(clean, { onConflict: "notice_title,notice_deadline", ignoreDuplicates });
        if (!error) { processed += clean.length; return; }
        console.error("[tenders import upsert chunk]", error);
        // Repli ligne par ligne : une ligne fautive ne bloque pas le lot
        for (const row of staged) {
          const { __line, ...payload } = row as any;
          const { error: e1 } = await (supabase as any)
            .from("tenders")
            .upsert(payload, { onConflict: "notice_title,notice_deadline", ignoreDuplicates });
          if (e1) {
            failed++;
            fails.push({ line: __line ?? 0, reason: e1.message || "erreur base de données", title: payload.notice_title, deadline: payload.notice_deadline, country: payload.country_code });
          } else processed++;
        }
      };


      let pending: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const title = pick(r, header, ["notice_title", "title", "titre", "objet"], 0);
        const deadline = pick(r, header, ["notice_deadline", "deadline", "date limite", "date_limite"], 1);
        const country = pick(r, header, ["country_code", "org_country", "country", "pays"], 2);
        const dl = parseDeadline((deadline || "").trim());
        const iso = dl ? normalizeCountryCode(country) : "";
        const push = (reason: string) => {
          skipped++;
          if (fails.length < 5000) fails.push({ line: i + 2, reason, title, deadline, country });
        };
        if (!title) push("titre manquant");
        else if (!dl) push("date limite invalide ou manquante");
        else if (!iso) push("pays non reconnu");
        else if (!WEST_AFRICA.has(iso)) push("hors Afrique de l'Ouest");
        else {
          const key = tenderKey(title, dl, iso);
          if (fileSeen.has(key)) push("doublon dans le fichier");
          else { fileSeen.add(key); pending.push({ ...buildRow(title, dl, iso), __line: i + 2 } as any); }
        }

        if (pending.length >= CHUNK) {
          await flush(pending);
          pending = [];
          setProgress(Math.min(99, Math.round(((i + 1) / rows.length) * 100)));
          // rend la main au navigateur pour garder l'UI fluide sur 100k+ lignes
          await new Promise((res) => setTimeout(res, 0));
        }
      }
      await flush(pending);
      setProgress(100);

      await (supabase as any).from("tender_import_batches").update({
        imported_rows: processed,
        duplicate_rows: skipped + failed,
      }).eq("id", batch?.id);

      const created = Math.max(0, processed - updated);
      setReport({ inserted: created, updated, skipped: skipped + failed, total: rows.length, unique: fileSeen.size, eligible: preflight.eligible, outside: preflight.outside, invalid: preflight.invalid, duplicates: preflight.duplicates });
      setFailedRows(fails);
      setLog({ created, updated, skipped, errors: failed, fileName: staged.fileName, at: new Date().toISOString() });
      setStaged(null);
      parsedRef.current = null;
      setTab("log");
      toast({
        title: "Import terminé",
        description: `${created} créé(s) · ${updated} modifié(s) · ${skipped} ignoré(s)${failed ? ` · ${failed} en erreur` : ""}.`,
      });


      reload();
    } catch (e: any) {
      toast({ title: "Erreur d'import", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const downloadFailures = () =>
    downloadCSV(
      `import-echecs-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`,
      [["Ligne", "Motif", "Titre", "Date limite", "Pays"], ...failedRows.map((f) => [f.line, f.reason, f.title, f.deadline, f.country])],
    );

  const archiveOne = async (id: string) => {
    await (supabase as any).from("tenders").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
    reload();
  };
  const restoreOne = async (id: string) => {
    await (supabase as any).from("tenders").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", id);
    reload();
  };
  const deleteOne = async (id: string) => {
    if (!confirm("Supprimer définitivement cet appel d'offre ?")) return;
    await (supabase as any).from("tenders").delete().eq("id", id);
    reload();
  };

  const filter = (list: Tender[]) =>
    q ? list.filter((t) => t.notice_title.toLowerCase().includes(q.toLowerCase())) : list;

  const activeRows = filter(active).slice(0, 200);
  const archivedRows = archived.slice(0, 200);
  const selActive = useBulkSelection(activeRows);
  const selArchived = useBulkSelection(archivedRows);

  const bulkUpdateStatus = async (ids: string[], status: "active" | "archived", clear: () => void) => {
    const { error } = await (supabase as any)
      .from("tenders").update({ status, updated_at: new Date().toISOString() }).in("id", ids);
    if (error) toast({ title: "Échec de l'action groupée", description: error.message, variant: "destructive" });
    else toast({ title: status === "archived" ? "Appels d'offres archivés" : "Appels d'offres restaurés", description: `${ids.length} élément(s) mis à jour.` });
    clear();
    reload();
  };
  const bulkDelete = async (ids: string[], clear: () => void) => {
    const { error } = await (supabase as any).from("tenders").delete().in("id", ids);
    if (error) toast({ title: "Échec de la suppression", description: error.message, variant: "destructive" });
    else toast({ title: "Suppression effectuée", description: `${ids.length} élément(s) supprimé(s).` });
    clear();
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Appels d'offres</h1>
          <p className="text-muted-foreground">Import universel, prévisualisation du mapping, journal d'import et gestion des offres.</p>
        </div>
        <AdminRoleBadge />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="import"><Upload className="h-4 w-4 mr-1.5" /> Import CSV</TabsTrigger>
          <TabsTrigger value="active">Actives ({active.length})</TabsTrigger>
          <TabsTrigger value="archived"><Archive className="h-4 w-4 mr-1.5" /> Archives ({archived.length})</TabsTrigger>
          <TabsTrigger value="log"><ClipboardList className="h-4 w-4 mr-1.5" /> Journal d'import</TabsTrigger>
          <TabsTrigger value="history">Historique imports</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="pt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Importer un CSV</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("skip")}
                  className={`text-left rounded-lg border p-3 transition ${mode === "skip" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <p className="font-semibold text-sm">Ignorer les doublons</p>
                  <p className="text-xs text-muted-foreground">N'ajoute que les nouveaux (titre + date + pays).</p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("replace")}
                  className={`text-left rounded-lg border p-3 transition ${mode === "replace" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <p className="font-semibold text-sm">Mettre à jour les existants</p>
                  <p className="text-xs text-muted-foreground">Réécrit les doublons avec les nouvelles infos (recommandé).</p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("wipe")}
                  className={`text-left rounded-lg border p-3 transition ${mode === "wipe" ? "border-destructive bg-destructive/5" : "border-border hover:border-destructive/50"}`}
                >
                  <p className="font-semibold text-sm text-destructive">Vider puis réimporter</p>
                  <p className="text-xs text-muted-foreground">Supprime tous les appels d'offres existants avant d'importer.</p>
                </button>
              </div>

              <div
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary transition"
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">Glissez-déposez votre fichier ici</p>
                <p className="text-sm text-muted-foreground">CSV, TSV, TXT, Excel (.xlsx/.xls), JSON, JSONL — jusqu'à 100 000+ lignes. Seule l'Afrique de l'Ouest est retenue.</p>
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods,.json,.jsonl,.ndjson" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
              <Card className="bg-muted/35">
                <CardContent className="p-4 space-y-3">
                  <p className="font-semibold text-sm">Pays acceptés</p>
                  <div className="flex flex-wrap gap-2">
                    {WEST_AFRICA_COUNTRIES.map(([code, name]) => (
                      <Badge key={code} variant="secondary" className="gap-1.5">
                        <CountryFlag code={code} size={13} /> {name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {staged && (
                <Card className="border-primary/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex flex-wrap items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" /> Prévisualisation — {staged.fileName}
                      <Badge variant="secondary">{staged.rowCount} lignes</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-2">Mapping des colonnes détecté</p>
                      <div className="grid sm:grid-cols-3 gap-2">
                        {staged.mapping.map((m) => (
                          <div key={m.key} className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">{m.label}</p>
                            <p className="font-semibold text-sm truncate">{m.column}</p>
                            <Badge variant={m.matched ? "secondary" : "outline"} className="mt-1 text-[10px]">
                              {m.matched ? "en-tête reconnu" : `position ${m.index + 1} (par défaut)`}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold mb-2">10 premières lignes</p>
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">#</TableHead>
                              {staged.header.map((h, i) => (
                                <TableHead key={i} className="whitespace-nowrap">{h || `col ${i + 1}`}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {staged.sample.map((r, ri) => (
                              <TableRow key={ri}>
                                <TableCell className="text-xs text-muted-foreground">{ri + 2}</TableCell>
                                {staged.header.map((_, ci) => (
                                  <TableCell key={ci} className="text-xs max-w-[240px] truncate">{r[ci] || "—"}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={runImport} disabled={importing || !perms.canWrite}>
                        <Play className="h-4 w-4 mr-2" /> Lancer l'import ({preview?.eligible ?? 0} éligibles)
                      </Button>
                      <Button variant="outline" onClick={() => { setStaged(null); setPreview(null); parsedRef.current = null; }}>
                        <X className="h-4 w-4 mr-2" /> Annuler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {preview && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <p className="font-semibold mb-1">Résumé avant import</p>
                    <p className="text-sm">🎯 {preview.eligible} éligibles · 🌍 {preview.outside} hors zone · ⚠️ {preview.invalid} invalides · ♻️ {preview.duplicates} doublons fichier · 📦 {preview.total} lignes</p>
                  </CardContent>
                </Card>
              )}
              {importing && (
                <div>
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground mt-2">Traitement en cours… {progress}%</p>
                </div>
              )}
              {report && (
                <Card className="bg-muted/40">
                  <CardContent className="p-4">
                    <p className="font-semibold mb-1">Rapport d'import</p>
                    <p className="text-sm">✅ {report.inserted} ajoutés · 🔄 {report.updated} mis à jour · 🎯 {report.eligible} éligibles · ⏭️ {report.skipped} ignorés · 🌍 {report.outside} hors zone · ⚠️ {report.invalid} invalides · ♻️ {report.duplicates} doublons fichier · 📦 {report.total} lignes traitées</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>

          </Card>
        </TabsContent>

        <TabsContent value="active" className="pt-4 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
          </div>
          <AdminBulkBar
            count={selActive.count}
            ids={selActive.selectedIds}
            onClear={selActive.clear}
            entityLabel="appel d'offre"
            actions={[
              { key: "archive", label: "Archiver", icon: bulkIcons.unpublish, capability: "publish", confirm: "Archiver {n} appel(s) d'offres ?", run: (ids) => bulkUpdateStatus(ids, "archived", selActive.clear) },
              { key: "delete", label: "Supprimer", icon: bulkIcons.delete, capability: "delete", destructive: true, confirm: "Supprimer définitivement {n} appel(s) d'offres ?", run: (ids) => bulkDelete(ids, selActive.clear) },
            ]}
          />
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><RowCheckbox checked={selActive.allSelected} onChange={selActive.toggleAll} /></TableHead>
                    <TableHead>Titre</TableHead><TableHead>Pays</TableHead><TableHead>Secteur</TableHead><TableHead>Deadline</TableHead><TableHead>Vues</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeRows.map((t) => (
                    <TableRow key={t.id} data-state={selActive.isSelected(t.id) ? "selected" : undefined}>
                      <TableCell><RowCheckbox checked={selActive.isSelected(t.id)} onChange={() => selActive.toggle(t.id)} /></TableCell>
                      <TableCell className="max-w-md truncate">{t.notice_title}</TableCell>
                      <TableCell><span className="inline-flex items-center gap-2"><CountryFlag code={t.country_code || t.country} size={14} />{t.country_name || t.country_code || t.country}</span></TableCell>
                      <TableCell><Badge variant="secondary">{t.sector || "—"}</Badge></TableCell>
                      <TableCell className="text-xs">{format(new Date(t.notice_deadline), "dd MMM yy", { locale: fr })}</TableCell>
                      <TableCell>{t.views_count || t.view_count || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" asChild><a href={`/appels-doffres/${t.slug || t.id}`} target="_blank" rel="noopener"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                          {perms.canPublish && <Button size="sm" variant="ghost" onClick={() => archiveOne(t.id)}><Archive className="h-3.5 w-3.5" /></Button>}
                          {perms.canDelete && <Button size="sm" variant="ghost" onClick={() => deleteOne(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived" className="pt-4 space-y-3">
          <AdminBulkBar
            count={selArchived.count}
            ids={selArchived.selectedIds}
            onClear={selArchived.clear}
            entityLabel="archive"
            actions={[
              { key: "restore", label: "Restaurer", icon: bulkIcons.publish, capability: "publish", confirm: "Restaurer {n} appel(s) d'offres ?", run: (ids) => bulkUpdateStatus(ids, "active", selArchived.clear) },
              { key: "delete", label: "Supprimer", icon: bulkIcons.delete, capability: "delete", destructive: true, confirm: "Supprimer définitivement {n} archive(s) ?", run: (ids) => bulkDelete(ids, selArchived.clear) },
            ]}
          />
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><RowCheckbox checked={selArchived.allSelected} onChange={selArchived.toggleAll} /></TableHead>
                    <TableHead>Titre</TableHead><TableHead>Pays</TableHead><TableHead>Archivé le</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedRows.map((t) => (
                    <TableRow key={t.id} data-state={selArchived.isSelected(t.id) ? "selected" : undefined}>
                      <TableCell><RowCheckbox checked={selArchived.isSelected(t.id)} onChange={() => selArchived.toggle(t.id)} /></TableCell>
                      <TableCell className="max-w-md truncate">{t.notice_title}</TableCell>
                      <TableCell><span className="inline-flex items-center gap-2"><CountryFlag code={t.country_code || t.country} size={14} />{t.country_name || t.country_code || t.country}</span></TableCell>
                      <TableCell className="text-xs">{t.updated_at ? format(new Date(t.updated_at), "dd MMM yy", { locale: fr }) : "—"}</TableCell>
                      <TableCell>
                        {perms.canPublish && <Button size="sm" variant="ghost" onClick={() => restoreOne(t.id)}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurer</Button>}
                        {perms.canDelete && <Button size="sm" variant="ghost" onClick={() => deleteOne(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="pt-4 space-y-4">
          {!log ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Aucun import réalisé dans cette session.</CardContent></Card>
          ) : (
            <>
              <div className="grid sm:grid-cols-4 gap-3">
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Créés</p><p className="text-2xl font-bold text-success">{log.created}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Modifiés</p><p className="text-2xl font-bold">{log.updated}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Ignorés</p><p className="text-2xl font-bold">{log.skipped}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Erreurs</p><p className="text-2xl font-bold text-destructive">{log.errors}</p></CardContent></Card>
              </div>
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">
                    {log.fileName} · {format(new Date(log.at), "dd MMM yyyy HH:mm", { locale: fr })}
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={downloadFailures} disabled={!failedRows.length}>
                    <Download className="h-4 w-4 mr-2" /> Rapport CSV des échecs ({failedRows.length})
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Ligne</TableHead><TableHead>Motif</TableHead><TableHead>Titre</TableHead><TableHead>Date limite</TableHead><TableHead>Pays</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedRows.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune ligne en échec 🎉</TableCell></TableRow>
                      ) : failedRows.slice(0, 300).map((f, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{f.line}</TableCell>
                          <TableCell><Badge variant="outline">{f.reason}</Badge></TableCell>
                          <TableCell className="max-w-sm truncate text-sm">{f.title || "—"}</TableCell>
                          <TableCell className="text-xs">{f.deadline || "—"}</TableCell>
                          <TableCell className="text-xs">{f.country || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Date</TableHead><TableHead>Fichier</TableHead><TableHead>Total</TableHead><TableHead>Ajoutés</TableHead><TableHead>Doublons</TableHead><TableHead>Statut</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs">{format(new Date(b.created_at), "dd MMM yy HH:mm", { locale: fr })}</TableCell>
                      <TableCell className="truncate max-w-xs">{b.filename}</TableCell>
                      <TableCell>{b.total_rows}</TableCell>
                      <TableCell className="text-emerald-600 font-semibold">{b.imported_rows || 0}</TableCell>
                      <TableCell className="text-muted-foreground">{b.duplicate_rows || 0}</TableCell>
                      <TableCell><Badge variant="default">terminé</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
