import { ReactNode, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCheck, Trash2, Eye, EyeOff, X, ShieldCheck, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdminPermissions, type AdminCapability, CAPABILITY_LABELS } from "@/hooks/useAdminPermissions";

/* ---------------- Sélection multiple ---------------- */

export const useBulkSelection = <T extends { id: string }>(items: T[]) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));

  const toggleAll = useCallback(() => {
    setSelected((prev) => (ids.every((id) => prev.has(id)) ? new Set() : new Set(ids)));
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);

  return {
    selected,
    selectedIds: Array.from(selected),
    count: selected.size,
    isSelected: (id: string) => selected.has(id),
    toggle,
    toggleAll,
    allSelected,
    clear,
  };
};

/** Case à cocher de sélection de ligne, standardisée. */
export const RowCheckbox = ({
  checked, onChange, disabled,
}: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
  <Checkbox checked={checked} onCheckedChange={() => onChange()} disabled={disabled} aria-label="Sélectionner" />
);

/* ---------------- Garde de permission ---------------- */

export const PermissionGate = ({
  capability, children, fallback = null,
}: { capability: AdminCapability; children: ReactNode; fallback?: ReactNode }) => {
  const { can } = useAdminPermissions();
  return <>{can(capability) ? children : fallback}</>;
};

/** Badge affichant le rôle courant et ses droits. */
export const AdminRoleBadge = () => {
  const { roleLabel, canWrite, canDelete, canPublish, loading } = useAdminPermissions();
  if (loading) return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Rôle…</Badge>;
  const caps: AdminCapability[] = ["read", ...(canWrite ? ["write" as const] : []), ...(canPublish ? ["publish" as const] : []), ...(canDelete ? ["delete" as const] : [])];
  return (
    <Badge variant="secondary" className="gap-1.5" title={caps.map((c) => CAPABILITY_LABELS[c]).join(" · ")}>
      <ShieldCheck className="h-3 w-3" /> {roleLabel}
    </Badge>
  );
};

/* ---------------- Barre d'actions groupées ---------------- */

export type BulkAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  capability: AdminCapability;
  destructive?: boolean;
  confirm?: string;
  run: (ids: string[]) => Promise<void> | void;
};

export const AdminBulkBar = ({
  count, ids, onClear, actions, entityLabel = "élément", labelFor,
}: {
  count: number;
  ids: string[];
  onClear: () => void;
  actions: BulkAction[];
  entityLabel?: string;
  /** Libellé lisible d'une entité, utilisé dans l'aperçu avant exécution. */
  labelFor?: (id: string) => string;
}) => {
  const { can } = useAdminPermissions();
  const [pending, setPending] = useState<BulkAction | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (count === 0) return null;
  const visible = actions.filter((a) => can(a.capability));

  const execute = async (action: BulkAction, ids: string[]) => {
    setBusy(action.key);
    try { await action.run(ids); } finally { setBusy(null); setPending(null); }
  };

  return (
    <>
      <Card className="border-primary/40 bg-primary/5 sticky top-16 z-30">
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <Badge className="gap-1"><CheckCheck className="h-3 w-3" /> {count} {entityLabel}{count > 1 ? "s" : ""} sélectionné{count > 1 ? "s" : ""}</Badge>
          <div className="flex flex-wrap gap-2 ml-auto">
            {visible.map((a) => (
              <Button
                key={a.key}
                size="sm"
                variant={a.destructive ? "destructive" : "outline"}
                disabled={busy !== null}
                onClick={() => setPending(a)}
              >
                {busy === a.key ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : a.icon}
                {a.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={onClear}><X className="h-3.5 w-3.5 mr-1" /> Annuler</Button>
          </div>
        </CardContent>
      </Card>

      {/* Aperçu avant exécution : liste exhaustive des entités impactées */}
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aperçu · {pending?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.confirm?.replace("{n}", String(count)) ??
                `Cette action va s'appliquer à ${count} ${entityLabel}${count > 1 ? "s" : ""}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-56 overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-1">
            {ids.map((id, i) => (
              <p key={id} className="text-xs truncate">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                {labelFor?.(id) || id}
              </p>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => pending && execute(pending, ids)}>
              Exécuter ({count})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


/** Icônes prêtes à l'emploi pour les actions groupées courantes. */
export const bulkIcons = {
  publish: <Eye className="h-3.5 w-3.5 mr-1.5" />,
  unpublish: <EyeOff className="h-3.5 w-3.5 mr-1.5" />,
  delete: <Trash2 className="h-3.5 w-3.5 mr-1.5" />,
};
