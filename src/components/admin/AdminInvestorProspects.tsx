import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Mail, Phone, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Prospect {
  id: string;
  project_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  investment_capacity: string | null;
  engagement_type: string[] | null;
  expected_return_pct: number | null;
  wants_equity: boolean;
  equity_share_pct: number | null;
  time_horizon: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

const STATUSES = ["new", "contacted", "qualified", "matched", "closed", "rejected"];

export const AdminInvestorProspects = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("investor_prospects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setItems((data as Prospect[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("investor_prospects").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      load();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <CardTitle>Prospects investisseurs</CardTitle>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Aucun prospect pour le moment.</p>
            <p className="text-xs mt-1">
              Les soumissions du formulaire « Ce projet m'intéresse » apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investisseur</TableHead>
                  <TableHead>Capacité / Engagement</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.full_name}</div>
                      <div className="text-xs text-muted-foreground flex flex-col gap-0.5 mt-1">
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>
                        {p.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                        {p.country && <span>{p.country}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      {p.investment_capacity && <div className="text-sm font-medium">{p.investment_capacity}</div>}
                      {p.engagement_type?.length ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.engagement_type.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      ) : null}
                      {p.expected_return_pct != null && (
                        <div className="text-xs text-muted-foreground mt-1">ROI attendu : {p.expected_return_pct}%</div>
                      )}
                      {p.wants_equity && (
                        <div className="text-xs text-muted-foreground">Actionnariat {p.equity_share_pct ? `(${p.equity_share_pct}%)` : ""}</div>
                      )}
                      {p.message && <div className="text-xs italic mt-1 line-clamp-2">"{p.message}"</div>}
                    </TableCell>
                    <TableCell>
                      <Link to={`/projects/${p.project_id}`} className="text-primary inline-flex items-center gap-1 text-sm">
                        Voir <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
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
