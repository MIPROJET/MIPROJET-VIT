import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminModuleShell } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plug, RefreshCcw, CheckCircle2, AlertTriangle, Play } from "lucide-react";
import { logAudit } from "@/lib/adminAudit";

/**
 * Assistant de reconnexion & resynchronisation complète MiPROJET Go.
 * Récupère les données Go existantes, réémet les signaux et reconstruit
 * les liaisons côté admin, MiPROJET+ et Invest.
 */

type Step = {
  id: string;
  label: string;
  detail: string;
  status: "idle" | "running" | "done" | "error";
  count?: number;
  message?: string;
};

const INITIAL: Step[] = [
  { id: "inventory", label: "1. Inventaire des données Go", detail: "produits, opérations, comptes Go", status: "idle" },
  { id: "orphans", label: "2. Détection des enregistrements orphelins", detail: "opérations sans produit / sans compte", status: "idle" },
  { id: "relink", label: "3. Reconnexion des relations", detail: "rattachement produit ↔ opération ↔ profil", status: "idle" },
  { id: "signals", label: "4. Réémission des signaux Go", detail: "go.sync.request + go.produit.sync", status: "idle" },
  { id: "propagate", label: "5. Propagation vers MiPROJET+ / Invest", detail: "signaux inter-plateformes", status: "idle" },
  { id: "verify", label: "6. Vérification finale", detail: "file de signaux et anomalies", status: "idle" },
];

