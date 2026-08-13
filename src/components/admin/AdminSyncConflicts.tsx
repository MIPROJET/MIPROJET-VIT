import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminModuleShell, AdminSearchField, AdminEmptyState } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RefreshCcw, GitMerge, ShieldQuestion } from "lucide-react";
import { logAudit } from "@/lib/adminAudit";

type Strategy = "last_writer" | "source_priority" | "merge";

const STRATEGY_LABELS: Record<Strategy, string> = {
  last_writer: "Dernier auteur (le plus récent gagne)",
  source_priority: "Priorité source (la plateforme source gagne)",
  merge: "Fusion (champ par champ, valeurs non vides conservées)",
};

type Conflict = {
  id: string;
  entity_table: string;
  entity_id: string | null;
  entity_label: string | null;
  source_platform: string | null;
  target_platform: string | null;
  source_payload: any;
  target_payload: any;
  source_updated_at: string | null;
  target_updated_at: string | null;
  status: string | null;
  resolution_strategy: string | null;
  resolved_payload: any;
  created_at: string;
};

/** Fusion : on part de la cible et on complète avec les valeurs non vides de la source. */
const mergePayloads = (target: any, source: any) => {
  const out: Record<string, any> = { ...(target || {}) };
  Object.entries(source || {}).forEach(([k, v]) => {
    const empty = out[k] === null || out[k] === undefined || out[k] === "";
    if (empty && v !== null && v !== undefined && v !== "") out[k] = v;
  });
  return out;
};

export const resolvePayload = (c: Conflict, strategy: Strategy) => {
  if (strategy === "source_priority") return { ...(c.target_payload || {}), ...(c.source_payload || {}) };
  if (strategy === "merge") return mergePayloads(c.target_payload, c.source_payload);
  const sT = c.source_updated_at ? Date.parse(c.source_updated_at) : 0;
  const tT = c.target_updated_at ? Date.parse(c.target_updated_at) : 0;
  return sT >= tT
    ? { ...(c.target_payload || {}), ...(c.source_payload || {}) }
    : { ...(c.source_payload || {}), ...(c.target_payload || {}) };
};

