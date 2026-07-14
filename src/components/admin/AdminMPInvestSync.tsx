import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Rocket, Link2, CheckCircle2, XCircle, Search } from "lucide-react";
import { toast } from "sonner";

export const AdminMPInvestSync = () => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [mps, setMps] = useState<any[]>([]);
  const [evals, setEvals] = useState<Record<string, any>>({});
  const [invest, setInvest] = useState<Record<string, any>>({});
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: mpData } = await (supabase as any)
      .from("mp_projects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const list: any[] = mpData || [];
    setMps(list);

    const userIds = Array.from(new Set(list.map((m) => m.user_id).filter(Boolean)));
    const ids = list.map((m) => m.id);

    const [{ data: evData }, { data: invData }, { data: profData }] = await Promise.all([
      ids.length
        ? (supabase as any).from("mp_evaluations").select("*").in("project_id", ids)
        : Promise.resolve({ data: [] }),
      (supabase as any).from("projects").select("*").not("mp_score", "is", null).limit(2000),
      userIds.length
        ? supabase.from("profiles").select("id,email,first_name,last_name").in("id", userIds as string[])
        : Promise.resolve({ data: [] }),
    ]);

    const em: Record<string, any> = {};
    (evData || []).forEach((e: any) => {
      if (e.project_id) em[e.project_id] = e;
    });
    setEvals(em);

    // Link invest projects to mp_projects by matching owner_id + title
    const im: Record<string, any> = {};
    (invData || []).forEach((p: any) => {
      const match = list.find(
        (m) => m.user_id === p.owner_id && (m.title || "") === (p.title || "") && m.title
      );
      if (match) im[match.id] = p;
    });
    setInvest(im);

    const pm: Record<string, any> = {};
    (profData || []).forEach((p: any) => (pm[p.id] = p));
    setProfiles(pm);

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const publishToInvest = async (mp: any) => {
    setBusy(mp.id);
    try {
      const ev = evals[mp.id];
      const existing = invest[mp.id];
      const payload: any = {
        title: mp.title || "Projet MiProjet+",
        description: mp.description || mp.short_pitch || null,
        sector: mp.sector,
        amount_requested: mp.budget_initial ?? null,
        country: mp.country,
        city: mp.city,
        status: "published",
        is_public: true,
        owner_id: mp.user_id,
        mp_score: ev?.score_global ?? null,
      };
      if (existing) {
        const { error } = await (supabase as any).from("projects").update(payload).eq("id", existing.id);
        if (error) throw error;
        toast.success("Projet Invest mis à jour");
      } else {
        const { error } = await (supabase as any).from("projects").insert(payload);
        if (error) throw error;
        toast.success("Projet publié sur MiPROJET Invest");
      }
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur de publication");
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async (mp: any) => {
    const existing = invest[mp.id];
    if (!existing) return;
    setBusy(mp.id);
    const { error } = await (supabase as any)
      .from("projects")
      .update({ is_public: false, status: "draft" })
      .eq("id", existing.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Projet dépublié");
      await load();
    }
    setBusy(null);
  };

  const filtered = mps.filter((m) => {
    if (!q) return true;
    const s = q.toLowerCase();
    const p = profiles[m.user_id];
    return (
      (m.title || "").toLowerCase().includes(s) ||
      (m.sector || "").toLowerCase().includes(s) ||
      (p?.email || "").toLowerCase().includes(s)
    );
  });

  const stats = {
    total: mps.length,
    evaluated: Object.keys(evals).length,
    financable: Object.values(evals).filter(
      (e: any) => e.niveau === "financable" || e.niveau === "Finançable"
    ).length,
    published: Object.keys(invest).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Synchronisation MiPROJET+ ↔ Invest</h1>
        <p className="text-muted-foreground">
          Reprend les projets déposés dans MiPROJET+ et gère leur publication sur MiPROJET Invest.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Projets MiPROJET+" value={stats.total} />
        <StatCard label="Évalués" value={stats.evaluated} />
        <StatCard label="Finançables" value={stats.financable} tone="success" />
        <StatCard label="Publiés sur Invest" value={stats.published} tone="brand" />
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Projets MiPROJET+</CardTitle>
            <CardDescription>
              Publier, mettre à jour ou dépublier chaque projet vers l'espace investisseurs.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher…"
                className="pl-8 w-64"
              />
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucun projet trouvé.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projet</TableHead>
                    <TableHead>Porteur</TableHead>
                    <TableHead>Secteur</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Évaluation</TableHead>
                    <TableHead>Sur Invest</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const ev = evals[m.id];
                    const inv = invest[m.id];
                    const prof = profiles[m.user_id];
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium max-w-[220px] truncate">{m.title || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {prof ? (
                            <div>
                              <div>{[prof.first_name, prof.last_name].filter(Boolean).join(" ") || "—"}</div>
                              <div className="text-muted-foreground">{prof.email}</div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{m.sector || "—"}</TableCell>
                        <TableCell>
                          {m.budget_initial
                            ? `${Number(m.budget_initial).toLocaleString("fr-FR")} FCFA`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {ev ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline">{ev.score_global ?? "—"}/100</Badge>
                              <span className="text-xs text-muted-foreground">{ev.niveau || "—"}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Non évalué</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {inv ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {inv.is_public ? "Publié" : "Brouillon"}
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Non publié
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="default"
                              disabled={busy === m.id}
                              onClick={() => publishToInvest(m)}
                            >
                              {inv ? <Link2 className="h-3 w-3 mr-1" /> : <Rocket className="h-3 w-3 mr-1" />}
                              {inv ? "Resync" : "Publier"}
                            </Button>
                            {inv && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busy === m.id}
                                onClick={() => unpublish(m)}
                              >
                                Dépublier
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ label, value, tone }: { label: string; value: number; tone?: "success" | "brand" }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${
          tone === "success" ? "text-emerald-600" : tone === "brand" ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </CardContent>
  </Card>
);