export const AdminGoReconnect = () => {
  const { toast } = useToast();
  const { canWrite } = useAdminPermissions();
  const [steps, setSteps] = useState<Step[]>(INITIAL);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<{ produits: number; operations: number; goUsers: number; signals: number; pending: number }>({
    produits: 0, operations: 0, goUsers: 0, signals: 0, pending: 0,
  });

  const patch = (id: string, p: Partial<Step>) =>
    setSteps((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const refreshStats = useCallback(async () => {
    const q = async (table: string, filter?: (b: any) => any) => {
      let b = (supabase as any).from(table).select("id", { count: "exact", head: true });
      if (filter) b = filter(b);
      const { count } = await b;
      return count || 0;
    };
    setStats({
      produits: await q("produits"),
      operations: await q("operations"),
      goUsers: await q("profiles", (b: any) => b.eq("user_type", "entrepreneur")),
      signals: await q("platform_sync_signals", (b: any) => b.like("signal_type", "go.%")),
      pending: await q("platform_sync_signals", (b: any) => b.eq("status", "pending")),
    });
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const emit = async (type: string, sourceTable: string, sourceId: string | null, payload: Record<string, unknown>, severity = "info") => {
    const actor = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { error } = await (supabase as any).rpc("emit_sync_signal", {
      _type: type,
      _source_table: sourceTable,
      _source_id: sourceId,
      _actor: actor,
      _payload: payload,
      _severity: severity,
    });
    if (error) throw new Error(error.message);
  };

  const run = async () => {
    if (!canWrite) {
      toast({ title: "Droits insuffisants", variant: "destructive" });
      return;
    }
    setRunning(true);
    setSteps(INITIAL.map((s) => ({ ...s, status: "idle" })));

    try {
      // 1) inventaire
      patch("inventory", { status: "running" });
      const [{ data: produits }, { data: operations }, { data: goUsers }] = await Promise.all([
        (supabase as any).from("produits").select("*").limit(5000),
        (supabase as any).from("operations").select("*").limit(5000),
        (supabase as any).from("profiles").select("id,user_id,email,user_type").limit(5000),
      ]);
      patch("inventory", {
        status: "done",
        count: (produits?.length || 0) + (operations?.length || 0),
        message: `${produits?.length || 0} produits · ${operations?.length || 0} opérations · ${goUsers?.length || 0} comptes`,
      });

      // 2) orphelins
      patch("orphans", { status: "running" });
      const productIds = new Set((produits || []).map((p: any) => p.id));
      const userIds = new Set((goUsers || []).map((p: any) => p.user_id));
      const orphanOps = (operations || []).filter(
        (o: any) => (o.produit_id && !productIds.has(o.produit_id)) || (o.user_id && !userIds.has(o.user_id)),
      );
      patch("orphans", { status: "done", count: orphanOps.length, message: `${orphanOps.length} opération(s) orpheline(s)` });

      // 3) reconnexion
      patch("relink", { status: "running" });
      let relinked = 0;
      for (const o of orphanOps) {
        const p = (produits || []).find((x: any) => x.user_id === o.user_id && x.nom && o.description && o.description.toLowerCase().includes(String(x.nom).toLowerCase()));
        const upd: Record<string, any> = {};
        if (o.produit_id && !productIds.has(o.produit_id)) upd.produit_id = p ? p.id : null;
        if (Object.keys(upd).length) {
          const { error } = await (supabase as any).from("operations").update(upd).eq("id", o.id);
          if (!error) relinked += 1;
        }
      }
      patch("relink", { status: "done", count: relinked, message: `${relinked} relation(s) reconstruite(s)` });

      // 4) signaux Go
      patch("signals", { status: "running" });
      await emit("go.sync.request", "produits", null, {
        scope: "full",
        produits: produits?.length || 0,
        operations: operations?.length || 0,
        requested_from: "admin.go.reconnect",
      });
      for (const p of (produits || []).slice(0, 200)) {
        await emit("go.produit.sync", "produits", p.id, { nom: p.nom, prix_unitaire: p.prix_unitaire, actif: p.actif });
      }
      patch("signals", { status: "done", count: Math.min(produits?.length || 0, 200) + 1, message: "Signaux Go réémis" });

      // 5) propagation
      patch("propagate", { status: "running" });
      await emit("plus.sync.request", "mp_projects", null, { scope: "full", origin: "go.reconnect" });
      await emit("invest.sync.request", "projects", null, { scope: "full", origin: "go.reconnect" });
      patch("propagate", { status: "done", count: 2, message: "MiPROJET+ et Invest notifiés" });

      // 6) vérification
      patch("verify", { status: "running" });
      const { count: pending } = await (supabase as any)
        .from("platform_sync_signals").select("id", { count: "exact", head: true }).eq("status", "pending");
      const { count: failed } = await (supabase as any)
        .from("platform_sync_signals").select("id", { count: "exact", head: true }).eq("status", "error");
      patch("verify", {
        status: (failed || 0) > 0 ? "error" : "done",
        message: `${pending || 0} signal(aux) en attente · ${failed || 0} en échec`,
      });

      await logAudit({
        module: "MiPROJET Go — reconnexion",
        action: "sync",
        entityTable: "produits",
        details: { produits: produits?.length || 0, operations: operations?.length || 0, relinked, orphans: orphanOps.length },
      });

      toast({ title: "Resynchronisation Go terminée", description: `${relinked} relation(s) reconstruite(s), signaux réémis.` });
    } catch (e: any) {
      setSteps((s) => s.map((x) => (x.status === "running" ? { ...x, status: "error", message: e.message } : x)));
      toast({ title: "Échec de la resynchronisation", description: e.message, variant: "destructive" });
    }

    await refreshStats();
    setRunning(false);
  };

  const done = steps.filter((s) => s.status === "done").length;

  return (
    <AdminModuleShell
      title="Assistant de reconnexion MiPROJET Go"
      description="Récupérer les données Go, reconstruire les relations et resynchroniser toutes les plateformes."
      icon={Plug}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={refreshStats} disabled={running}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} /> Actualiser
          </Button>
          <Button size="sm" onClick={run} disabled={running || !canWrite}>
            <Play className="h-4 w-4 mr-2" /> {running ? "Exécution…" : "Lancer la resynchronisation complète"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { l: "Produits Go", v: stats.produits },
          { l: "Opérations Go", v: stats.operations },
          { l: "Comptes entrepreneurs", v: stats.goUsers },
          { l: "Signaux Go", v: stats.signals },
          { l: "Signaux en attente", v: stats.pending },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{k.v}</p>
              <p className="text-xs text-muted-foreground">{k.l}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Étapes de l'assistant</CardTitle>
          <Progress value={(done / steps.length) * 100} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étape</TableHead>
                <TableHead>Portée</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Résultat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.detail}</TableCell>
                  <TableCell>
                    {s.status === "done" && <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Terminé</Badge>}
                    {s.status === "running" && <Badge className="gap-1"><RefreshCcw className="h-3 w-3 animate-spin" /> En cours</Badge>}
                    {s.status === "error" && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Erreur</Badge>}
                    {s.status === "idle" && <Badge variant="outline">En attente</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.message || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminModuleShell>
  );
};