/** Résolution des conflits de synchronisation Go / MiPROJET+ / Invest. */
export const AdminSyncConflicts = () => {
  const { toast } = useToast();
  const { canWrite } = useAdminPermissions();
  const [rows, setRows] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [defaultStrategy, setDefaultStrategy] = useState<Strategy>("last_writer");
  const [current, setCurrent] = useState<Conflict | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("last_writer");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("platform_sync_conflicts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) { setMissing(true); setRows([]); }
    else { setMissing(false); setRows((data as Conflict[]) || []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && (r.status || "pending") !== statusFilter) return false;
      if (!s) return true;
      return [r.entity_table, r.entity_label, r.source_platform, r.target_platform]
        .join(" ").toLowerCase().includes(s);
    });
  }, [rows, q, statusFilter]);

  const pendingCount = rows.filter((r) => (r.status || "pending") === "pending").length;

  const apply = async (c: Conflict, strat: Strategy) => {
    const resolved = resolvePayload(c, strat);
    const { error: upErr } = await (supabase as any)
      .from(c.entity_table)
      .update(resolved)
      .eq("id", c.entity_id);
    if (upErr) return toast({ title: "Échec de l'application", description: upErr.message, variant: "destructive" });

    const { error } = await (supabase as any)
      .from("platform_sync_conflicts")
      .update({
        status: "resolved",
        resolution_strategy: strat,
        resolved_payload: resolved,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", c.id);
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });

    setRows((prev) => prev.map((r) => (r.id === c.id ? { ...r, status: "resolved", resolution_strategy: strat } : r)));
    await supabase.rpc("emit_sync_signal", {
      _type: "sync.conflict.resolved", _source_table: c.entity_table, _source_id: c.entity_id,
      _actor: null, _payload: { strategy: strat, conflict_id: c.id }, _severity: "info",
    });
    await logAudit({
      module: "Synchronisation", action: "resolve_conflict", entityTable: c.entity_table,
      entityId: c.entity_id, entityLabel: c.entity_label, details: { strategy: strat },
    });
    setCurrent(null);
    toast({ title: "Conflit résolu", description: STRATEGY_LABELS[strat] });
  };

  const resolveAllPending = async () => {
    const pending = rows.filter((r) => (r.status || "pending") === "pending");
    for (const c of pending) await apply(c, defaultStrategy);
    toast({ title: `${pending.length} conflit(s) traité(s)` });
    load();
  };

  const ignore = async (c: Conflict) => {
    const { error } = await (supabase as any)
      .from("platform_sync_conflicts")
      .update({ status: "ignored", resolved_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    setRows((prev) => prev.map((r) => (r.id === c.id ? { ...r, status: "ignored" } : r)));
  };

  return (
    <AdminModuleShell
      title="Conflits de synchronisation"
      description="Traitez les divergences entre Go, MiPROJET+ et Invest."
      icon={GitMerge}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="h-4 w-4 mr-2" />Rafraîchir</Button>
          {canWrite && (
            <Button size="sm" onClick={resolveAllPending} disabled={pendingCount === 0}>
              <GitMerge className="h-4 w-4 mr-2" />Traiter les {pendingCount} en attente
            </Button>
          )}
        </>
      }
      toolbar={
        <>
          <AdminSearchField value={q} onChange={setQ} placeholder="Table, entité, plateforme…" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="resolved">Résolus</SelectItem>
              <SelectItem value="ignored">Ignorés</SelectItem>
            </SelectContent>
          </Select>
          <Select value={defaultStrategy} onValueChange={(v) => setDefaultStrategy(v as Strategy)}>
            <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STRATEGY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {(["pending", "resolved", "ignored"] as const).map((s) => (
          <Card key={s}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s}</p>
            <p className="text-2xl font-bold">{rows.filter((r) => (r.status || "pending") === s).length}</p>
          </CardContent></Card>
        ))}
      </div>

      {missing ? (
        <AdminEmptyState label="Table platform_sync_conflicts absente — exécutez le SQL du plan pour activer la détection." />
      ) : loading ? (
        <AdminEmptyState label="Chargement…" />
      ) : filtered.length === 0 ? (
        <AdminEmptyState label="Aucun conflit" />
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Entité</TableHead><TableHead>Source → Cible</TableHead>
              <TableHead>Statut</TableHead><TableHead>Détecté</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[280px]">
                    <span className="block truncate font-medium">{r.entity_label || r.entity_id}</span>
                    <span className="block text-xs text-muted-foreground">{r.entity_table}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(r.source_platform || "?")} → {(r.target_platform || "?")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={(r.status || "pending") === "pending" ? "secondary" : "outline"}>
                      {r.status || "pending"}
                      {r.resolution_strategy ? ` · ${r.resolution_strategy}` : ""}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => { setCurrent(r); setStrategy((r.resolution_strategy as Strategy) || defaultStrategy); }}>
                      <ShieldQuestion className="h-4 w-4 mr-1" />Examiner
                    </Button>
                    {canWrite && (r.status || "pending") === "pending" && (
                      <Button variant="ghost" size="sm" onClick={() => ignore(r)}>Ignorer</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!current} onOpenChange={(o) => !o && setCurrent(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Conflit · {current?.entity_label || current?.entity_id}</DialogTitle></DialogHeader>
          {current && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>Stratégie de résolution</Label>
                <Select value={strategy} onValueChange={(v) => setStrategy(v as Strategy)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STRATEGY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Source ({current.source_platform || "?"}) · {current.source_updated_at?.slice(0, 19) || "—"}</Label>
                  <Textarea readOnly rows={8} className="font-mono text-xs" value={JSON.stringify(current.source_payload, null, 2)} />
                </div>
                <div>
                  <Label className="text-xs">Cible ({current.target_platform || "?"}) · {current.target_updated_at?.slice(0, 19) || "—"}</Label>
                  <Textarea readOnly rows={8} className="font-mono text-xs" value={JSON.stringify(current.target_payload, null, 2)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Aperçu du résultat appliqué</Label>
                <Textarea readOnly rows={8} className="font-mono text-xs bg-muted/40"
                  value={JSON.stringify(resolvePayload(current, strategy), null, 2)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurrent(null)}>Fermer</Button>
            {canWrite && <Button onClick={() => current && apply(current, strategy)}>Appliquer la résolution</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminModuleShell>
  );
};
