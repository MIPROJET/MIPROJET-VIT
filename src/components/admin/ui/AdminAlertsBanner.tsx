import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Play } from "lucide-react";
import { useAdminAlerts } from "@/hooks/useAdminAlerts";

const PLATFORM_LABELS: Record<string, string> = {
  go: "MiPROJET Go",
  plus: "MiPROJET+",
  invest: "MiPROJET Invest",
};

/**
 * Bandeau d'alerte : conflits de synchronisation en attente et signaux en échec,
 * avec relance rapide par plateforme.
 */
export const AdminAlertsBanner = ({
  onOpenConflicts,
  notify = true,
}: {
  onOpenConflicts?: () => void;
  notify?: boolean;
}) => {
  const { pendingConflicts, failedSignals, platforms, loading, relaunch, reload } = useAdminAlerts({ notify });

  if (loading) return null;

  const clean = pendingConflicts === 0 && failedSignals === 0;

  return (
    <Card className={clean ? "" : "border-destructive/40 bg-destructive/5"}>
      <CardContent className="p-4 flex flex-wrap items-center gap-3">
        {clean ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <p className="text-sm">Aucune anomalie de synchronisation : Go, MiPROJET+ et Invest sont alignés.</p>
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium">Synchronisation à traiter</p>
            {pendingConflicts > 0 && (
              <Badge variant="destructive">{pendingConflicts} conflit(s) en attente</Badge>
            )}
            {failedSignals > 0 && <Badge variant="secondary">{failedSignals} signal(aux) en échec</Badge>}
            <div className="flex flex-wrap gap-2 ml-auto">
              {pendingConflicts > 0 && onOpenConflicts && (
                <Button size="sm" variant="outline" onClick={onOpenConflicts}>
                  Traiter les conflits
                </Button>
              )}
              {(platforms.length ? platforms : ["go", "plus", "invest"]).map((p) => (
                <Button key={p} size="sm" variant="outline" onClick={() => relaunch(p as "go")}>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Relancer {PLATFORM_LABELS[p] || p}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={reload}>Actualiser</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
