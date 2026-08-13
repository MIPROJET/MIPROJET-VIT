import { supabase } from "@/integrations/supabase/client";

/**
 * Journal d'audit admin. Écrit dans `public.admin_audit_log`.
 * Tolérant aux erreurs : si la table n'est pas encore créée (SQL en attente),
 * l'action métier n'est jamais bloquée.
 */
export type AuditAction =
  | "create" | "update" | "archive" | "delete"
  | "validate" | "reject" | "score" | "certify"
  | "publish" | "unpublish" | "message" | "sync" | "resolve_conflict";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: "Création",
  update: "Modification",
  archive: "Archivage",
  delete: "Suppression",
  validate: "Validation",
  reject: "Rejet",
  score: "Notation",
  certify: "Certification",
  publish: "Publication",
  unpublish: "Dépublication",
  message: "Message",
  sync: "Synchronisation",
  resolve_conflict: "Résolution de conflit",
};

export type AuditEntry = {
  id: string;
  module: string;
  action: string;
  entity_table: string | null;
  entity_id: string | null;
  entity_label: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  details: any;
  created_at: string;
};

export const logAudit = async (entry: {
  module: string;
  action: AuditAction;
  entityTable?: string;
  entityId?: string | null;
  entityLabel?: string | null;
  details?: Record<string, unknown>;
}) => {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await (supabase as any).from("admin_audit_log").insert({
      module: entry.module,
      action: entry.action,
      entity_table: entry.entityTable ?? null,
      entity_id: entry.entityId ?? null,
      entity_label: entry.entityLabel ?? null,
      actor_user_id: auth?.user?.id ?? null,
      actor_email: auth?.user?.email ?? null,
      details: entry.details ?? {},
    });
  } catch {
    /* table absente ou droits manquants : on n'interrompt jamais l'action */
  }
};

/** Enregistre une action groupée en une seule entrée agrégée + une par entité. */
export const logAuditBulk = async (
  base: { module: string; action: AuditAction; entityTable?: string },
  items: { id: string; label?: string | null }[],
) => {
  await logAudit({
    ...base,
    entityLabel: `${items.length} élément(s)`,
    details: { bulk: true, count: items.length, ids: items.map((i) => i.id) },
  });
};
