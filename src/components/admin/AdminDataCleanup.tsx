import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminModuleShell, AdminEmptyState } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, RefreshCcw, Trash2, ShieldCheck, Copy } from "lucide-react";
import { logAuditBulk } from "@/lib/adminAudit";

type CleanTable = "profiles" | "mp_projects" | "projects" | "leads" | "opportunities" | "entities" | "newsletter_subscribers";

type Candidate = {
  key: string;
  table: CleanTable;
  id: string;
  label: string;
  reason: string;
  kind: "demo" | "duplicate";
  /** Enregistrement conservé lorsqu'il s'agit d'un doublon. */
  keptLabel?: string;
};

const DEMO_PATTERNS = [
  "demo", "démo", "test", "essai", "example", "exemple", "fake", "sample",
  "simulation", "lorem", "dummy", "azerty", "qwerty", "asdf", "aaaa", "xxxx",
  "@test.", "@example.", "@demo.", "@mailinator.", "@yopmail.",
];

const looksDemo = (...values: (string | null | undefined)[]) => {
  const hay = values.filter(Boolean).join(" ").toLowerCase();
  return DEMO_PATTERNS.find((p) => hay.includes(p)) || null;
};

const normKey = (s?: string | null) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Score de complétude : on conserve toujours l'enregistrement le plus riche. */
const completeness = (r: Record<string, any>) =>
  Object.values(r).filter((v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)).length;

/** Regroupe par clé et renvoie les doublons à supprimer (tous sauf le plus complet). */
const dedupe = <T extends Record<string, any>>(
  rows: T[],
  keyOf: (r: T) => string,
  labelOf: (r: T) => string,
  table: CleanTable,
): Candidate[] => {
  const groups: Record<string, T[]> = {};
  rows.forEach((r) => {
    const k = keyOf(r);
    if (!k) return;
    groups[k] = groups[k] || [];
    groups[k].push(r);
  });
  const out: Candidate[] = [];
  Object.values(groups).forEach((group) => {
    if (group.length < 2) return;
    const sorted = [...group].sort(
      (a, b) => completeness(b) - completeness(a) || Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0),
    );
    const kept = sorted[0];
    sorted.slice(1).forEach((r) =>
      out.push({
        key: `${table}:${r.id}`,
        table,
        id: r.id,
        label: labelOf(r) || r.id,
        reason: `doublon (${group.length} exemplaires)`,
        kind: "duplicate",
        keptLabel: labelOf(kept) || kept.id,
      }),
    );
  });
  return out;
};

/**
 * Détecte et supprime définitivement les comptes / données de démonstration
 * et les doublons inutiles sur les trois plateformes (Go, MiPROJET+, Invest).
 */
