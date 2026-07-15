import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, LogOut, Search, ChevronDown,
  Users, FolderKanban, Newspaper, Receipt, CreditCard,
  HelpCircle, ClipboardCheck, Sparkles, Building2,
  ShieldCheck, Settings, Wrench, BarChart3, Award, MessageSquareQuote,
  UserPlus, Mail, GraduationCap, Gift, Database, Handshake, RefreshCcw,
  Files, Briefcase, TrendingUp,
} from "lucide-react";
import mpLogo from "@/assets/logos/miprojet.png";
import mpGoLogo from "@/assets/logos/miprojet-go.png";
import mpPlusLogo from "@/assets/logos/miprojet-plus.png";
import mpInvestLogo from "@/assets/logos/miprojet-invest.png";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminProjectsTable } from "@/components/admin/AdminProjectsTable";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { AdminCharts } from "@/components/admin/AdminCharts";
import { AdminRequestsTable } from "@/components/admin/AdminRequestsTable";
import { AdminKPICharts } from "@/components/admin/AdminKPICharts";
import { AdminNewsManager } from "@/components/admin/AdminNewsManager";
import { AdminFAQManager } from "@/components/admin/AdminFAQManager";
import { AdminPaymentsJournal } from "@/components/admin/AdminPaymentsJournal";
import { AdminInvoicesTable } from "@/components/admin/AdminInvoicesTable";
import { AdminInvoiceSendLog } from "@/components/admin/AdminInvoiceSendLog";
import { AdminGuide } from "@/components/admin/AdminGuide";
import { AdminAccessRequests } from "@/components/admin/AdminAccessRequests";
import { AdminDatabaseManager } from "@/components/admin/AdminDatabaseManager";
import { AdminEvaluationsManager } from "@/components/admin/AdminEvaluationsManager";
import { SmartInvoiceGenerator } from "@/components/admin/SmartInvoiceGenerator";
import { AdminReferralsManager } from "@/components/admin/AdminReferralsManager";
import { AdminSettingsManager } from "@/components/admin/AdminSettingsManager";
import { AdminOpportunitiesManager } from "@/components/admin/AdminOpportunitiesManager";
import { AdminSubscriptionsManager } from "@/components/admin/AdminSubscriptionsManager";
import { AdminEmailMarketing } from "@/components/admin/AdminEmailMarketing";
import { AdminLeadsManager } from "@/components/admin/AdminLeadsManager";
import { AdminDocumentsManager } from "@/components/admin/AdminDocumentsManager";
import { AdminFirecrawlScraper } from "@/components/admin/AdminFirecrawlScraper";
import { AdminMPOverview } from "@/components/admin/AdminMPOverview";
import { AdminMPCertificationsManager } from "@/components/admin/AdminMPCertificationsManager";
import { AdminMPAnalytics } from "@/components/admin/AdminMPAnalytics";
import { AdminMaintenanceManager } from "@/components/admin/AdminMaintenanceManager";
import { AdminTendersManager } from "@/components/admin/AdminTendersManager";
import { AdminTenderLeadsManager } from "@/components/admin/AdminTenderLeadsManager";
import { AdminTestimonialsManager } from "@/components/admin/AdminTestimonialsManager";
import { AdminInvestorProspects } from "@/components/admin/AdminInvestorProspects";
import { AdminMPInvestSync } from "@/components/admin/AdminMPInvestSync";

type ModuleDef = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  render: () => JSX.Element;
};

type GroupDef = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  logo?: string;
  modules: ModuleDef[];
};

