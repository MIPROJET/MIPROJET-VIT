import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminModuleShell, AdminEmptyState } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, RefreshCcw, Trash2, ShieldCheck } from "lucide-react";

type Candidate = {
  key: string;
  table: "profiles" | "mp_projects" | "projects" | "leads" | "opportunities";
  id: string;
  label: string;
  reason: string;
};

const DEMO_PATTERNS = ["demo", "démo", "test", "essai", "example", "exemple", "fake", "sample", "simulation", "lorem"];

const looksDemo = (...values: (string | null | undefined)[]) => {
  const hay = values.filter(Boolean).join(" ").toLowerCase();
  return DEMO_PATTERNS.find((p) => hay.includes(p)) || null;
};

/**
 * Détecte et supprime les comptes / données de démonstration ou de simulation
 * sur les trois plateformes (Go, MiPROJET+, Invest) pour un passage en production propre.
 */
export const AdminDataCleanup = () => {
  const { toast } = useToast();
  const { canDelete } = useAdminPermissions();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    const found: Candidate[] = [];

    const [profiles, mpProjects, projects, leads, opportunities] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name").limit(2000),
      supabase.from("mp_projects").select("id, title, description").limit(2000),
      supabase.from("projects").select("id, title, description, status").limit(2000),
      supabase.from("leads").select("id, email, full_name").limit(2000),
      supabase.from("opportunities").select("id, title, description").limit(2000),
    ]);

    (profiles.data || []).forEach((r: any) => {
      const hit = looksDemo(r.email, r.full_name);
      if (hit) found.push({ key: `profiles:${r.id}`, table: "profiles", id: r.id, label: r.email || r.full_name || r.id, reason: `mot-clé « ${hit} »` });
    });
    (mpProjects.data || []).forEach((r: any) => {
      const hit = looksDemo(r.title, r.description);
      if (hit) found.push({ key: `mp_projects:${r.id}`, table: "mp_projects", id: r.id, label: r.title, reason: `mot-clé « ${hit} »` });
    });
    (leads.data || []).forEach((r: any) => {
      const hit = looksDemo(r.email, r.full_name);
      if (hit) found.push({ key: `leads:${r.id}`, table: "leads", id: r.id, label: r.email || r.id, reason: `mot-clé « ${hit} »` });
    });
    (opportunities.data || []).forEach((r: any) => {
      const hit = looksDemo(r.title, r.description);
      if (hit) found.push({ key: `opportunities:${r.id}`, table: "opportunities", id: r.id, label: r.title, reason: `mot-clé « ${hit} »` });
    });

    // Doublons de brouillons Invest (imports de test répétés) : on garde le plus récent.
    const byTitle: Record<string, any[]> = {};
    (projects.data || []).forEach((r: any) => {
      const hit = looksDemo(r.title, r.description);
      if (hit) {
        found.push({ key: `projects:${r.id}`, table: "projects", id: r.id, label: r.title, reason: `mot-clé « ${hit} »` });
        return;
      }
      if (r.status === "draft") {
        const k = (r.title || "").trim().toLowerCase();
        byTitle[k] = byTitle[k] || [];
        byTitle[k].push(r);
      }
    });
    Object.values(byTitle).forEach((group) => {
      if (group.length > 1) {
        group.slice(1).forEach((r) => {
          found.push({ key: `projects:${r.id}`, table: "projects", id: r.id, label: r.title, reason: `doublon brouillon (${group.length} copies)` });
        });
      }
    });

    setCandidates(found);
    setSelected(Object.fromEntries(found.map((c) => [c.key, true])));
    setLoading(false);
  }, []);

  useEffect(() => { scan(); }, [scan]);

  const purge = async () => {
    const toDelete = candidates.filter((c) => selected[c.key]);
    if (toDelete.length === 0) return;
    if (!window.confirm(`Supprimer définitivement ${toDelete.length} enregistrement(s) de démonstration ?`)) return;
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
    setWorking(false);
    toast({
      title: `${ok} enregistrement(s) supprimé(s)`,
      description: errors.length ? errors.slice(0, 3).join(" · ") : "Base nettoyée pour la production.",
      variant: errors.length ? "destructive" : undefined,
    });
    scan();
  };

  const selectedCount = candidates.filter((c) => selected[c.key]).length;

  return (
    <AdminModuleShell
      title="Nettoyage production"
      description="Comptes démo, données de simulation et doublons détectés sur Go, MiPROJET+ et Invest."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={scan} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />Relancer l'analyse
          </Button>
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={purge} disabled={working || selectedCount === 0}>
              <Trash2 className="h-4 w-4 mr-2" />Purger ({selectedCount})
            </Button>
          )}
        </>
      }
    >
      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          {candidates.length === 0 ? (
            <>
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm">Aucune donnée de démonstration détectée : la base est en état de production.</p>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <p className="text-sm">
                {candidates.length} enregistrement(s) suspects. Vérifie la sélection avant de purger — la suppression est définitive.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {loading ? <AdminEmptyState label="Analyse en cours…" /> : candidates.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Élément</TableHead><TableHead>Table</TableHead><TableHead>Motif</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {candidates.map((c) => (
                <TableRow key={c.key}>
                  <TableCell>
                    <Checkbox
                      checked={!!selected[c.key]}
                      onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [c.key]: !!v }))}
                    />
                  </TableCell>
                  <TableCell className="font-medium max-w-[340px] truncate">{c.label || c.id}</TableCell>
                  <TableCell><Badge variant="outline">{c.table}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminModuleShell>
  );
};
