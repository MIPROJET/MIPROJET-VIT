import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

/**
 * Coquille standardisée pour tous les modules admin.
 * Garantit une UI cohérente : titre, description, actions, barre d'outils.
 */
export const AdminModuleShell = ({
  title,
  description,
  icon: Icon,
  actions,
  toolbar,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}) => (
  <section className="space-y-5">
    <header className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <span className="rounded-lg bg-primary/10 text-primary p-2 shrink-0">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>

    {toolbar && (
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">{toolbar}</div>
        </CardContent>
      </Card>
    )}

    <div className="space-y-6">{children}</div>
  </section>
);

/** Champ de recherche standardisé pour les barres d'outils admin. */
export const AdminSearchField = ({
  value,
  onChange,
  placeholder = "Rechercher…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div className="relative flex-1 min-w-[200px]">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-10" />
  </div>
);

/** État vide standardisé. */
export const AdminEmptyState = ({ label = "Aucune donnée" }: { label?: string }) => (
  <div className="text-center py-10 text-sm text-muted-foreground">{label}</div>
);