const GROUPS: GroupDef[] = [
  {
    id: "overview",
    label: "Vue d'ensemble",
    logo: mpLogo,
    modules: [
      {
        id: "overview",
        title: "Tableau de bord",
        description: "KPIs, statistiques et graphiques globaux.",
        icon: LayoutDashboard,
        render: () => (
          <div className="space-y-6">
            <AdminStats />
            <AdminKPICharts />
            <AdminCharts />
          </div>
        ),
      },
    ],
  },
  {
    id: "mp-go",
    label: "MiPROJET Go",
    logo: mpGoLogo,
    modules: [
      { id: "users", title: "Utilisateurs", description: "Comptes, rôles et abonnements.", icon: Users, render: () => <AdminUsersTable /> },
      { id: "subscriptions", title: "Abonnements", description: "Plans, souscriptions et cycles.", icon: CreditCard, render: () => <AdminSubscriptionsManager /> },
      { id: "referrals", title: "Parrainages", description: "Programme de parrainage.", icon: Gift, render: () => <AdminReferralsManager /> },
    ],
  },
  {
    id: "mp-plus",
    label: "MiPROJET+",
    logo: mpPlusLogo,
    modules: [
      { id: "mp-overview", title: "Projets & scores", description: "Vue complète MiPROJET+.", icon: TrendingUp, render: () => <AdminMPOverview /> },
      { id: "mp-analytics", title: "Analytiques", description: "Analytique d'usage MiPROJET+.", icon: BarChart3, render: () => <AdminMPAnalytics /> },
      { id: "mp-certifications", title: "Certifications", description: "Gérer les certifications émises.", icon: Award, render: () => <AdminMPCertificationsManager /> },
      { id: "evaluations", title: "Évaluations", description: "Résultats de scoring et évaluations.", icon: ShieldCheck, render: () => <AdminEvaluationsManager /> },
      {
        id: "requests",
        title: "Demandes de services",
        description: "Structuration, accompagnement, accès projets.",
        icon: Handshake,
        render: () => (
          <div className="space-y-8">
            <div><h3 className="font-semibold mb-3">Demandes de services</h3><AdminRequestsTable /></div>
            <div><h3 className="font-semibold mb-3">Demandes d'accès</h3><AdminAccessRequests /></div>
          </div>
        ),
      },
    ],
  },
  {
    id: "mp-invest",
    label: "MiPROJET Invest",
    logo: mpInvestLogo,
    modules: [
      { id: "mp-sync", title: "Synchronisation MP+ ↔ Invest", description: "Publier les projets MiPROJET+ vers Invest.", icon: RefreshCcw, render: () => <AdminMPInvestSync /> },
      { id: "projects", title: "Projets publiés", description: "Gérer les projets Invest.", icon: FolderKanban, render: () => <AdminProjectsTable /> },
      { id: "investor-prospects", title: "Prospects investisseurs", description: "Contacts et manifestations d'intérêt.", icon: Briefcase, render: () => <AdminInvestorProspects /> },
      {
        id: "opportunities",
        title: "Opportunités & Scraper",
        description: "Publier des opportunités et scanner le web.",
        icon: Sparkles,
        render: () => (
          <div className="space-y-6">
            <AdminOpportunitiesManager />
            <div className="pt-4 border-t"><AdminFirecrawlScraper /></div>
          </div>
        ),
      },
      { id: "tenders", title: "Appels d'offres", description: "Import massif et gestion des AO.", icon: ClipboardCheck, render: () => <AdminTendersManager /> },
      { id: "tender-leads", title: "Leads AO", description: "Prospects intéressés par les AO.", icon: UserPlus, render: () => <AdminTenderLeadsManager /> },
    ],
  },
  {
    id: "crm",
    label: "CRM & Communication",
    icon: Mail,
    modules: [
      { id: "leads", title: "Leads & prospects", description: "Formulaires, contacts et pipeline.", icon: UserPlus, render: () => <AdminLeadsManager /> },
      { id: "emails", title: "Emailing & campagnes", description: "Campagnes, templates et journal.", icon: Mail, render: () => <AdminEmailMarketing /> },
      { id: "testimonials", title: "Témoignages", description: "Modérer les témoignages publiés.", icon: MessageSquareQuote, render: () => <AdminTestimonialsManager /> },
    ],
  },
  {
    id: "content",
    label: "Contenu",
    icon: Newspaper,
    modules: [
      { id: "news", title: "Actualités", description: "Créer et publier des articles.", icon: Newspaper, render: () => <AdminNewsManager /> },
      { id: "faq", title: "FAQ", description: "Foire aux questions.", icon: HelpCircle, render: () => <AdminFAQManager /> },
      { id: "documents", title: "Documents plateforme", description: "Documents publics et internes.", icon: Files, render: () => <AdminDocumentsManager /> },
    ],
  },
  {
    id: "finance",
    label: "Facturation",
    icon: Receipt,
    modules: [
      {
        id: "invoices", title: "Factures", description: "Liste, génération et suivi.", icon: Receipt,
        render: () => (
          <div className="space-y-8">
            <AdminInvoicesTable />
            <div className="pt-4 border-t"><SmartInvoiceGenerator /></div>
            <div className="pt-4 border-t"><AdminInvoiceSendLog /></div>
          </div>
        ),
      },
      { id: "payments", title: "Paiements", description: "Journal des paiements reçus.", icon: CreditCard, render: () => <AdminPaymentsJournal /> },
    ],
  },
  {
    id: "system",
    label: "Système",
    icon: Settings,
    modules: [
      { id: "settings", title: "Paramètres", description: "Configuration générale.", icon: Settings, render: () => <AdminSettingsManager /> },
      { id: "database", title: "Base de données", description: "Backups, exports, entretien.", icon: Database, render: () => <AdminDatabaseManager /> },
      { id: "maintenance", title: "Maintenance", description: "Tâches et journaux.", icon: Wrench, render: () => <AdminMaintenanceManager /> },
      { id: "admin-guide", title: "Guide administrateur", description: "Documentation interne.", icon: GraduationCap, render: () => <AdminGuide /> },
    ],
  },
];

