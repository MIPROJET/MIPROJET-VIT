import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminModuleShell, AdminEmptyState } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, RefreshCcw, ShieldCheck, Trash2, Search } from "lucide-react";
import { logAudit } from "@/lib/adminAudit";

/**
 * Audit base de données : liste tous les comptes de démonstration et les doublons
 * encore présents, table par table, puis permet la suppression définitive.
 */

type AuditTable =
  | "profiles"
  | "projects"
  | "mp_projects"
  | "entities"
  | "leads"
  | "opportunities"
  | "newsletter_subscribers"
  | "investor_prospects"
  | "tender_subscribers";

type Row = {
  key: string;
  table: AuditTable;
  id: string;
  label: string;
  reason: string;
  kind: "demo" | "duplicate";
  keptLabel?: string;
};

const DEMO_PATTERNS = [
  "demo", "démo", "test", "essai", "example", "exemple", "fake", "sample", "simulation",
  "lorem", "dummy", "azerty", "qwerty", "asdf", "aaaa", "xxxx", "toto", "titi",
  "@test.", "@example.", "@demo.", "@mailinator.", "@yopmail.", "@sharklasers.",
];

const norm = (s?: string | null) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const demoReason = (...values: (string | null | undefined)[]) => {
  const hay = values.filter(Boolean).join(" ").toLowerCase();
  return DEMO_PATTERNS.find((p) => hay.includes(p)) || null;
};

const completeness = (r: Record<string, any>) =>
  Object.values(r).filter((v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)).length;

const TABLES: { table: AuditTable; label: string; select: string; labelOf: (r: any) => string; dupKey: (r: any) => string }[] = [
  { table: "profiles", label: "Comptes (profiles)", select: "*", labelOf: (r) => r.email || r.full_name || r.id, dupKey: (r) => norm(r.email) },
  { table: "projects", label: "Projets Invest", select: "*", labelOf: (r) => r.title || r.id, dupKey: (r) => norm(r.title) },
  { table: "mp_projects", label: "Projets MiPROJET+", select: "*", labelOf: (r) => r.title || r.id, dupKey: (r) => norm(r.title) },
  { table: "entities", label: "Entités / entreprises", select: "*", labelOf: (r) => r.name || r.id, dupKey: (r) => norm(r.name) },
  { table: "leads", label: "Leads", select: "*", labelOf: (r) => r.email || r.full_name || r.id, dupKey: (r) => norm(r.email) },
  { table: "opportunities", label: "Opportunités", select: "*", labelOf: (r) => r.title || r.id, dupKey: (r) => norm(r.title) },
  { table: "newsletter_subscribers", label: "Abonnés newsletter", select: "*", labelOf: (r) => r.email || r.id, dupKey: (r) => norm(r.email) },
  { table: "investor_prospects", label: "Prospects investisseurs", select: "*", labelOf: (r) => r.email || r.full_name || r.id, dupKey: (r) => norm(r.email) },
  { table: "tender_subscribers", label: "Abonnés appels d'offres", select: "*", labelOf: (r) => r.email || r.id, dupKey: (r) => norm(r.email) },
];

