import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Matrice de permissions admin par rôle.
 * Rôles pris en charge (table public.user_roles) :
 *  - admin              : accès total
 *  - admin_operational  : lecture, écriture, publication (pas de suppression)
 *  - admin_readonly     : lecture seule
 */
export type AdminCapability = "read" | "write" | "delete" | "publish";
export type AdminRole = "admin" | "admin_operational" | "admin_readonly";

const MATRIX: Record<AdminRole, Record<AdminCapability, boolean>> = {
  admin: { read: true, write: true, delete: true, publish: true },
  admin_operational: { read: true, write: true, delete: false, publish: true },
  admin_readonly: { read: true, write: false, delete: false, publish: false },
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Administrateur",
  admin_operational: "Opérationnel",
  admin_readonly: "Lecture seule",
};

export const CAPABILITY_LABELS: Record<AdminCapability, string> = {
  read: "Lecture",
  write: "Écriture",
  delete: "Suppression",
  publish: "Publication",
};

export const PERMISSION_MATRIX = MATRIX;

export const useAdminPermissions = () => {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { if (mounted) { setRoles([]); setLoading(false); } return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id);
      if (!mounted) return;
      const list = (data || [])
        .map((r: any) => String(r.role))
        .filter((r): r is AdminRole => r in MATRIX);
      setRoles(list);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const can = useCallback(
    (cap: AdminCapability) => roles.some((r) => MATRIX[r]?.[cap]),
    [roles],
  );

  const primaryRole: AdminRole | null =
    roles.includes("admin") ? "admin"
    : roles.includes("admin_operational") ? "admin_operational"
    : roles.includes("admin_readonly") ? "admin_readonly"
    : null;

  return {
    loading,
    roles,
    primaryRole,
    roleLabel: primaryRole ? ROLE_LABELS[primaryRole] : "Aucun rôle",
    can,
    canRead: can("read"),
    canWrite: can("write"),
    canDelete: can("delete"),
    canPublish: can("publish"),
  };
};
