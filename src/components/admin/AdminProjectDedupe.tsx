import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminModuleShell, AdminEmptyState } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { GitMerge, RefreshCcw, Trash2, ArrowRightLeft, Image as ImageIcon } from "lucide-react";
import { logAudit } from "@/lib/adminAudit";

/**
 * Workflow de déduplication des projets accompagnés (MiPROJET+ ↔ Invest) :
 * 1. choisir le projet maître,
 * 2. migrer les relations et les images du doublon vers le maître,
 * 3. supprimer définitivement le doublon partout.
 */

type Scope = "mp_projects" | "projects";

type Proj = Record<string, any> & { id: string; title: string };

type Group = { key: string; rows: Proj[] };

/** Tables enfants dont la colonne project_id doit être migrée vers le maître. */
const CHILD_TABLES: Record<Scope, string[]> = {
  mp_projects: [
    "mp_scoring_results", "mp_evaluations", "mp_certifications", "mp_documents",
    "mp_document_folders", "mp_project_media", "mp_project_team", "mp_project_milestones",
    "mp_project_stakeholders", "mp_recommendations", "mp_funder_connections",
    "mp_introductions", "mp_support_tickets", "mp_user_service_requests",
    "entity_governance", "entity_products",
  ],
  projects: [
    "project_evaluations", "project_team", "project_updates", "contributions",
    "service_requests", "invoices", "payments", "referrals",
  ],
};

/** Champs média/contenu recopiés sur le maître s'ils y sont absents. */
const MERGE_FIELDS: Record<Scope, string[]> = {
  mp_projects: [
    "logo_url", "cover_url", "short_pitch", "product_description", "description",
    "commercialization", "target_customers", "monitoring_evaluation", "sector",
    "city", "country", "governance", "governance_mode", "budget_initial", "objectif", "maturite",
  ],
  projects: [
    "cover_image_url", "gallery", "description", "summary", "sector", "city",
    "country", "slug", "video_url", "documents",
  ],
};

const norm = (s?: string | null) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const completeness = (r: Record<string, any>) =>
  Object.values(r).filter((v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)).length;

