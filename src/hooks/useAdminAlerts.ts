import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type AdminAlerts = {
  pendingConflicts: number;
  failedSignals: number;
  /** Plateformes concernées par au moins une anomalie (go / plus / invest). */
  platforms: string[];
  loading: boolean;
};

const PLATFORM_PREFIXES: Record<string, string> = {
  "go.": "go",
  "plus.": "plus",
  "invest.": "invest",
};

/**
 * Surveille les conflits de synchronisation en attente et les signaux en échec.
 * Notifie une seule fois par session tant que le volume ne change pas,
 * et expose une relance rapide par plateforme.
 */
export const useAdminAlerts = (options: { notify?: boolean; intervalMs?: number } = {}) => {
  const { notify = true, intervalMs = 120000 } = options;
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AdminAlerts>({
    pendingConflicts: 0,
    failedSignals: 0,
    platforms: [],
    loading: true,
  });
  const [lastNotified, setLastNotified] = useState<string>("");

  const load = useCallback(async () => {
    const [conflicts, signals] = await Promise.all([
      (supabase as any)
        .from("platform_sync_conflicts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("platform_sync_signals")
        .select("signal_type, severity, status")
        .in("severity", ["error", "critical"])
        .limit(500),
    ]);

    const failed = (signals.data || []).filter((s: any) => (s.status || "pending") !== "handled");
    const platforms = Array.from(
      new Set(
        failed
          .map((s: any) =>
            Object.entries(PLATFORM_PREFIXES).find(([p]) => (s.signal_type || "").startsWith(p))?.[1],
          )
          .filter(Boolean) as string[],
      ),
    );

    setAlerts({
      pendingConflicts: conflicts.error ? 0 : conflicts.count || 0,
      failedSignals: failed.length,
      platforms,
      loading: false,
    });
  }, []);

  useEffect(() => {
    load();
    if (!intervalMs) return;
    const t = setInterval(load, intervalMs);
    return () => clearInterval(t);
  }, [load, intervalMs]);

  useEffect(() => {
    if (!notify || alerts.loading) return;
    const key = `${alerts.pendingConflicts}:${alerts.failedSignals}`;
    if (key === lastNotified || (alerts.pendingConflicts === 0 && alerts.failedSignals === 0)) return;
    setLastNotified(key);
    toast({
      title: "Synchronisation à vérifier",
      description: [
        alerts.pendingConflicts > 0 ? `${alerts.pendingConflicts} conflit(s) en attente` : null,
        alerts.failedSignals > 0 ? `${alerts.failedSignals} signal(aux) en échec` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      variant: "destructive",
    });
  }, [alerts, notify, lastNotified, toast]);

  /** Relance rapide d'une plateforme (go / plus / invest) ou de toutes. */
  const relaunch = useCallback(
    async (platform: "go" | "plus" | "invest") => {
      const { error } = await supabase.rpc("emit_sync_signal", {
        _type: `${platform}.sync.request`,
        _source_table: "admin_console",
        _source_id: null,
        _actor: null,
        _payload: { scope: "full", origin: "alerts", requested_at: new Date().toISOString() },
        _severity: "info",
      });
      if (error) {
        toast({ title: "Échec de la relance", description: error.message, variant: "destructive" });
        return false;
      }
      toast({ title: "Relance envoyée", description: `Resynchronisation ${platform} demandée.` });
      load();
      return true;
    },
    [toast, load],
  );

  return { ...alerts, reload: load, relaunch };
};
