import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminModuleShell, AdminSearchField, AdminEmptyState } from "./ui/AdminModuleShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCcw, Download, History } from "lucide-react";
import { AUDIT_ACTION_LABELS, type AuditEntry } from "@/lib/adminAudit";

const DESTRUCTIVE = new Set(["delete", "reject", "archive"]);

/** Journal d'audit : qui a créé / modifié / archivé / supprimé quoi, avec recherche et filtres. */
export const AdminAuditLog = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [q, setQ] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      setMissing(true);
      setRows([]);
    } else {
      setMissing(false);
      setRows((data as AuditEntry[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const modules = useMemo(() => Array.from(new Set(rows.map((r) => r.module))).sort(), [rows]);
  const actors = useMemo(
    () => Array.from(new Set(rows.map((r) => r.actor_email || r.actor_user_id || "").filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (moduleFilter !== "all" && r.module !== moduleFilter) return false;
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (actorFilter !== "all" && (r.actor_email || r.actor_user_id) !== actorFilter) return false;
      if (!s) return true;
      return [r.module, r.action, r.entity_label, r.entity_table, r.actor_email, JSON.stringify(r.details)]
        .join(" ").toLowerCase().includes(s);
    });
  }, [rows, q, moduleFilter, actionFilter, actorFilter]);

  // Pagination (gros volumes)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  useEffect(() => { setPage(1); }, [q, moduleFilter, actionFilter, actorFilter, pageSize]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const download = (content: string, mime: string, ext: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /** Export étendu : respecte les filtres courants (toutes les pages). */
  const exportCsv = () => {
    const head = ["date", "module", "action", "entite", "entity_id", "table", "auteur", "details"];
    const lines = filtered.map((r) => [
      r.created_at, r.module, r.action, r.entity_label ?? "", r.entity_id ?? "", r.entity_table ?? "",
      r.actor_email ?? r.actor_user_id ?? "", JSON.stringify(r.details ?? {}),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    download([head.join(","), ...lines].join("\n"), "text/csv", "csv");
    toast({ title: "Export CSV généré", description: `${filtered.length} entrée(s)` });
  };

  const exportJson = () => {
    download(
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          filters: { search: q || null, module: moduleFilter, action: actionFilter, actor: actorFilter },
          count: filtered.length,
          entries: filtered,
        },
        null,
        2,
      ),
      "application/json",
      "json",
    );
    toast({ title: "Export JSON généré", description: `${filtered.length} entrée(s)` });
  };


  return (
    <AdminModuleShell
      title="Journal d'audit"
      description="Traçabilité complète des actions admin, avec recherche et filtres."
      icon={History}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="h-4 w-4 mr-2" />Rafraîchir</Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />CSV ({filtered.length})
          </Button>
          <Button variant="outline" size="sm" onClick={exportJson} disabled={filtered.length === 0}>
            <FileJson className="h-4 w-4 mr-2" />JSON ({filtered.length})
          </Button>

        </>
      }
      toolbar={
        <>
          <AdminSearchField value={q} onChange={setQ} placeholder="Entité, auteur, détails…" />
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Module" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les modules</SelectItem>
              {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {Object.entries(AUDIT_ACTION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={actorFilter} onValueChange={setActorFilter}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Utilisateur" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {actors.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Entrées</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Filtrées</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Modules</p>
          <p className="text-2xl font-bold">{modules.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Auteurs</p>
          <p className="text-2xl font-bold">{actors.length}</p>
        </CardContent></Card>
      </div>

      {missing ? (
        <AdminEmptyState label="Table admin_audit_log absente — exécutez le SQL du plan pour activer le journal." />
      ) : loading ? (
        <AdminEmptyState label="Chargement…" />
      ) : filtered.length === 0 ? (
        <AdminEmptyState label="Aucune action enregistrée" />
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Module</TableHead><TableHead>Action</TableHead>
              <TableHead>Entité</TableHead><TableHead>Auteur</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-sm">{r.module}</TableCell>
                  <TableCell>
                    <Badge variant={DESTRUCTIVE.has(r.action) ? "destructive" : "secondary"}>
                      {AUDIT_ACTION_LABELS[r.action as keyof typeof AUDIT_ACTION_LABELS] || r.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <span className="block truncate text-sm">{r.entity_label || r.entity_id || "—"}</span>
                    <span className="block text-xs text-muted-foreground">{r.entity_table || "—"}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {r.actor_email || r.actor_user_id || "système"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminModuleShell>
  );
};
