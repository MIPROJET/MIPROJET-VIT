import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Star, CheckCircle2, XCircle, MessageSquareQuote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  content: string;
  rating: number | null;
  country: string | null;
  avatar_url: string | null;
  published: boolean;
  created_at: string;
}

const empty = {
  name: "",
  role: "",
  content: "",
  rating: 5,
  country: "",
  avatar_url: "",
  published: true,
};

export const AdminTestimonialsManager = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("testimonials")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setItems((data as Testimonial[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({
      name: t.name || "",
      role: t.role || "",
      content: t.content || "",
      rating: t.rating ?? 5,
      country: t.country || "",
      avatar_url: t.avatar_url || "",
      published: t.published,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      toast({ title: "Champs requis", description: "Nom et témoignage obligatoires", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      role: form.role.trim() || null,
      content: form.content.trim(),
      rating: Math.max(1, Math.min(5, Number(form.rating) || 5)),
      country: form.country.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      published: form.published,
    };
    const op = editing
      ? (supabase as any).from("testimonials").update(payload).eq("id", editing.id)
      : (supabase as any).from("testimonials").insert(payload);
    const { error } = await op;
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Témoignage mis à jour" : "Témoignage ajouté" });
    setOpen(false);
    load();
  };

  const togglePublished = async (t: Testimonial) => {
    const { error } = await (supabase as any)
      .from("testimonials")
      .update({ published: !t.published })
      .eq("id", t.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !t.published ? "Publié" : "Dépublié" });
      load();
    }
  };

  const remove = async (t: Testimonial) => {
    if (!confirm(`Supprimer le témoignage de ${t.name} ?`)) return;
    const { error } = await (supabase as any).from("testimonials").delete().eq("id", t.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Supprimé" });
      load();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="h-5 w-5 text-primary" />
          <CardTitle>Témoignages</CardTitle>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier" : "Nouveau"} témoignage</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nom *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Rôle / entreprise</Label>
                  <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pays</Label>
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
                <div>
                  <Label>Note (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>URL avatar (optionnel)</Label>
                <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
              </div>
              <div>
                <Label>Témoignage *</Label>
                <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                <Label>Publié</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={save}>{editing ? "Mettre à jour" : "Créer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquareQuote className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Aucun témoignage pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auteur</TableHead>
                  <TableHead>Témoignage</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[t.role, t.country].filter(Boolean).join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm line-clamp-2">{t.content}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < (t.rating || 0) ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.published ? "default" : "secondary"}>
                        {t.published ? "Publié" : "Brouillon"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => togglePublished(t)} title={t.published ? "Dépublier" : "Publier"}>
                        {t.published ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(t)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
