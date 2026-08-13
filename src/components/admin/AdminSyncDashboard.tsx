import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminModuleShell, AdminEmptyState } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCcw, Activity, AlertTriangle, CheckCircle2, Clock, Play } from "lucide-react";
import { logAudit } from "@/lib/adminAudit";

type Signal = {
  id: string;
  signal_type: string;
  severity: string | null;
  source_table: string | null;
  status: string | null;
  payload: any;
  created_at: string;
  handled_at: string | null;
};

const MODULES = [
  { id: "go", label: "MiPROJET Go", prefix: "go.", replay: "go.sync.request", target: "miprojet-go" },
  { id: "plus", label: "MiPROJET+", prefix: "plus.", replay: "plus.sync.request", target: "miprojet-plus" },
  { id: "invest", label: "MiPROJET Invest", prefix: "invest.", replay: "invest.sync.request", target: "miprojet-invest" },
];

/** Tableau de bord de synchronisation : état, erreurs et historique par plateforme. */
export const AdminSyncDashboard = () => {
  const { toast } = useToast();
  const { canWrite } = useAdminPermissions();
  const [rows, setRows] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_sync_signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
    setRows((data as Signal[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(
    () =>
      MODULES.map((m) => {
        const list = rows.filter((r) => (r.signal_type || "").startsWith(m.prefix));
        const errors = list.filter((r) => ["error", "critical"].includes(r.severity || ""));
        const pending = list.filter((r) => (r.status || "pending") === "pending");
        const last = list[0];
        return {
          ...m,
          total: list.length,
          pending: pending.length,
          errors: errors.length,
          last,
          health: errors.length > 0 ? "error" : pending.length > 0 ? "pending" : "ok",
        };
      }),
    [rows],
  );

  const replay = async (m: (typeof MODULES)[number]) => {
    setBusy(m.id);
    const { error } = await supabase.rpc("emit_sync_signal", {
      _type: m.replay,
      _source_table: "admin_console",
      _source_id: null,
      _actor: null,
      _payload: { target: m.target, scope: "full", requested_at: new Date().toISOString() },
      _severity: "info",
    });
    setBusy(null);
    if (error) return toast({ title: "Échec de la relance", description: error.message, variant: "destructive" });
    await logAudit({ module: "Synchronisation", action: "sync", entityLabel: m.label, details: { signal: m.replay } });
    toast({ title: `Relance ${m.label}`, description: "Signal de resynchronisation émis." });
    load();
  };

  const errorHistory = useMemo(
    () => rows.filter((r) => ["error", "critical", "warning"].includes(r.severity || "")).slice(0, 50),
    [rows],
  );

  return (
    <AdminModuleShell
      title="Tableau de bord de synchronisation"
      description="État, erreurs et historique des signaux Go / MiPROJET+ / Invest."
      icon={Activity}
      actions={<Button variant="outline" size="sm" onClick={load}><RefreshCcw className="h-4 w-4 mr-2" />Rafraîchir</Button>}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.id} className="overflow-hidden">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{s.label}</CardTitle>
              {s.health === "error" ? <AlertTriangle className="h-4 w-4 text-destructive" />
                : s.health === "pending" ? <Clock className="h-4 w-4 text-muted-foreground" />
                : <CheckCircle2 className="h-4 w-4 text-primary" />}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{s.total} signaux</Badge>
                <Badge variant="secondary">{s.pending} en attente</Badge>
                {s.errors > 0 && <Badge variant="destructive">{s.errors} erreurs</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Dernier signal :{" "}
                {s.last ? `${s.last.signal_type} · ${new Date(s.last.created_at).toLocaleString("fr-FR")}` : "aucun"}
              </p>
              {canWrite && (
                <Button size="sm" variant="outline" className="w-full" disabled={busy === s.id} onClick={() => replay(s)}>
                  <Play className="h-4 w-4 mr-2" />
                  {busy === s.id ? "Relance…" : "Relancer la synchronisation"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Historique des anomalies</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <AdminEmptyState label="Chargement…" />
          ) : errorHistory.length === 0 ? (
            <AdminEmptyState label="Aucune erreur de synchronisation" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Type</TableHead><TableHead>Sévérité</TableHead>
                  <TableHead>Source</TableHead><TableHead>Statut</TableHead><TableHead>Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {errorHistory.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.signal_type}</TableCell>
                      <TableCell><Badge variant={r.severity === "warning" ? "secondary" : "destructive"}>{r.severity}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.source_table || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{r.status || "pending"}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminModuleShell>
  );
};
