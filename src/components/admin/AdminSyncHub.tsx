import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminModuleShell, AdminSearchField, AdminEmptyState } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RefreshCcw, Check, Trash2, Send, Radio } from "lucide-react";

type Signal = {
  id: string;
  signal_type: string;
  severity: string | null;
  source_table: string | null;
  source_id: string | null;
  actor_user_id: string | null;
  payload: any;
  status: string | null;
  handled_at: string | null;
  handled_by_note: string | null;
  created_at: string;
};

const STATUSES = ["pending", "handled", "ignored"] as const;

/**
 * Hub de synchronisation inter-plateformes (Go ↔ MiPROJET+ ↔ Invest).
 * Lit/écrit la file réelle `platform_sync_signals` : aucune donnée simulée.
 */
export const AdminSyncHub = () => {
  const { toast } = useToast();
  const { canWrite, canDelete } = useAdminPermissions();
  const [rows, setRows] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [emitOpen, setEmitOpen] = useState(false);
  const [emitType, setEmitType] = useState("go.sync.request");
  const [emitPayload, setEmitPayload] = useState('{\n  "target": "miprojet-go",\n  "scope": "full"\n}');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_sync_signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
    setRows((data as Signal[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && (r.status || "pending") !== statusFilter) return false;
      if (!s) return true;
      return [r.signal_type, r.source_table, r.severity, JSON.stringify(r.payload)]
        .join(" ").toLowerCase().includes(s);
    });
  }, [rows, q, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, handled: 0, ignored: 0 };
    rows.forEach((r) => { const k = r.status || "pending"; c[k] = (c[k] || 0) + 1; });
    return c;
  }, [rows]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("platform_sync_signals")
      .update({ status, handled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, handled_at: new Date().toISOString() } : r)));
    toast({ title: "Signal mis à jour" });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("platform_sync_signals").delete().eq("id", id);
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Signal supprimé" });
  };

  const emit = async () => {
    let payload: any = {};
    try { payload = JSON.parse(emitPayload || "{}"); }
    catch { return toast({ title: "JSON invalide", variant: "destructive" }); }
    const { error } = await supabase.rpc("emit_sync_signal", {
      _type: emitType,
      _source_table: "admin_console",
      _source_id: null,
      _actor: null,
      _payload: payload,
      _severity: "info",
    });
    if (error) return toast({ title: "Échec de l'envoi", description: error.message, variant: "destructive" });
    setEmitOpen(false);
    toast({ title: "Signal envoyé", description: "Les plateformes abonnées vont le consommer." });
    load();
  };

  const pushCatalogToGo = async () => {
    const [{ count: produits }, { count: operations }, { count: entities }] = await Promise.all([
      supabase.from("produits").select("*", { count: "exact", head: true }),
      supabase.from("operations").select("*", { count: "exact", head: true }),
      supabase.from("entities").select("*", { count: "exact", head: true }),
    ]);
    const { error } = await supabase.rpc("emit_sync_signal", {
      _type: "go.dataset.push",
      _source_table: "admin_console",
      _source_id: null,
      _actor: null,
      _payload: { target: "miprojet-go", produits, operations, entities, requested_at: new Date().toISOString() },
      _severity: "info",
    });
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    toast({ title: "Jeu de données poussé vers Go", description: `${produits ?? 0} produits · ${operations ?? 0} opérations` });
    load();
  };

  return (
    <AdminModuleShell
      title="Synchronisation des plateformes"
      description="File réelle des signaux Go / MiPROJET+ / Invest."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCcw className="h-4 w-4 mr-2" />Rafraîchir
          </Button>
          {canWrite && (
            <>
              <Button variant="outline" size="sm" onClick={pushCatalogToGo}>
                <Radio className="h-4 w-4 mr-2" />Pousser vers Go
              </Button>
              <Button size="sm" onClick={() => setEmitOpen(true)}>
                <Send className="h-4 w-4 mr-2" />Émettre un signal
              </Button>
            </>
          )}
        </>
      }
      toolbar={
        <>
          <AdminSearchField value={q} onChange={setQ} placeholder="Type, table source, payload…" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {STATUSES.map((s) => (
          <Card key={s}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s}</p>
            <p className="text-2xl font-bold">{counts[s] || 0}</p>
          </CardContent></Card>
        ))}
      </div>

      {loading ? (
        <AdminEmptyState label="Chargement…" />
      ) : filtered.length === 0 ? (
        <AdminEmptyState label="Aucun signal" />
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.signal_type}
                    <span className="block text-xs text-muted-foreground max-w-[320px] truncate">
                      {r.payload ? JSON.stringify(r.payload) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.source_table || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={(r.status || "pending") === "pending" ? "secondary" : "outline"}>
                      {r.status || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {canWrite && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setStatus(r.id, "handled")}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setStatus(r.id, "ignored")}>Ignorer</Button>
                      </>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={emitOpen} onOpenChange={setEmitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Émettre un signal de synchronisation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={emitType} onValueChange={setEmitType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="go.sync.request">go.sync.request — demander à Go de resynchroniser</SelectItem>
                <SelectItem value="go.dataset.push">go.dataset.push — pousser un jeu de données vers Go</SelectItem>
                <SelectItem value="plus.project.updated">plus.project.updated — projet MiPROJET+ mis à jour</SelectItem>
                <SelectItem value="invest.project.published">invest.project.published — projet publié sur Invest</SelectItem>
              </SelectContent>
            </Select>
            <Textarea rows={7} value={emitPayload} onChange={(e) => setEmitPayload(e.target.value)} className="font-mono text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmitOpen(false)}>Annuler</Button>
            <Button onClick={emit}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminModuleShell>
  );
};
