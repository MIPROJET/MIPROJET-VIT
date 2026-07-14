import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  LayoutDashboard, LogOut, Search, ChevronDown,
  Users, FolderKanban, FileText, Newspaper, Receipt, CreditCard,
  HelpCircle, ClipboardCheck, Sparkles, Megaphone, Building2,
  ShieldCheck, Settings, Wrench, BarChart3, Award, MessageSquareQuote,
  UserPlus, Mail, GraduationCap, Gift, Database, Handshake, RefreshCcw,
  Files, Briefcase, TrendingUp,
} from "lucide-react";
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
  group: string;
  accent: string; // tailwind classes for icon background
  render: () => JSX.Element;
};

const MODULES: ModuleDef[] = [
  // Vue d'ensemble
  {
    id: "overview",
    title: "Tableau de bord",
    description: "KPIs, statistiques et graphiques globaux de la plateforme.",
    icon: LayoutDashboard,
    group: "Vue d'ensemble",
    accent: "bg-primary/10 text-primary",
    render: () => (
      <div className="space-y-6">
        <AdminStats />
        <AdminKPICharts />
        <AdminCharts />
      </div>
    ),
  },
  // MiPROJET Invest
  {
    id: "projects",
    title: "MiPROJET Invest — Projets",
    description: "Gérer les projets publiés sur l'espace investisseurs.",
    icon: FolderKanban,
    group: "MiPROJET Invest",
    accent: "bg-emerald-100 text-emerald-700",
    render: () => <AdminProjectsTable />,
  },
  {
    id: "investor-prospects",
    title: "Prospects investisseurs",
    description: "Contacts et manifestations d'intérêt des investisseurs.",
    icon: Briefcase,
    group: "MiPROJET Invest",
    accent: "bg-emerald-100 text-emerald-700",
    render: () => <AdminInvestorProspects />,
  },
  {
    id: "opportunities",
    title: "Opportunités & Scraper",
    description: "Publier des opportunités et scanner le web (Firecrawl).",
    icon: Sparkles,
    group: "MiPROJET Invest",
    accent: "bg-emerald-100 text-emerald-700",
    render: () => (
      <div className="space-y-6">
        <AdminOpportunitiesManager />
        <div className="pt-4 border-t">
          <AdminFirecrawlScraper />
        </div>
      </div>
    ),
  },
  {
    id: "tenders",
    title: "Appels d'offres",
    description: "Import et gestion des appels d'offres (zone UEMOA).",
    icon: ClipboardCheck,
    group: "MiPROJET Invest",
    accent: "bg-emerald-100 text-emerald-700",
    render: () => <AdminTendersManager />,
  },
  {
    id: "tender-leads",
    title: "Leads appels d'offres",
    description: "Prospects intéressés par les appels d'offres.",
    icon: UserPlus,
    group: "MiPROJET Invest",
    accent: "bg-emerald-100 text-emerald-700",
    render: () => <AdminTenderLeadsManager />,
  },
  // MiPROJET+
  {
    id: "mp-sync",
    title: "Synchronisation MiPROJET+ ↔ Invest",
    description: "Publier les projets MiPROJET+ vers l'espace investisseurs.",
    icon: RefreshCcw,
    group: "MiPROJET+",
    accent: "bg-blue-100 text-blue-700",
    render: () => <AdminMPInvestSync />,
  },
  {
    id: "mp-overview",
    title: "MiPROJET+ — Projets & scores",
    description: "Vue complète des projets et scoring MiPROJET+.",
    icon: TrendingUp,
    group: "MiPROJET+",
    accent: "bg-blue-100 text-blue-700",
    render: () => <AdminMPOverview />,
  },
  {
    id: "mp-analytics",
    title: "MiPROJET+ — Analytics",
    description: "Analytique d'usage MiPROJET+.",
    icon: BarChart3,
    group: "MiPROJET+",
    accent: "bg-blue-100 text-blue-700",
    render: () => <AdminMPAnalytics />,
  },
  {
    id: "mp-certifications",
    title: "Certifications",
    description: "Gérer les certifications émises.",
    icon: Award,
    group: "MiPROJET+",
    accent: "bg-blue-100 text-blue-700",
    render: () => <AdminMPCertificationsManager />,
  },
  {
    id: "evaluations",
    title: "Évaluations projets",
    description: "Résultats de scoring et évaluations.",
    icon: ShieldCheck,
    group: "MiPROJET+",
    accent: "bg-blue-100 text-blue-700",
    render: () => <AdminEvaluationsManager />,
  },
  // Utilisateurs & CRM
  {
    id: "users",
    title: "Utilisateurs",
    description: "Comptes, rôles et abonnements.",
    icon: Users,
    group: "Utilisateurs & CRM",
    accent: "bg-purple-100 text-purple-700",
    render: () => <AdminUsersTable />,
  },
  {
    id: "leads",
    title: "Leads & prospects",
    description: "Formulaires, contacts et pipeline.",
    icon: UserPlus,
    group: "Utilisateurs & CRM",
    accent: "bg-purple-100 text-purple-700",
    render: () => <AdminLeadsManager />,
  },
  {
    id: "subscriptions",
    title: "Abonnements",
    description: "Plans, souscriptions et cycles.",
    icon: CreditCard,
    group: "Utilisateurs & CRM",
    accent: "bg-purple-100 text-purple-700",
    render: () => <AdminSubscriptionsManager />,
  },
  {
    id: "referrals",
    title: "Parrainages",
    description: "Programme de parrainage.",
    icon: Gift,
    group: "Utilisateurs & CRM",
    accent: "bg-purple-100 text-purple-700",
    render: () => <AdminReferralsManager />,
  },
  {
    id: "testimonials",
    title: "Témoignages",
    description: "Modérer les témoignages publiés.",
    icon: MessageSquareQuote,
    group: "Utilisateurs & CRM",
    accent: "bg-purple-100 text-purple-700",
    render: () => <AdminTestimonialsManager />,
  },
  // Demandes & services
  {
    id: "requests",
    title: "Demandes de services",
    description: "Structuration, accompagnement, accès projets.",
    icon: Handshake,
    group: "Demandes & services",
    accent: "bg-amber-100 text-amber-700",
    render: () => (
      <div className="space-y-8">
        <div>
          <h3 className="font-semibold mb-3">Demandes de services</h3>
          <AdminRequestsTable />
        </div>
        <div>
          <h3 className="font-semibold mb-3">Demandes d'accès</h3>
          <AdminAccessRequests />
        </div>
      </div>
    ),
  },
  // Facturation
  {
    id: "invoices",
    title: "Factures",
    description: "Liste, génération et suivi des envois.",
    icon: Receipt,
    group: "Facturation",
    accent: "bg-rose-100 text-rose-700",
    render: () => (
      <div className="space-y-8">
        <AdminInvoicesTable />
        <div className="pt-4 border-t">
          <SmartInvoiceGenerator />
        </div>
        <div className="pt-4 border-t">
          <AdminInvoiceSendLog />
        </div>
      </div>
    ),
  },
  {
    id: "payments",
    title: "Paiements",
    description: "Journal des paiements reçus.",
    icon: CreditCard,
    group: "Facturation",
    accent: "bg-rose-100 text-rose-700",
    render: () => <AdminPaymentsJournal />,
  },
  // Contenu
  {
    id: "news",
    title: "Actualités",
    description: "Créer et publier des articles.",
    icon: Newspaper,
    group: "Contenu",
    accent: "bg-cyan-100 text-cyan-700",
    render: () => <AdminNewsManager />,
  },
  {
    id: "faq",
    title: "FAQ",
    description: "Foire aux questions.",
    icon: HelpCircle,
    group: "Contenu",
    accent: "bg-cyan-100 text-cyan-700",
    render: () => <AdminFAQManager />,
  },
  {
    id: "documents",
    title: "Documents plateforme",
    description: "Documents publics et internes.",
    icon: Files,
    group: "Contenu",
    accent: "bg-cyan-100 text-cyan-700",
    render: () => <AdminDocumentsManager />,
  },
  // Communication
  {
    id: "emails",
    title: "Emailing & campagnes",
    description: "Campagnes, templates et journal des envois.",
    icon: Mail,
    group: "Communication",
    accent: "bg-indigo-100 text-indigo-700",
    render: () => <AdminEmailMarketing />,
  },
  // Système
  {
    id: "settings",
    title: "Paramètres",
    description: "Configuration générale de la plateforme.",
    icon: Settings,
    group: "Système",
    accent: "bg-slate-100 text-slate-700",
    render: () => <AdminSettingsManager />,
  },
  {
    id: "database",
    title: "Base de données & sauvegardes",
    description: "Backups, exports, entretien.",
    icon: Database,
    group: "Système",
    accent: "bg-slate-100 text-slate-700",
    render: () => <AdminDatabaseManager />,
  },
  {
    id: "maintenance",
    title: "Maintenance",
    description: "Tâches et journaux de maintenance.",
    icon: Wrench,
    group: "Système",
    accent: "bg-slate-100 text-slate-700",
    render: () => <AdminMaintenanceManager />,
  },
  {
    id: "admin-guide",
    title: "Guide administrateur",
    description: "Documentation interne.",
    icon: GraduationCap,
    group: "Système",
    accent: "bg-slate-100 text-slate-700",
    render: () => <AdminGuide />,
  },
];

