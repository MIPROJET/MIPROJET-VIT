import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminModuleShell, AdminSearchField, AdminEmptyState } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, RefreshCcw, Radio } from "lucide-react";

type Produit = {
  id: string; user_id: string | null; nom: string; prix_unitaire: number | null;
  categorie: string | null; unite: string | null; actif: boolean | null;
  stock_actif: boolean | null; stock_actuel: number | null; seuil_alerte: number | null;
};
type Operation = {
  id: string; user_id: string | null; type: string; montant: number | null;
  description: string | null; categorie: string | null; mode_paiement: string | null;
  date_operation: string | null; source: string | null;
};

const emptyProduit: Partial<Produit> = { nom: "", prix_unitaire: 0, categorie: "", unite: "unité", actif: true, stock_actif: false, stock_actuel: 0, seuil_alerte: 0 };

/** Gestion réelle des données MiPROJET Go (produits, opérations) + propagation. */
export const AdminGoManager = () => {
  const { toast } = useToast();
  const { canWrite, canDelete } = useAdminPermissions();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Produit> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, o] = await Promise.all([
      supabase.from("produits").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("operations").select("*").order("date_operation", { ascending: false }).limit(500),
    ]);
    if (p.error) toast({ title: "Produits", description: p.error.message, variant: "destructive" });
    if (o.error) toast({ title: "Opérations", description: o.error.message, variant: "destructive" });
    setProduits((p.data as Produit[]) || []);
    setOperations((o.data as Operation[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const s = q.trim().toLowerCase();
  const fProduits = useMemo(
    () => produits.filter((r) => !s || [r.nom, r.categorie, r.unite].join(" ").toLowerCase().includes(s)),
    [produits, s],
  );
  const fOperations = useMemo(
    () => operations.filter((r) => !s || [r.type, r.description, r.categorie, r.source].join(" ").toLowerCase().includes(s)),
    [operations, s],
  );

  const ca = useMemo(
    () => operations.filter((o) => o.type === "vente" || o.type === "entree").reduce((a, o) => a + Number(o.montant || 0), 0),
    [operations],
  );

  const propagate = async (type: string, id: string | null, payload: any) => {
    await supabase.rpc("emit_sync_signal", {
      _type: type, _source_table: "produits", _source_id: id, _actor: null, _payload: payload, _severity: "info",
    });
  };

  const saveProduit = async () => {
    if (!editing?.nom?.trim()) return toast({ title: "Nom requis", variant: "destructive" });
    const payload = {
      nom: editing.nom, prix_unitaire: Number(editing.prix_unitaire || 0), categorie: editing.categorie || null,
      unite: editing.unite || null, actif: editing.actif ?? true, stock_actif: editing.stock_actif ?? false,
      stock_actuel: Number(editing.stock_actuel || 0), seuil_alerte: Number(editing.seuil_alerte || 0),
    };
    if (editing.id) {
      const { error } = await supabase.from("produits").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
      await propagate("go.produit.updated", editing.id, payload);
    } else {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("produits")
        .insert({ ...payload, user_id: auth?.user?.id })
        .select("id")
        .maybeSingle();
      if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
      await propagate("go.produit.created", data?.id ?? null, payload);
    }
    setEditing(null);
    toast({ title: "Produit enregistré", description: "Signal de synchronisation envoyé à Go." });
    load();
  };

  const toggleActif = async (r: Produit) => {
    const { error } = await supabase.from("produits").update({ actif: !r.actif }).eq("id", r.id);
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    await propagate("go.produit.updated", r.id, { actif: !r.actif });
    setProduits((prev) => prev.map((p) => (p.id === r.id ? { ...p, actif: !r.actif } : p)));
  };

  const removeProduit = async (id: string) => {
    const { error } = await supabase.from("produits").delete().eq("id", id);
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    await propagate("go.produit.deleted", id, { id });
    setProduits((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Produit supprimé" });
  };

  const removeOperation = async (id: string) => {
    const { error } = await supabase.from("operations").delete().eq("id", id);
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    setOperations((prev) => prev.filter((o) => o.id !== id));
    toast({ title: "Opération supprimée" });
  };

  const requestGoResync = async () => {
    const { error } = await supabase.rpc("emit_sync_signal", {
      _type: "go.sync.request", _source_table: "admin_console", _source_id: null, _actor: null,
      _payload: { target: "miprojet-go", scope: "full", requested_at: new Date().toISOString() }, _severity: "info",
    });
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    toast({ title: "Resynchronisation demandée à Go" });
  };

  return (
    <AdminModuleShell
      title="Données MiPROJET Go"
      description="Produits et opérations réels, avec propagation automatique vers Go."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="h-4 w-4 mr-2" />Rafraîchir</Button>
          {canWrite && (
            <>
              <Button variant="outline" size="sm" onClick={requestGoResync}><Radio className="h-4 w-4 mr-2" />Resync Go</Button>
              <Button size="sm" onClick={() => setEditing({ ...emptyProduit })}><Plus className="h-4 w-4 mr-2" />Nouveau produit</Button>
            </>
          )}
        </>
      }
      toolbar={<AdminSearchField value={q} onChange={setQ} placeholder="Produit, catégorie, opération…" />}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Produits</p><p className="text-2xl font-bold">{produits.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Opérations</p><p className="text-2xl font-bold">{operations.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Entrées cumulées</p><p className="text-2xl font-bold">{ca.toLocaleString("fr-FR")} F</p></CardContent></Card>
      </div>

      <Tabs defaultValue="produits">
        <TabsList>
          <TabsTrigger value="produits">Produits ({fProduits.length})</TabsTrigger>
          <TabsTrigger value="operations">Opérations ({fOperations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="produits" className="pt-4">
          {loading ? <AdminEmptyState label="Chargement…" /> : fProduits.length === 0 ? <AdminEmptyState label="Aucun produit" /> : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Produit</TableHead><TableHead>Prix</TableHead><TableHead>Stock</TableHead>
                  <TableHead>Actif</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {fProduits.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nom}<span className="block text-xs text-muted-foreground">{r.categorie || "—"}</span></TableCell>
                      <TableCell>{Number(r.prix_unitaire || 0).toLocaleString("fr-FR")} F / {r.unite || "u"}</TableCell>
                      <TableCell>{r.stock_actif ? `${r.stock_actuel ?? 0}` : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.actif ? "default" : "secondary"}>{r.actif ? "Actif" : "Inactif"}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {canWrite && <Button variant="ghost" size="sm" onClick={() => toggleActif(r)}>{r.actif ? "Archiver" : "Réactiver"}</Button>}
                        {canWrite && <Button variant="ghost" size="sm" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>}
                        {canDelete && <Button variant="ghost" size="sm" onClick={() => removeProduit(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="operations" className="pt-4">
          {loading ? <AdminEmptyState label="Chargement…" /> : fOperations.length === 0 ? <AdminEmptyState label="Aucune opération" /> : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Type</TableHead><TableHead>Montant</TableHead><TableHead>Description</TableHead>
                  <TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {fOperations.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                      <TableCell>{Number(r.montant || 0).toLocaleString("fr-FR")} F</TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">{r.description || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.date_operation ? new Date(r.date_operation).toLocaleDateString("fr-FR") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canDelete && <Button variant="ghost" size="sm" onClick={() => removeOperation(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Modifier le produit" : "Nouveau produit"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nom</Label><Input value={editing.nom || ""} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prix unitaire</Label><Input type="number" value={editing.prix_unitaire ?? 0} onChange={(e) => setEditing({ ...editing, prix_unitaire: Number(e.target.value) })} /></div>
                <div><Label>Unité</Label><Input value={editing.unite || ""} onChange={(e) => setEditing({ ...editing, unite: e.target.value })} /></div>
              </div>
              <div><Label>Catégorie</Label><Input value={editing.categorie || ""} onChange={(e) => setEditing({ ...editing, categorie: e.target.value })} /></div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Suivi de stock</Label>
                <Switch checked={!!editing.stock_actif} onCheckedChange={(v) => setEditing({ ...editing, stock_actif: v })} />
              </div>
              {editing.stock_actif && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Stock actuel</Label><Input type="number" value={editing.stock_actuel ?? 0} onChange={(e) => setEditing({ ...editing, stock_actuel: Number(e.target.value) })} /></div>
                  <div><Label>Seuil d'alerte</Label><Input type="number" value={editing.seuil_alerte ?? 0} onChange={(e) => setEditing({ ...editing, seuil_alerte: Number(e.target.value) })} /></div>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Actif</Label>
                <Switch checked={editing.actif ?? true} onCheckedChange={(v) => setEditing({ ...editing, actif: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={saveProduit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminModuleShell>
  );
};