export const AdminProjectDedupe = () => {
  const { toast } = useToast();
  const { canDelete } = useAdminPermissions();
  const [scope, setScope] = useState<Scope>("mp_projects");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [master, setMaster] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from(scope).select("*").limit(3000);
    if (error) {
      toast({ title: "Chargement impossible", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const map: Record<string, Proj[]> = {};
    (data || []).forEach((r: Proj) => {
      const k = norm(r.title);
      if (!k) return;
      (map[k] = map[k] || []).push(r);
    });
    const g: Group[] = Object.entries(map)
      .filter(([, rows]) => rows.length > 1)
      .map(([key, rows]) => ({
        key,
        rows: [...rows].sort((a, b) => completeness(b) - completeness(a)),
      }));
    setGroups(g);
    setMaster(Object.fromEntries(g.map((x) => [x.key, x.rows[0].id])));
    setLoading(false);
  }, [scope, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(() => groups.reduce((n, g) => n + g.rows.length - 1, 0), [groups]);

  const runMerge = async (group: Group) => {
    if (!canDelete) {
      toast({ title: "Droits insuffisants", variant: "destructive" });
      return;
    }
    const masterId = master[group.key];
    const masterRow = group.rows.find((r) => r.id === masterId);
    const dups = group.rows.filter((r) => r.id !== masterId);
    if (!masterRow || !dups.length) return;
    if (!window.confirm(`Fusionner ${dups.length} doublon(s) dans « ${masterRow.title} » puis les supprimer définitivement ?`)) return;

    setBusy(group.key);
    const report: Record<string, number> = {};
    const errors: string[] = [];

    // 1) migration des relations
    for (const child of CHILD_TABLES[scope]) {
      for (const d of dups) {
        const { error, count } = await (supabase as any)
          .from(child)
          .update({ project_id: masterId }, { count: "exact" })
          .eq("project_id", d.id);
        if (error) {
          if (!/does not exist|schema cache|column/i.test(error.message)) errors.push(`${child}: ${error.message}`);
        } else if (count) {
          report[child] = (report[child] || 0) + count;
        }
      }
    }

    // 2) fusion des images / contenus manquants
    const patch: Record<string, any> = {};
    MERGE_FIELDS[scope].forEach((f) => {
      const current = masterRow[f];
      const empty = current === null || current === undefined || current === "" || (Array.isArray(current) && current.length === 0);
      if (!empty) return;
      const donor = dups.find((d) => {
        const v = d[f];
        return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
      });
      if (donor) patch[f] = donor[f];
    });
    if (Object.keys(patch).length) {
      const { error } = await (supabase as any).from(scope).update(patch).eq("id", masterId);
      if (error) errors.push(`fusion champs: ${error.message}`);
    }

    // 3) suppression définitive des doublons
    const { error: delErr } = await (supabase as any).from(scope).delete().in("id", dups.map((d) => d.id));
    if (delErr) errors.push(`suppression: ${delErr.message}`);

    // 4) signal de synchronisation vers les autres plateformes
    try {
      await (supabase as any).rpc("emit_sync_signal", {
        _type: "project.dedupe",
        _source_table: scope,
        _source_id: masterId,
        _actor: (await supabase.auth.getUser()).data.user?.id ?? null,
        _payload: { master: masterId, removed: dups.map((d) => d.id), migrated: report, merged_fields: Object.keys(patch) },
        _severity: "info",
      });
    } catch {
      /* signal optionnel */
    }

    await logAudit({
      module: "Déduplication projets",
      action: "delete",
      entityTable: scope,
      entityId: masterId,
      entityLabel: masterRow.title,
      details: { removed: dups.map((d) => ({ id: d.id, title: d.title })), migrated: report, merged_fields: Object.keys(patch) },
    });

    setBusy(null);
    toast({
      title: errors.length ? "Fusion terminée avec avertissements" : "Fusion terminée",
      description: [
        `${dups.length} doublon(s) supprimé(s)`,
        Object.keys(report).length ? `relations migrées : ${Object.entries(report).map(([k, v]) => `${k} (${v})`).join(", ")}` : null,
        Object.keys(patch).length ? `champs récupérés : ${Object.keys(patch).join(", ")}` : null,
        errors.length ? errors.slice(0, 2).join(" · ") : null,
      ].filter(Boolean).join(" — "),
      variant: errors.length ? "destructive" : "default",
    });
    load();
  };

  return (
    <AdminModuleShell
      title="Déduplication des projets accompagnés"
      description="Choisir le projet maître, migrer relations et images, supprimer définitivement le doublon partout."
      icon={GitMerge}
      actions={
        <>
          <Button variant={scope === "mp_projects" ? "default" : "outline"} size="sm" onClick={() => setScope("mp_projects")}>
            MiPROJET+
          </Button>
          <Button variant={scope === "projects" ? "default" : "outline"} size="sm" onClick={() => setScope("projects")}>
            Invest
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Analyser
          </Button>
        </>
      }
    >
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm">
          <Badge variant={total ? "destructive" : "secondary"}>{total} doublon(s) à traiter</Badge>
          <span className="text-muted-foreground">
            Relations migrées : {CHILD_TABLES[scope].length} tables enfants · Images et contenus manquants récupérés automatiquement.
          </span>
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <AdminEmptyState label={loading ? "Analyse en cours…" : "Aucun doublon détecté sur ce périmètre."} />
      ) : (
        groups.map((g) => (
          <Card key={g.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                {g.rows[0].title}
                <Badge variant="secondary">{g.rows.length} fiches</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={master[g.key]} onValueChange={(v) => setMaster((m) => ({ ...m, [g.key]: v }))} className="space-y-2">
                {g.rows.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value={r.id} id={r.id} className="mt-1" />
                    <Label htmlFor={r.id} className="flex-1 cursor-pointer space-y-1">
                      <span className="font-medium block">{r.title}</span>
                      <span className="text-xs text-muted-foreground block">
                        {r.id} · créé le {r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR") : "—"} ·
                        {" "}complétude {completeness(r)} champs · statut {r.status || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        {(r.cover_url || r.cover_image_url) ? "couverture présente" : "pas de couverture"}
                        {Array.isArray(r.gallery) && r.gallery.length ? ` · galerie ${r.gallery.length}` : ""}
                      </span>
                    </Label>
                    {master[g.key] === r.id && <Badge>Maître</Badge>}
                  </div>
                ))}
              </RadioGroup>
              <Button variant="destructive" size="sm" onClick={() => runMerge(g)} disabled={busy === g.key || !canDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                {busy === g.key ? "Fusion en cours…" : "Fusionner puis supprimer définitivement les doublons"}
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </AdminModuleShell>
  );
};