export const AdminDataAudit = () => {
  const { toast } = useToast();
  const { canDelete } = useAdminPermissions();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [scanned, setScanned] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    const found: Row[] = [];
    for (const t of TABLES) {
      const { data, error } = await (supabase as any).from(t.table).select(t.select).limit(5000);
      if (error || !data) continue;

      // 1) données de démonstration
      data.forEach((r: any) => {
        const reason = demoReason(r.email, r.full_name, r.title, r.name, r.description, r.company_name);
        if (reason) {
          found.push({
            key: `${t.table}:${r.id}`,
            table: t.table,
            id: r.id,
            label: t.labelOf(r),
            reason: `Motif « ${reason} »`,
            kind: "demo",
          });
        }
      });

      // 2) doublons (on conserve l'enregistrement le plus complet)
      const groups: Record<string, any[]> = {};
      data.forEach((r: any) => {
        const k = t.dupKey(r);
        if (!k) return;
        (groups[k] = groups[k] || []).push(r);
      });
      Object.values(groups).forEach((g) => {
        if (g.length < 2) return;
        const sorted = [...g].sort(
          (a, b) => completeness(b) - completeness(a) || Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0),
        );
        const kept = sorted[0];
        sorted.slice(1).forEach((r) => {
          const key = `${t.table}:${r.id}`;
          if (found.some((f) => f.key === key)) return;
          found.push({
            key,
            table: t.table,
            id: r.id,
            label: t.labelOf(r),
            reason: "Doublon",
            kind: "duplicate",
            keptLabel: t.labelOf(kept),
          });
        });
      });
    }
    setRows(found);
    setSelected(Object.fromEntries(found.map((f) => [f.key, true])));
    setScanned(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.label} ${r.reason} ${r.table}`.toLowerCase().includes(s));
  }, [rows, q]);

  const selectedRows = useMemo(() => rows.filter((r) => selected[r.key]), [rows, selected]);

  const byTable = useMemo(() => {
    const m: Record<string, { demo: number; duplicate: number }> = {};
    rows.forEach((r) => {
      m[r.table] = m[r.table] || { demo: 0, duplicate: 0 };
      m[r.table][r.kind] += 1;
    });
    return m;
  }, [rows]);

  const purge = async () => {
    if (!canDelete) {
      toast({ title: "Droits insuffisants", variant: "destructive" });
      return;
    }
    if (!selectedRows.length) return;
    if (!window.confirm(`Supprimer définitivement ${selectedRows.length} enregistrement(s) ? Cette action est irréversible.`)) return;

    setBusy(true);
    let ok = 0;
    const failures: string[] = [];
    const groups = selectedRows.reduce<Record<string, string[]>>((acc, r) => {
      (acc[r.table] = acc[r.table] || []).push(r.id);
      return acc;
    }, {});

    for (const [table, ids] of Object.entries(groups)) {
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { error } = await (supabase as any).from(table).delete().in("id", chunk);
        if (error) failures.push(`${table}: ${error.message}`);
        else ok += chunk.length;
      }
    }

    await logAudit({
      module: "Audit base de données",
      action: "delete",
      details: { deleted: ok, tables: Object.keys(groups), failures },
    });

    setBusy(false);
    toast({
      title: `${ok} enregistrement(s) supprimé(s) définitivement`,
      description: failures.length ? failures.slice(0, 3).join(" · ") : "Base assainie.",
      variant: failures.length ? "destructive" : "default",
    });
    scan();
  };

  return (
    <AdminModuleShell
      title="Audit base de données"
      description="Comptes de démonstration et doublons encore présents — suppression définitive."
      icon={ShieldCheck}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={scan} disabled={loading || busy}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Relancer l'audit
          </Button>
          <Button variant="destructive" size="sm" onClick={purge} disabled={busy || !selectedRows.length}>
            <Trash2 className="h-4 w-4 mr-2" /> Supprimer définitivement ({selectedRows.length})
          </Button>
        </>
      }
      toolbar={
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un enregistrement…"
            className="w-full h-10 pl-10 pr-3 rounded-md border bg-background text-sm"
          />
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TABLES.map((t) => {
          const s = byTable[t.table] || { demo: 0, duplicate: 0 };
          const clean = s.demo + s.duplicate === 0;
          return (
            <Card key={t.table} className={clean ? "" : "border-destructive/40"}>
              <CardContent className="p-4 space-y-1">
                <p className="text-sm font-medium truncate">{t.label}</p>
                {clean ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Aucune anomalie
                  </p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {s.demo > 0 && <Badge variant="destructive">{s.demo} démo</Badge>}
                    {s.duplicate > 0 && <Badge variant="secondary">{s.duplicate} doublon(s)</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState label={scanned ? "Base propre : aucun compte démo ni doublon détecté." : "Audit en cours…"} />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Enregistrement</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Détail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>
                      <Checkbox
                        checked={!!selected[r.key]}
                        onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.key]: !!v }))}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[280px] truncate">{r.label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.table}</TableCell>
                    <TableCell>
                      <Badge variant={r.kind === "demo" ? "destructive" : "secondary"}>
                        {r.kind === "demo" ? "Démo" : "Doublon"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.reason}
                      {r.keptLabel && ` — conservé : ${r.keptLabel}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!canDelete && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Votre rôle ne permet pas la suppression définitive.
        </p>
      )}
    </AdminModuleShell>
  );
};
