import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminModuleShell, AdminSearchField, AdminEmptyState } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, RefreshCcw, Pencil, Trash2, Archive, Check, X, Award, Star, MessageSquare, Upload } from "lucide-react";

type MPProject = {
  id: string; user_id: string; title: string; description: string | null;
  sector: string | null; status: string | null; city: string | null; country: string | null;
  is_public: boolean | null; short_pitch: string | null; created_at: string;
};

type ActionKind = "edit" | "score" | "message" | null;

const STATUSES = ["active", "pending", "validated", "rejected", "archived"];

/**
 * Gestion complète MiPROJET+ : CRUD projets, validation/rejet, notation,
 * certification, message au porteur et publication vers Invest.
 * 100 % données réelles (mp_projects, mp_evaluations, mp_certifications, projects).
 */
export const AdminMPPlusManager = () => {
  const { toast } = useToast();
  const { canWrite, canDelete, canPublish } = useAdminPermissions();
  const [rows, setRows] = useState<MPProject[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [action, setAction] = useState<ActionKind>(null);
  const [current, setCurrent] = useState<MPProject | null>(null);
  const [draft, setDraft] = useState<Partial<MPProject>>({});
  const [scoreDraft, setScoreDraft] = useState({ score_global: 70, niveau: "standard", notes: "" });
  const [messageDraft, setMessageDraft] = useState({ title: "", message: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [p, e] = await Promise.all([
      supabase.from("mp_projects").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("mp_evaluations").select("project_id, score_global, created_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (p.error) toast({ title: "Erreur", description: p.error.message, variant: "destructive" });
    setRows((p.data as MPProject[]) || []);
    const map: Record<string, number> = {};
    (e.data || []).forEach((row: any) => {
      if (row.project_id && map[row.project_id] === undefined) map[row.project_id] = row.score_global;
    });
    setScores(map);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && (r.status || "") !== statusFilter) return false;
      if (!s) return true;
      return [r.title, r.sector, r.city, r.country].join(" ").toLowerCase().includes(s);
    });
  }, [rows, q, statusFilter]);

  const signal = (type: string, id: string, payload: any) =>
    supabase.rpc("emit_sync_signal", {
      _type: type, _source_table: "mp_projects", _source_id: id, _actor: null, _payload: payload, _severity: "info",
    });

  const patch = async (r: MPProject, values: Partial<MPProject>, label: string) => {
    const { error } = await supabase.from("mp_projects").update(values as any).eq("id", r.id);
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...values } : x)));
    await signal("plus.project.updated", r.id, values);
    toast({ title: label });
  };

  const remove = async (r: MPProject) => {
    const { error } = await supabase.from("mp_projects").delete().eq("id", r.id);
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    await signal("plus.project.deleted", r.id, { id: r.id });
    toast({ title: "Projet supprimé" });
  };

  const saveEdit = async () => {
    if (!current) return;
    await patch(current, {
      title: draft.title, description: draft.description, sector: draft.sector,
      city: draft.city, country: draft.country, status: draft.status, is_public: draft.is_public,
      short_pitch: draft.short_pitch,
    }, "Projet mis à jour");
    setAction(null);
  };

  const saveScore = async () => {
    if (!current) return;
    const { error } = await supabase.from("mp_evaluations").insert({
      project_id: current.id, user_id: current.user_id,
      score_global: scoreDraft.score_global, niveau: scoreDraft.niveau, notes: scoreDraft.notes || null,
    });
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    setScores((prev) => ({ ...prev, [current.id]: scoreDraft.score_global }));
    await signal("plus.project.scored", current.id, { score_global: scoreDraft.score_global });
    setAction(null);
    toast({ title: "Note enregistrée", description: `Score ${scoreDraft.score_global}/100` });
  };

  const certify = async (r: MPProject) => {
    const { error } = await supabase.from("mp_certifications").insert({
      project_id: r.id, user_id: r.user_id, certification_type: "miprojet_standard",
      status: "certified", certified_at: new Date().toISOString(),
    });
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    await signal("plus.project.certified", r.id, { project_id: r.id });
    toast({ title: "Projet certifié" });
  };

  const sendMessage = async () => {
    if (!current || !messageDraft.title.trim()) return toast({ title: "Titre requis", variant: "destructive" });
    const { error } = await supabase.from("notifications").insert({
      user_id: current.user_id, title: messageDraft.title, message: messageDraft.message || null,
      type: "admin_message", link: `/projects`,
    });
    if (error) return toast({ title: "Échec", description: error.message, variant: "destructive" });
    setAction(null);
    setMessageDraft({ title: "", message: "" });
    toast({ title: "Message envoyé au porteur" });
  };

  const publishToInvest = async (r: MPProject) => {
    const { data: existing } = await supabase
      .from("projects").select("id").eq("owner_id", r.user_id).eq("title", r.title).maybeSingle();
    const payload = {
      owner_id: r.user_id, title: r.title, description: r.description,
      sector: r.sector, city: r.city, country: r.country,
      public_summary: r.short_pitch, status: "published", is_public: true,
      mp_score: scores[r.id] ?? null,
    };
    const { error } = existing?.id
      ? await supabase.from("projects").update(payload).eq("id", existing.id)
      : await supabase.from("projects").insert(payload);
    if (error) return toast({ title: "Échec de publication", description: error.message, variant: "destructive" });
    await signal("invest.project.published", r.id, { title: r.title });
    toast({ title: "Publié sur Invest", description: r.title });
  };

  return (
    <AdminModuleShell
      title="Gestion MiPROJET+"
      description="CRUD complet, validation, notation, certification et publication vers Invest."
      actions={<Button variant="outline" size="sm" onClick={load}><RefreshCcw className="h-4 w-4 mr-2" />Rafraîchir</Button>}
      toolbar={
        <>
          <AdminSearchField value={q} onChange={setQ} placeholder="Titre, secteur, ville…" />
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
      {loading ? <AdminEmptyState label="Chargement…" /> : filtered.length === 0 ? <AdminEmptyState label="Aucun projet" /> : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Projet</TableHead><TableHead>Secteur</TableHead><TableHead>Score</TableHead>
              <TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[300px]">
                    <span className="block truncate">{r.title}</span>
                    <span className="block text-xs text-muted-foreground">{[r.city, r.country].filter(Boolean).join(", ") || "—"}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.sector || "—"}</TableCell>
                  <TableCell>{scores[r.id] != null ? <Badge>{scores[r.id]}/100</Badge> : <span className="text-xs text-muted-foreground">non noté</span>}</TableCell>
                  <TableCell><Badge variant="outline">{r.status || "—"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[9999]">
                        {canWrite && (
                          <>
                            <DropdownMenuItem onClick={() => { setCurrent(r); setDraft(r); setAction("edit"); }}>
                              <Pencil className="h-4 w-4 mr-2" />Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patch(r, { status: "validated" }, "Projet validé")}>
                              <Check className="h-4 w-4 mr-2" />Valider
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patch(r, { status: "rejected" }, "Projet rejeté")}>
                              <X className="h-4 w-4 mr-2" />Rejeter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patch(r, { status: "archived", is_public: false }, "Projet archivé")}>
                              <Archive className="h-4 w-4 mr-2" />Archiver
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setCurrent(r); setScoreDraft({ score_global: scores[r.id] ?? 70, niveau: "standard", notes: "" }); setAction("score"); }}>
                              <Star className="h-4 w-4 mr-2" />Noter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => certify(r)}>
                              <Award className="h-4 w-4 mr-2" />Certifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setCurrent(r); setAction("message"); }}>
                              <MessageSquare className="h-4 w-4 mr-2" />Message au porteur
                            </DropdownMenuItem>
                          </>
                        )}
                        {canPublish && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => publishToInvest(r)}>
                              <Upload className="h-4 w-4 mr-2" />Publier vers Invest
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => remove(r)}>
                              <Trash2 className="h-4 w-4 mr-2" />Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Édition */}
      <Dialog open={action === "edit"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modifier le projet</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div><Label>Titre</Label><Input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
            <div><Label>Pitch court</Label><Input value={draft.short_pitch || ""} onChange={(e) => setDraft({ ...draft, short_pitch: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={4} value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Secteur</Label><Input value={draft.sector || ""} onChange={(e) => setDraft({ ...draft, sector: e.target.value })} /></div>
              <div><Label>Ville</Label><Input value={draft.city || ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Pays</Label><Input value={draft.country || ""} onChange={(e) => setDraft({ ...draft, country: e.target.value })} /></div>
              <div>
                <Label>Statut</Label>
                <Select value={draft.status || "active"} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Visible publiquement</Label>
              <Switch checked={!!draft.is_public} onCheckedChange={(v) => setDraft({ ...draft, is_public: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Annuler</Button>
            <Button onClick={saveEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notation */}
      <Dialog open={action === "score"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Noter le projet</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Score global (0-100)</Label>
              <Input type="number" min={0} max={100} value={scoreDraft.score_global}
                onChange={(e) => setScoreDraft({ ...scoreDraft, score_global: Number(e.target.value) })} />
            </div>
            <div><Label>Niveau</Label>
              <Select value={scoreDraft.niveau} onValueChange={(v) => setScoreDraft({ ...scoreDraft, niveau: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="argent">Argent</SelectItem>
                  <SelectItem value="or">Or</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea rows={3} value={scoreDraft.notes} onChange={(e) => setScoreDraft({ ...scoreDraft, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Annuler</Button>
            <Button onClick={saveScore}>Enregistrer la note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message */}
      <Dialog open={action === "message"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Message au porteur de projet</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Objet</Label><Input value={messageDraft.title} onChange={(e) => setMessageDraft({ ...messageDraft, title: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea rows={5} value={messageDraft.message} onChange={(e) => setMessageDraft({ ...messageDraft, message: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Annuler</Button>
            <Button onClick={sendMessage}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminModuleShell>
  );
};
