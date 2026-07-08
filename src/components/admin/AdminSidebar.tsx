import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, Users, FolderKanban, Settings,
  Home, Newspaper, HelpCircle, BookOpen, Briefcase, Mail, UserCheck,
  ChevronDown, FileDown, Shield, Award, Sparkles, MessageSquareQuote, Heart,
  Smartphone, Building2, TrendingUp, Handshake, ShieldCheck, Bell, Receipt, CreditCard,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  isOpen: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose?: () => void;
}

const menuGroups = [
  {
    label: "Hub Administratif",
    items: [
      { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
    ],
  },
  {
    label: "MiPROJET Go",
    icon: Smartphone,
    items: [
      { id: "users", label: "Utilisateurs & activités", icon: Users },
      { id: "subscriptions", label: "Abonnements", icon: Award },
    ],
  },
  {
    label: "MiPROJET+",
    icon: Building2,
    items: [
      { id: "mp-overview", label: "Projets & scores", icon: Sparkles },
      { id: "mp-analytics", label: "Analytiques", icon: TrendingUp },
      { id: "mp-certifications", label: "Certifications", icon: Award },
      { id: "evaluations", label: "Évaluations", icon: ShieldCheck },
      { id: "requests", label: "Demandes de services", icon: Briefcase },
    ],
  },
  {
    label: "MiPROJET Invest",
    icon: TrendingUp,
    items: [
      { id: "projects", label: "Projets publiés", icon: FolderKanban },
      { id: "investor-prospects", label: "Investisseurs", icon: Heart },
      { id: "opportunities", label: "Opportunités", icon: Briefcase },
    ],
  },
  {
    label: "Communication",
    items: [
      { id: "emails", label: "Email marketing", icon: Mail },
      { id: "news", label: "Actualités", icon: Newspaper },
      { id: "testimonials", label: "Témoignages", icon: MessageSquareQuote },
    ],
  },
  {
    label: "Opportunités",
    items: [
      { id: "tenders", label: "Appels d'offres", icon: Briefcase },
      { id: "tender-leads", label: "Prospects AO", icon: UserCheck },
    ],
  },
  {
    label: "Partenariats",
    items: [
      { id: "leads", label: "Leads & contacts", icon: UserCheck },
      { id: "referrals", label: "Parrainages", icon: Handshake },
    ],
  },
  {
    label: "Finances",
    items: [
      { id: "invoices", label: "Factures", icon: Receipt },
      { id: "payments", label: "Paiements", icon: CreditCard },
    ],
  },
  {
    label: "Contenu & Ressources",
    items: [
      { id: "documents", label: "Documents", icon: FileDown },
      { id: "faq", label: "FAQ", icon: HelpCircle },
    ],
  },
  {
    label: "Administration",
    items: [
      { id: "database", label: "Base de données", icon: Shield },
      { id: "maintenance", label: "Maintenance", icon: Bell },
      { id: "settings", label: "Paramètres", icon: Settings },
    ],
  },
];

export const AdminSidebar = ({ isOpen, activeTab, onTabChange, onClose }: AdminSidebarProps) => {
  // Accordéon single-open : un seul groupe ouvert à la fois
  const initialOpen = menuGroups.find(g => g.items.some(i => i.id === activeTab))?.label ?? menuGroups[0].label;
  const [openGroup, setOpenGroup] = useState<string | null>(initialOpen);

  if (!isOpen) return null;

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    if (window.innerWidth < 1024 && onClose) onClose();
  };

  const toggleGroup = (label: string) => {
    setOpenGroup(prev => (prev === label ? null : label));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-card border-r border-border flex flex-col z-40 lg:z-auto">
        <ScrollArea className="flex-1 p-4">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-4"
          >
            <Home className="h-5 w-5" />
            <span>Retour au portail</span>
          </Link>

          <nav className="space-y-4">
            {menuGroups.map((group) => {
              const isOpen = openGroup === group.label;
              const GroupIcon = (group as any).icon;
              const hasActive = group.items.some(i => i.id === activeTab);
              return (
                <div key={group.label} className={cn("rounded-lg border transition-colors", isOpen ? "border-primary/30 bg-muted/40" : "border-transparent")}>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                      hasActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {GroupIcon && <GroupIcon className="h-3.5 w-3.5" />}
                      {group.label}
                    </span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", !isOpen && "-rotate-90")} />
                  </button>
                  {isOpen && (
                    <div className="space-y-0.5 mt-1 px-1 pb-2">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="font-medium">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-card">
          <button
            onClick={() => handleTabClick('admin-guide')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              activeTab === 'admin-guide'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <BookOpen className="h-5 w-5" />
            <span className="font-medium text-sm">Guide Admin</span>
          </button>
        </div>
      </aside>
    </>
  );
};