export const AdminDataCleanup = () => {
  const { toast } = useToast();
  const { canDelete } = useAdminPermissions();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | "demo" | "duplicate">("all");

  const scan = useCallback(async () => {
    setLoading(true);
    const found: Candidate[] = [];

    const [profiles, mpProjects, projects, leads, opportunities, entities, subs] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, first_name, created_at").limit(5000),
      supabase.from("mp_projects").select("id, title, description, user_id, cover_url, created_at").limit(5000),
      supabase.from("projects").select("id, title, description, status, owner_id, cover_url, logo_url, slug, created_at").limit(5000),
      supabase.from("leads").select("id, email, full_name, created_at").limit(5000),
      supabase.from("opportunities").select("id, title, description, created_at").limit(5000),
      supabase.from("entities").select("id, name, created_at").limit(5000),
      supabase.from("newsletter_subscribers").select("id, email, created_at").limit(5000),
    ]);

    /* ---- 1. Données de démonstration / simulation ---- */
    (profiles.data || []).forEach((r: any) => {
      const hit = looksDemo(r.email, r.full_name, r.first_name);
      if (hit) found.push({ key: `profiles:${r.id}`, table: "profiles", id: r.id, label: r.email || r.full_name || r.id, reason: `mot-clé « ${hit} »`, kind: "demo" });
    });
    (mpProjects.data || []).forEach((r: any) => {
      const hit = looksDemo(r.title, r.description);
      if (hit) found.push({ key: `mp_projects:${r.id}`, table: "mp_projects", id: r.id, label: r.title, reason: `mot-clé « ${hit} »`, kind: "demo" });
    });
    (projects.data || []).forEach((r: any) => {
      const hit = looksDemo(r.title, r.description);
      if (hit) found.push({ key: `projects:${r.id}`, table: "projects", id: r.id, label: r.title, reason: `mot-clé « ${hit} »`, kind: "demo" });
    });
    (leads.data || []).forEach((r: any) => {
      const hit = looksDemo(r.email, r.full_name);
      if (hit) found.push({ key: `leads:${r.id}`, table: "leads", id: r.id, label: r.email || r.id, reason: `mot-clé « ${hit} »`, kind: "demo" });
    });
    (opportunities.data || []).forEach((r: any) => {
      const hit = looksDemo(r.title, r.description);
      if (hit) found.push({ key: `opportunities:${r.id}`, table: "opportunities", id: r.id, label: r.title, reason: `mot-clé « ${hit} »`, kind: "demo" });
    });
    (entities.data || []).forEach((r: any) => {
      const hit = looksDemo(r.name);
      if (hit) found.push({ key: `entities:${r.id}`, table: "entities", id: r.id, label: r.name, reason: `mot-clé « ${hit} »`, kind: "demo" });
    });

    const demoKeys = new Set(found.map((c) => c.key));

    /* ---- 2. Doublons inutiles ---- */
    const dups = [
      ...dedupe(projects.data || [], (r: any) => `${normKey(r.title)}|${r.owner_id || ""}`, (r: any) => r.title, "projects"),
      ...dedupe(mpProjects.data || [], (r: any) => `${normKey(r.title)}|${r.user_id || ""}`, (r: any) => r.title, "mp_projects"),
      ...dedupe(entities.data || [], (r: any) => normKey(r.name), (r: any) => r.name, "entities"),
      ...dedupe(leads.data || [], (r: any) => normKey(r.email), (r: any) => r.email, "leads"),
      ...dedupe(opportunities.data || [], (r: any) => normKey(r.title), (r: any) => r.title, "opportunities"),
      ...dedupe(subs.data || [], (r: any) => normKey(r.email), (r: any) => r.email, "newsletter_subscribers"),
    ].filter((c) => !demoKeys.has(c.key));

    const all = [...found, ...dups];
    setCandidates(all);
    setSelected(Object.fromEntries(all.map((c) => [c.key, true])));
    setLoading(false);
  }, []);

  useEffect(() => { scan(); }, [scan]);

  const visible = useMemo(
    () => candidates.filter((c) => kindFilter === "all" || c.kind === kindFilter),
    [candidates, kindFilter],
  );

  const purge = async () => {
    const toDelete = visible.filter((c) => selected[c.key]);
    if (toDelete.length === 0) return;
    if (!window.confirm(`Supprimer DÉFINITIVEMENT ${toDelete.length} enregistrement(s) (démo et doublons) ?`)) return;
    setWorking(true);
    const byTable = toDelete.reduce<Record<string, string[]>>((acc, c) => {
      acc[c.table] = acc[c.table] || [];
      acc[c.table].push(c.id);
      return acc;
    }, {});
    let ok = 0;
    const errors: string[] = [];
    for (const [table, ids] of Object.entries(byTable)) {
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { error } = await supabase.from(table as any).delete().in("id", chunk);
        if (error) errors.push(`${table}: ${error.message}`);
        else ok += chunk.length;
      }
    }
    await logAuditBulk(
      { module: "Nettoyage production", action: "delete" },
      toDelete.map((c) => ({ id: c.id, label: `${c.table} · ${c.label}` })),
    );
    setWorking(false);
    toast({
      title: `${ok} enregistrement(s) supprimé(s)`,
      description: errors.length ? errors.slice(0, 3).join(" · ") : "Base nettoyée pour la production.",
      variant: errors.length ? "destructive" : undefined,
    });
    scan();
  };

  const selectedCount = visible.filter((c) => selected[c.key]).length;
  const demoCount = candidates.filter((c) => c.kind === "demo").length;
  const dupCount = candidates.filter((c) => c.kind === "duplicate").length;

  return (
    <AdminModuleShell
      title="Nettoyage production"
      description="Comptes démo, données de simulation et doublons sur Go, MiPROJET+ et Invest."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={scan} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />Relancer l'analyse
          </Button>
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={purge} disabled={working || selectedCount === 0}>
              <Trash2 className="h-4 w-4 mr-2" />Supprimer définitivement ({selectedCount})
            </Button>
          )}
        </>
      }
      toolbar={
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout ({candidates.length})</SelectItem>
            <SelectItem value="demo">Démo / simulation ({demoCount})</SelectItem>
            <SelectItem value="duplicate">Doublons ({dupCount})</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          {candidates.length === 0 ? (
            <>
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm">Aucune donnée de démonstration ni doublon détecté : la base est en état de production.</p>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <p className="text-sm">
                {demoCount} enregistrement(s) de démo et {dupCount} doublon(s). Pour chaque doublon, l'exemplaire le plus
                complet est conservé — la suppression des autres est définitive.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {loading ? <AdminEmptyState label="Analyse en cours…" /> : visible.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Élément</TableHead><TableHead>Table</TableHead>
              <TableHead>Type</TableHead><TableHead>Motif</TableHead><TableHead>Conservé</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {visible.map((c) => (
                <TableRow key={c.key}>
                  <TableCell>
                    <Checkbox
                      checked={!!selected[c.key]}
                      onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [c.key]: !!v }))}
                    />
                  </TableCell>
                  <TableCell className="font-medium max-w-[320px] truncate">{c.label || c.id}</TableCell>
                  <TableCell><Badge variant="outline">{c.table}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={c.kind === "demo" ? "destructive" : "secondary"} className="gap-1">
                      {c.kind === "duplicate" && <Copy className="h-3 w-3" />}
                      {c.kind === "demo" ? "Démo" : "Doublon"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.reason}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{c.keptLabel || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminModuleShell>
  );
};