const ALL_MODULES = GROUPS.flatMap((g) => g.modules.map((m) => ({ ...m, groupId: g.id, groupLabel: g.label })));

const AdminDashboard = () => {
  const { user, isAdmin, loading, adminChecked, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string>("overview");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Administration | MIPROJET";
  }, []);

  useEffect(() => {
    if (!loading && adminChecked) {
      if (!user) navigate("/auth");
      else if (!isAdmin) navigate("/dashboard");
    }
  }, [loading, adminChecked, user, isAdmin, navigate]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const activeModule = useMemo(
    () => ALL_MODULES.find((m) => m.id === activeId) || ALL_MODULES[0],
    [activeId]
  );

  const searchResults = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.toLowerCase();
    return ALL_MODULES.filter(
      (m) => m.title.toLowerCase().includes(s) || m.description.toLowerCase().includes(s) || m.groupLabel.toLowerCase().includes(s)
    ).slice(0, 8);
  }, [q]);

  if (loading || !adminChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  const selectModule = (id: string) => {
    setActiveId(id);
    setOpenGroup(null);
    setQ("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top brand bar */}
      <header
        className="sticky top-0 z-50 text-white shadow-elegant"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="h-14 px-3 sm:px-6 flex items-center gap-4 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <img src={mpLogo} alt="MIPROJET" className="h-8 w-8 rounded bg-white/10 p-1 object-contain" />
            <span className="font-bold text-base sm:text-lg truncate">MIPROJET Admin</span>
          </div>

          <div className="hidden md:block flex-1 max-w-md mx-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un module…"
              className="pl-10 bg-white/15 border-white/20 text-white placeholder:text-white/70 focus-visible:ring-white/40"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover text-popover-foreground border rounded-lg shadow-lg overflow-hidden">
                {searchResults.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => selectModule(m.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted text-sm"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.groupLabel}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <NotificationBell />
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium truncate max-w-[160px]">{user?.email}</p>
              <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0">Admin</Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-white hover:bg-white/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Horizontal group nav */}
        <nav ref={menuRef} className="px-3 sm:px-6 h-12 flex items-center gap-1 overflow-x-auto scrollbar-thin">
          {GROUPS.map((g) => {
            const GIcon = g.icon;
            const isActiveGroup = g.modules.some((m) => m.id === activeId);
            const isOpen = openGroup === g.id;
            return (
              <div key={g.id} className="relative shrink-0">
                <button
                  onClick={() => {
                    if (g.modules.length === 1) selectModule(g.modules[0].id);
                    else setOpenGroup(isOpen ? null : g.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                    isActiveGroup ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10"
                  )}
                >
                  {g.logo ? (
                    <img src={g.logo} alt="" className="h-5 w-5 object-contain rounded bg-white/90 p-0.5" />
                  ) : GIcon ? (
                    <GIcon className="h-4 w-4" />
                  ) : null}
                  <span>{g.label}</span>
                  {g.modules.length > 1 && (
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                  )}
                </button>
                {isOpen && g.modules.length > 1 && (
                  <div className="absolute top-full left-0 mt-1 min-w-[260px] bg-popover text-popover-foreground border rounded-lg shadow-xl overflow-hidden z-50">
                    {g.modules.map((m) => {
                      const Icon = m.icon;
                      const isSel = m.id === activeId;
                      return (
                        <button
                          key={m.id}
                          onClick={() => selectModule(m.id)}
                          className={cn(
                            "w-full flex items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors",
                            isSel && "bg-primary/10 text-primary"
                          )}
                        >
                          <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{m.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{m.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {isOpen && g.modules.length === 1 && selectModule(g.modules[0].id) as any}
              </div>
            );
          })}
        </nav>
      </header>

      {/* Mobile search */}
      <div className="md:hidden px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-10" />
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 border rounded-lg bg-card overflow-hidden">
            {searchResults.map((m) => {
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => selectModule(m.id)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{m.title}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{m.groupLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Breadcrumb + module content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>{activeModule.groupLabel}</span>
          <span>/</span>
          <span className="font-medium text-foreground">{activeModule.title}</span>
        </div>
        <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
          {activeModule.render()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
