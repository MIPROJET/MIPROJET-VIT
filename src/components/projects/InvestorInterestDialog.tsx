import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  projectId: string;
  projectTitle?: string;
  trigger?: React.ReactNode;
}

const CAPACITIES = [
  "< 1 000 000 XOF",
  "1 000 000 – 10 000 000 XOF",
  "10 000 000 – 50 000 000 XOF",
  "50 000 000 – 200 000 000 XOF",
  "> 200 000 000 XOF",
];

const HORIZONS = ["< 1 an", "1 – 3 ans", "3 – 5 ans", "5 – 10 ans", "> 10 ans"];

const TYPES = [
  { id: "equity", label: "Prise de participation (capital)" },
  { id: "loan", label: "Prêt" },
  { id: "donation", label: "Don" },
  { id: "seed", label: "Capital d'amorçage" },
  { id: "mixed", label: "Formule mixte" },
];

export const InvestorInterestDialog = ({ projectId, projectTitle, trigger }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: user?.email ?? "",
    phone: "",
    country: "",
    investment_capacity: "",
    engagement_type: [] as string[],
    expected_return_pct: "",
    wants_equity: false,
    equity_share_pct: "",
    time_horizon: "",
    message: "",
  });

  const toggleType = (id: string) => {
    setForm((f) => ({
      ...f,
      engagement_type: f.engagement_type.includes(id)
        ? f.engagement_type.filter((t) => t !== id)
        : [...f.engagement_type, id],
    }));
  };

  const submit = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast({ title: "Champs requis", description: "Nom et email obligatoires", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload: any = {
      project_id: projectId,
      user_id: user?.id ?? null,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      country: form.country.trim() || null,
      investment_capacity: form.investment_capacity || null,
      engagement_type: form.engagement_type,
      expected_return_pct: form.expected_return_pct ? Number(form.expected_return_pct) : null,
      wants_equity: form.wants_equity,
      equity_share_pct: form.equity_share_pct ? Number(form.equity_share_pct) : null,
      time_horizon: form.time_horizon || null,
      message: form.message.trim() || null,
    };
    const { error } = await (supabase as any).from("investor_prospects").insert(payload);
    setSubmitting(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Merci ! Votre intérêt a été enregistré",
      description: "Notre équipe vous contactera très rapidement pour la mise en relation.",
    });
    setOpen(false);
    setForm({ ...form, message: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ?? (
        <Button size="lg" onClick={() => setOpen(true)} className="gap-2">
          <Heart className="h-4 w-4" /> Ce projet m'intéresse
        </Button>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Manifestez votre intérêt
          </DialogTitle>
          <DialogDescription>
            {projectTitle ? <>Projet : <strong>{projectTitle}</strong>. </> : null}
            Renseignez votre profil — notre équipe vous mettra en relation avec le porteur de projet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nom complet *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Pays</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Capacité d'investissement</Label>
            <Select value={form.investment_capacity} onValueChange={(v) => setForm({ ...form, investment_capacity: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez une tranche" /></SelectTrigger>
              <SelectContent>
                {CAPACITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Type d'engagement souhaité</Label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <label key={t.id} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={form.engagement_type.includes(t.id)} onCheckedChange={() => toggleType(t.id)} />
                  <span className="text-sm">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Retour attendu (%)</Label>
              <Input type="number" min={0} max={100} value={form.expected_return_pct}
                onChange={(e) => setForm({ ...form, expected_return_pct: e.target.value })} />
            </div>
            <div>
              <Label>Horizon d'investissement</Label>
              <Select value={form.time_horizon} onValueChange={(v) => setForm({ ...form, time_horizon: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {HORIZONS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Souhaitez-vous devenir actionnaire ?</Label>
              <Switch checked={form.wants_equity} onCheckedChange={(v) => setForm({ ...form, wants_equity: v })} />
            </div>
            {form.wants_equity && (
              <div>
                <Label>Part visée (%)</Label>
                <Input type="number" min={0} max={100} value={form.equity_share_pct}
                  onChange={(e) => setForm({ ...form, equity_share_pct: e.target.value })} />
              </div>
            )}
          </div>

          <div>
            <Label>Message complémentaire</Label>
            <Textarea rows={3} value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Précisez vos attentes, conditions ou questions…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi…</> : "Envoyer mon intérêt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
