import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminModuleShell, AdminEmptyState, AdminSearchField } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, RefreshCcw, Trash2, CheckCircle2 } from "lucide-react";
import { logAudit } from "@/lib/adminAudit";

/**
 * Données étendues MiPROJET+ issues des dernières migrations :
 * parties prenantes, équipe projet, recommandations, gouvernance,
 * produits d'entité, plans utilisateurs et usage vocal.
 */

type Dataset = {
  id: string;
  label: string;
  table: string;
  select: string;
  columns: { key: string; label: string; render?: (r: any) => any }[];
  searchKeys: string[];
  deletable?: boolean;
  extraAction?: (r: any) => { label: string; run: () => Promise<void> } | null;
};

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("fr-FR") : "—");

export const AdminMPPlusData = () => {
  const { toast } = useToast();
  const { canWrite, canDelete } = useAdminPermissions();
  const [tab, setTab] = useState("stakeholders");
  const [rows, setRows] = useState<Record<string, any[]>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const projectTitle = (id?: string | null) => (id ? titles[id] || id.slice(0, 8) : "—");

  const DATASETS: Dataset[] = useMemo(
    () => [
      {
        id: "stakeholders",
        label: "Parties prenantes",
        table: "mp_project_stakeholders",
        select: "*",
        searchKeys: ["name", "organization", "role", "email"],
        deletable: true,
        columns: [
          { key: "name", label: "Nom" },
          { key: "stakeholder_type", label: "Type" },
          { key: "role", label: "Rôle" },
          { key: "organization", label: "Organisation" },
          { key: "capital_share", label: "Part capital", render: (r) => (r.capital_share ? `${r.capital_share} %` : "—") },
          { key: "project_id", label: "Projet", render: (r) => projectTitle(r.project_id) },
        ],
      },
      {
        id: "team",
        label: "Équipe projet",
        table: "mp_project_team",
        select: "*",
        searchKeys: ["full_name", "role_title", "expertise", "organization"],
        deletable: true,
        columns: [
          { key: "full_name", label: "Membre" },
          { key: "role_title", label: "Fonction" },
          { key: "expertise", label: "Expertise" },
          { key: "is_external", label: "Externe", render: (r) => (r.is_external ? "Oui" : "Non") },
          { key: "project_id", label: "Projet", render: (r) => projectTitle(r.project_id) },
        ],
      },
      {
        id: "recommendations",
        label: "Recommandations",
        table: "mp_recommendations",
        select: "*",
        searchKeys: ["title", "category", "status", "recommended_action"],
        deletable: true,
        columns: [
          { key: "title", label: "Recommandation" },
          { key: "category", label: "Catégorie" },
          { key: "severity", label: "Sévérité", render: (r) => <Badge variant={r.severity === "high" ? "destructive" : "secondary"}>{r.severity || "—"}</Badge> },
          { key: "status", label: "Statut" },
          { key: "project_id", label: "Projet", render: (r) => projectTitle(r.project_id) },
        ],
        extraAction: (r) =>
          r.status === "done"
            ? null
            : {
                label: "Marquer traitée",
                run: async () => {
                  const { error } = await (supabase as any)
                    .from("mp_recommendations")
                    .update({ status: "done", done_at: new Date().toISOString() })
                    .eq("id", r.id);
                  if (error) throw new Error(error.message);
                },
              },
      },
      {
        id: "governance",
        label: "Gouvernance",
        table: "entity_governance",
        select: "*",
        searchKeys: ["full_name", "role_title"],
        deletable: true,
        columns: [
          { key: "full_name", label: "Dirigeant" },
          { key: "role_title", label: "Fonction" },
          { key: "is_strategic", label: "Stratégique", render: (r) => (r.is_strategic ? "Oui" : "Non") },
          { key: "project_id", label: "Projet", render: (r) => projectTitle(r.project_id) },
          { key: "created_at", label: "Créé le", render: (r) => fmtDate(r.created_at) },
        ],
      },
      {
        id: "products",
        label: "Produits / services",
        table: "entity_products",
        select: "*",
        searchKeys: ["name", "market", "description"],
        deletable: true,
        columns: [
          { key: "name", label: "Produit" },
          { key: "market", label: "Marché" },
          { key: "revenue_share_pct", label: "Part CA", render: (r) => (r.revenue_share_pct ? `${r.revenue_share_pct} %` : "—") },
          { key: "project_id", label: "Projet", render: (r) => projectTitle(r.project_id) },
        ],
      },
      {
        id: "plans",
        label: "Plans utilisateurs",
        table: "mp_user_plans",
        select: "*",
        searchKeys: ["tier", "user_id"],
        columns: [
          { key: "user_id", label: "Utilisateur", render: (r) => String(r.user_id).slice(0, 8) },
          { key: "tier", label: "Palier", render: (r) => <Badge>{r.tier}</Badge> },
          { key: "started_at", label: "Début", render: (r) => fmtDate(r.started_at) },
          { key: "expires_at", label: "Expire", render: (r) => fmtDate(r.expires_at) },
        ],
      },
      {
        id: "voice",
        label: "Usage vocal",
        table: "mp_voice_usage",
        select: "*",
        searchKeys: ["year_month", "user_id"],
        columns: [
          { key: "user_id", label: "Utilisateur", render: (r) => String(r.user_id).slice(0, 8) },
          { key: "year_month", label: "Période" },
          { key: "count", label: "Requêtes" },
          { key: "updated_at", label: "Dernier usage", render: (r) => fmtDate(r.updated_at) },
        ],
      },
    ],
    [titles],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data: projects } = await (supabase as any).from("mp_projects").select("id,title").limit(2000);
    setTitles(Object.fromEntries((projects || []).map((p: any) => [p.id, p.title])));

    const next: Record<string, any[]> = {};
    for (const d of DATASETS) {
      const { data, error } = await (supabase as any).from(d.table).select(d.select).limit(1000);
      next[d.id] = error ? [] : data || [];
    }
    setRows(next);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (d: Dataset, r: any) => {
    if (!canDelete) return toast({ title: "Droits insuffisants", variant: "destructive" });
    if (!window.confirm("Supprimer définitivement cet enregistrement ?")) return;
    const { error } = await (supabase as any).from(d.table).delete().eq("id", r.id);
    if (error) return toast({ title: "Suppression impossible", description: error.message, variant: "destructive" });
    await logAudit({ module: `MiPROJET+ — ${d.label}`, action: "delete", entityTable: d.table, entityId: r.id, entityLabel: r.name || r.full_name || r.title || r.id });
    toast({ title: "Supprimé" });
    load();
  };

  const runExtra = async (d: Dataset, r: any) => {
    if (!canWrite) return toast({ title: "Droits insuffisants", variant: "destructive" });
    const act = d.extraAction?.(r);
    if (!act) return;
    try {
      await act.run();
      await logAudit({ module: `MiPROJET+ — ${d.label}`, action: "update", entityTable: d.table, entityId: r.id, entityLabel: r.title || r.id, details: { action: act.label } });
      toast({ title: act.label });
      load();
    } catch (e: any) {
      toast({ title: "Action impossible", description: e.message, variant: "destructive" });
    }
  };

  const filtered = (d: Dataset) => {
    const list = rows[d.id] || [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) => d.searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s)));
  };

  return (
    <AdminModuleShell
      title="Données étendues MiPROJET+"
      description="Parties prenantes, équipe, recommandations, gouvernance, produits, plans et usage vocal."
      icon={Database}
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      }
      toolbar={<AdminSearchField value={q} onChange={setQ} placeholder="Rechercher dans les données MiPROJET+…" />}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          {DATASETS.map((d) => (
            <TabsTrigger key={d.id} value={d.id} className="gap-2">
              {d.label}
              <Badge variant="secondary">{(rows[d.id] || []).length}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {DATASETS.map((d) => (
          <TabsContent key={d.id} value={d.id} className="mt-4">
            {filtered(d).length === 0 ? (
              <AdminEmptyState label={loading ? "Chargement…" : "Aucune donnée pour ce jeu."} />
            ) : (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {d.columns.map((c) => (
                          <TableHead key={c.key}>{c.label}</TableHead>
                        ))}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered(d).map((r) => (
                        <TableRow key={r.id || `${r.user_id}-${r.year_month || r.tier}`}>
                          {d.columns.map((c) => (
                            <TableCell key={c.key} className="max-w-[240px] truncate">
                              {c.render ? c.render(r) : (r[c.key] ?? "—")}
                            </TableCell>
                          ))}
                          <TableCell className="text-right space-x-2 whitespace-nowrap">
                            {d.extraAction?.(r) && (
                              <Button variant="outline" size="sm" onClick={() => runExtra(d, r)}>
                                <CheckCircle2 className="h-4 w-4 mr-1" /> {d.extraAction(r)!.label}
                              </Button>
                            )}
                            {d.deletable && (
                              <Button variant="ghost" size="sm" onClick={() => remove(d, r)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </AdminModuleShell>
  );
};
