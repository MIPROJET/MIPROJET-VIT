import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Shell unique de l'admin : header (icône, titre, description), fil d'Ariane,
 * barre d'actions standardisée et zone de contenu.
 * Tous les modules admin sont rendus à l'intérieur → UI cohérente partout.
 */

const ACTIONS_HOST_ID = "admin-shell-actions";

const ShellCtx = createContext<{ inShell: boolean }>({ inShell: false });
export const useAdminShell = () => useContext(ShellCtx);

/** Injecte des boutons dans la barre d'actions du shell (ou en ligne si hors shell). */
export const AdminActions = ({ children }: { children: ReactNode }) => {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHost(document.getElementById(ACTIONS_HOST_ID));
  }, []);
  if (!children) return null;
  if (!host) return <div className="flex flex-wrap items-center gap-2">{children}</div>;
  return createPortal(children, host);
};

export const AdminPageShell = ({
  title,
  description,
  icon: Icon,
  breadcrumbs = [],
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  breadcrumbs?: { label: string; onClick?: () => void }[];
  children: ReactNode;
}) => (
  <ShellCtx.Provider value={{ inShell: true }}>
    <div className="space-y-4">
      {breadcrumbs.length > 0 && (
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {breadcrumbs.map((b, i) => (
            <span key={`${b.label}-${i}`} className="flex items-center gap-2">
              {b.onClick ? (
                <button onClick={b.onClick} className="hover:text-foreground transition-colors">
                  {b.label}
                </button>
              ) : (
                <span>{b.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <span aria-hidden>/</span>}
            </span>
          ))}
        </nav>
      )}

      <div className="bg-card rounded-xl border shadow-sm">
        <header className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between border-b p-4 sm:p-5">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <span className="rounded-lg bg-primary/10 text-primary p-2 shrink-0">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">{title}</h1>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          <div id={ACTIONS_HOST_ID} className="flex flex-wrap items-center gap-2 lg:justify-end" />
        </header>

        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  </ShellCtx.Provider>
);