const GROUPS = Array.from(new Set(MODULES.map((m) => m.group)));

const AdminDashboard = () => {
  const { user, isAdmin, loading, adminChecked, signOut } = useAuth();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>("overview");
  const [q, setQ] = useState("");

  useEffect(() => {
    document.title = "Administration | MIPROJET";
  }, []);

  useEffect(() => {
    if (!loading && adminChecked) {
      if (!user) navigate("/auth");
      else if (!isAdmin) navigate("/dashboard");
    }
  }, [loading, adminChecked, user, isAdmin, navigate]);

  const filtered = useMemo(() => {
    if (!q.trim()) return MODULES;
    const s = q.toLowerCase();
    return MODULES.filter(
      (m) =>
        m.title.toLowerCase().includes(s) ||
        m.description.toLowerCase().includes(s) ||
        m.group.toLowerCase().includes(s)
    );
  }, [q]);

  const grouped = useMemo(() => {
    const map: Record<string, ModuleDef[]> = {};
    for (const g of GROUPS) map[g] = [];
    for (const m of filtered) map[m.group].push(m);
    return map;
  }, [filtered]);

  if (loading || !adminChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  return (
    <div className="min-h-screen bg-muted/30">
      <header
        className="sticky top-0 h-16 border-b border-white/10 z-40 flex items-center px-3 sm:px-6 text-white shadow-elegant"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-white shrink-0" />
          <span className="font-bold text-base sm:text-xl truncate">MIPROJET Admin</span>
        </div>

        <div className="hidden md:block flex-1 max-w-md mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un module…"
              className="pl-10 bg-white/15 border-white/20 text-white placeholder:text-white/70 focus-visible:ring-white/40"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          <NotificationBell />
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs sm:text-sm font-medium text-white truncate max-w-[160px]">{user?.email}</p>
              <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0">Admin</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-white hover:bg-white/10">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
        <div className="md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un module…"
              className="pl-10"
            />
          </div>
        </div>

        {GROUPS.map((group) => {
          const items = grouped[group];
          if (!items || items.length === 0) return null;
          return (
            <section key={group} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {group}
                </h2>
                <span className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((m) => {
                  const open = openId === m.id;
                  const Icon = m.icon;
                  return (
                    <Card
                      key={m.id}
                      className={`transition-all cursor-pointer hover:shadow-md ${
                        open ? "ring-2 ring-primary shadow-lg lg:col-span-3 md:col-span-2" : ""
                      }`}
                      onClick={() => !open && toggle(m.id)}
                    >
                      <CardHeader
                        className="flex flex-row items-start gap-3 space-y-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(m.id);
                        }}
                      >
                        <div className={`p-2.5 rounded-lg ${m.accent} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center justify-between gap-2">
                            <span className="truncate">{m.title}</span>
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                                open ? "rotate-180" : ""
                              }`}
                            />
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {m.description}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      {open && (
                        <CardContent className="border-t pt-6" onClick={(e) => e.stopPropagation()}>
                          {m.render()}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            Aucun module ne correspond à « {q} ».
          </p>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
