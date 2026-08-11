import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, ShieldCheck } from "lucide-react";
import { AdminModuleShell } from "./ui/AdminModuleShell";
import { AdminRoleBadge } from "./ui/AdminBulkBar";
import {
  PERMISSION_MATRIX, ROLE_LABELS, CAPABILITY_LABELS,
  type AdminRole, type AdminCapability, useAdminPermissions,
} from "@/hooks/useAdminPermissions";

const ROLES = Object.keys(PERMISSION_MATRIX) as AdminRole[];
const CAPS = Object.keys(CAPABILITY_LABELS) as AdminCapability[];

const SECTIONS = [
  "Actualités", "Opportunités", "Appels d'offres", "Projets", "Documents",
  "Utilisateurs & rôles", "Paiements & factures", "Emailing", "Paramètres plateforme",
];

export const AdminPermissionsMatrix = () => {
  const { primaryRole } = useAdminPermissions();
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("id, role, user_id")
        .in("role", ROLES as string[]);
      setMembers(data || []);
    })();
  }, []);

  const cell = (ok: boolean) =>
    ok ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />;

  return (
    <AdminModuleShell
      title="Permissions par rôle"
      description="Matrice appliquée à chaque section et à chaque bouton du back-office."
      icon={ShieldCheck}
      actions={<AdminRoleBadge />}
    >
      <Card>
        <CardHeader><CardTitle className="text-base">Capacités par rôle</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rôle</TableHead>
                {CAPS.map((c) => <TableHead key={c} className="text-center">{CAPABILITY_LABELS[c]}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES.map((r) => (
                <TableRow key={r}>
                  <TableCell className="font-semibold">
                    {ROLE_LABELS[r]}
                    {primaryRole === r && <Badge variant="secondary" className="ml-2">vous</Badge>}
                    <p className="text-xs text-muted-foreground font-normal">{r}</p>
                  </TableCell>
                  {CAPS.map((c) => <TableCell key={c}>{cell(PERMISSION_MATRIX[r][c])}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Application par section</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                {ROLES.map((r) => <TableHead key={r} className="text-center">{ROLE_LABELS[r]}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {SECTIONS.map((s) => (
                <TableRow key={s}>
                  <TableCell className="font-medium">{s}</TableCell>
                  {ROLES.map((r) => (
                    <TableCell key={r} className="text-center text-xs">
                      {CAPS.filter((c) => PERMISSION_MATRIX[r][c]).map((c) => CAPABILITY_LABELS[c]).join(" · ")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Comptes par rôle</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <Badge key={r} variant="secondary">
              {ROLE_LABELS[r]} : {members.filter((m) => m.role === r).length}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </AdminModuleShell>
  );
};
