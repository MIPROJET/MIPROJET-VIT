import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PaymentModal } from "@/components/PaymentModal";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Calendar, Users, Target, TrendingUp, Share2, Heart,
  MessageCircle, FileText, Clock, Shield, Award, ArrowLeft, Hash,
  ClipboardList, BarChart3, CheckCircle, AlertTriangle, ArrowRight, Globe, Image as ImageIcon
} from "lucide-react";
import { formatProjectDisplayId } from "@/lib/projectId";
import { InvestorInterestDialog } from "@/components/projects/InvestorInterestDialog";
import { interpretScore, getMaturityLevel, EVALUATION_AXES } from "@/lib/evaluation";
import { ScoreBadge } from "@/components/projects/ScoreBadge";
import { MarkdownView } from "@/components/ui/markdown-view";

interface TeamMember { id: string; full_name: string; role_title: string; bio?: string | null; photo_url?: string | null; display_order?: number | null; }

interface Project {
  id: string;
  display_id?: string | null;
  title: string;
  description: string;
  category: string;
  sector?: string | null;
  country: string;
  city: string;
  funding_goal: number;
  funds_raised: number;
  status: string;
  risk_score: string;
  created_at: string;
  owner_id: string;
  fonds_disponibles?: string | null;
  documents?: any;
  image_url?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  public_summary?: string | null;
  expected_roi?: number | null;
  amount_requested?: number | null;
  currency?: string | null;
  mp_score?: number | null;
  recommendation_level?: string | null;
  website_url?: string | null;
  gallery_urls?: string[] | null;
  cover_url_mobile?: string | null;
  tagline?: string | null;
}

interface Evaluation {
  id: string;
  score_global: number;
  score_juridique?: number;
  score_financier?: number;
  score_technique?: number;
  score_marche?: number;
  score_impact?: number;
  niveau?: string | null;
  niveau_maturite?: number | null;
  interpretation?: string | null;
  resume?: string | null;
  forces?: string[] | null;
  faiblesses?: string[] | null;
  recommandations?: string[] | null;
  prochaines_etapes?: string[] | null;
  parcours_recommande?: string | null;
  answers?: Record<string, any> | null;
  created_at: string;
}

interface ProjectUpdate {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [contributorsCount, setContributorsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchUpdates();
      fetchContributors();
      fetchEvaluation();
      fetchTeam();
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, [id]);

  const fetchTeam = async () => {
    try {
      const { data } = await (supabase as any)
        .from("project_team").select("*").eq("project_id", id).order("display_order", { ascending: true });
      setTeam(data || []);
    } catch (e) { console.error("team fetch", e); }
  };

  const fetchProject = async () => {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");
      let data: any = null;
      if (isUuid) {
        const r = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
        data = r.data;
      } else {
        // Resolve by short_slug first, then by title slug fallback
        const r1 = await supabase.from("projects").select("*").eq("short_slug", id).maybeSingle();
        data = r1.data;
        if (!data) {
          // Fallback: scan published projects and match slugified title
          const { data: list } = await supabase
            .from("projects")
            .select("*")
            .eq("is_public", true)
            .eq("status", "published")
            .limit(500);
          const target = (id || "").toLowerCase();
          data = (list || []).find((p: any) => {
            const s = (p.title || "")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");
            return s === target || s.startsWith(target);
          }) || null;
        }
      }
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le projet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUpdates = async () => {
    try {
      const { data } = await (supabase
        .from('project_updates')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false }) as any);

      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const fetchEvaluation = async () => {
    try {
      const { data } = await (supabase
        .from("project_evaluations")
        .select("*")
        .eq("project_id", id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);
      if (data) setEvaluation(data);
    } catch (e) {
      console.error("Eval fetch error", e);
    }
  };

  const fetchContributors = async () => {
    try {
      const { count } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id);

      setContributorsCount(count || 0);
    } catch (error) {
      console.error('Error fetching contributors:', error);
    }
  };

  const handleInvest = () => {
    if (!user) {
      toast({
        title: t('auth.required'),
        description: t('auth.loginToInvest') || "Connectez-vous pour investir",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    setShowPaymentModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-28 md:pt-32 pb-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('projects.notFound') || "Projet non trouvé"}</h1>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back') || "Retour aux projets"}
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const progressPercent = project.funding_goal > 0 
    ? Math.min((project.funds_raised / project.funding_goal) * 100, 100) 
    : 0;
  
  const daysRemaining = 30; // Placeholder - would be calculated from deadline

  const riskColors: Record<string, string> = {
    'A': 'bg-success text-success-foreground',
    'B': 'bg-warning text-warning-foreground',
    'C': 'bg-destructive text-destructive-foreground',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-28 md:pt-32 pb-16">
        {/* Hero Section */}
        <section className="bg-gradient-hero py-12">
          <div className="container mx-auto px-4">
            <Button 
              variant="ghost" 
              className="text-primary-foreground mb-4"
              onClick={() => navigate('/projects')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back') || "Retour"}
            </Button>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <div className="flex flex-wrap gap-2 mb-4 items-center">
                  {project.logo_url && (
                    <div className="h-14 w-14 rounded-xl bg-white p-1.5 ring-2 ring-white/40 shadow-lg mr-1">
                      <img src={project.logo_url} alt={project.title} className="h-full w-full object-contain" />
                    </div>
                  )}
                  <Badge variant="secondary" className="font-mono">
                    <Hash className="h-3 w-3 mr-1" />
                    {formatProjectDisplayId(project.display_id, project.id)}
                  </Badge>
                  {(project.sector || project.category) && (
                    <Badge variant="secondary">{project.sector || project.category}</Badge>
                  )}
                  {project.mp_score != null && (
                    <ScoreBadge score={project.mp_score} size="md" />
                  )}
                  <Badge variant="outline" className="text-primary-foreground border-primary-foreground/30">
                    <Shield className="h-3 w-3 mr-1" />
                    {t('projects.verified') || "Vérifié MIPROJET"}
                  </Badge>
                </div>
                
                <h1 className="text-4xl font-bold text-primary-foreground mb-4">{project.title}</h1>
                
                <p className="text-primary-foreground/90 text-lg mb-4 max-w-2xl">
                  {project.public_summary || project.description?.slice(0, 220)}
                </p>

                <div className="flex items-center gap-4 text-primary-foreground/80 mb-6 flex-wrap text-sm">
                  {(project.city || project.country) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {[project.city, project.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                  {project.expected_roi != null && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" /> ROI ~{project.expected_roi}%
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <InvestorInterestDialog projectId={project.id} projectTitle={project.title} />
                  {project.website_url && (
                    <Button asChild variant="outline" size="lg" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
                      <a href={project.website_url} target="_blank" rel="noopener noreferrer">
                        <Globe className="mr-2 h-4 w-4" />
                        Site officiel
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="lg" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                    <Share2 className="mr-2 h-4 w-4" />
                    {t('common.share') || "Partager"}
                  </Button>
                </div>
              </div>

              {/* Cover / Funding Card */}
              <Card className="bg-card/95 backdrop-blur overflow-hidden">
                {(project.cover_url || project.cover_url_mobile || project.image_url) && (
                  <div className="w-full overflow-hidden bg-muted">
                    <picture>
                      {project.cover_url_mobile && (
                        <source media="(max-width: 767px)" srcSet={project.cover_url_mobile} />
                      )}
                      <img
                        src={project.cover_url || project.image_url || project.cover_url_mobile!}
                        alt={project.title}
                        className="w-full h-auto object-cover max-h-72 md:max-h-80"
                      />
                    </picture>
                  </div>
                )}
                <CardContent className="pt-6">
                  {project.amount_requested != null ? (
                    <div className="text-center mb-6">
                      <p className="text-4xl font-bold text-primary">
                        {Number(project.amount_requested).toLocaleString()} {project.currency || "FCFA"}
                      </p>
                      <p className="text-muted-foreground">Montant recherché</p>
                    </div>
                  ) : (
                    <div className="text-center mb-6">
                      <p className="text-2xl font-bold text-primary">Sur demande</p>
                      <p className="text-muted-foreground">Montant communiqué aux investisseurs qualifiés</p>
                    </div>
                  )}


                  <Progress value={progressPercent} className="h-3 mb-4" />

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{progressPercent.toFixed(0)}%</p>
                      <p className="text-sm text-muted-foreground">{t('projects.funded') || "Financé"}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{contributorsCount}</p>
                      <p className="text-sm text-muted-foreground">{t('projects.investors') || "Investisseurs"}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{daysRemaining}</p>
                      <p className="text-sm text-muted-foreground">{t('projects.daysLeft') || "Jours restants"}</p>
                    </div>
                  </div>

                  <Button className="w-full mt-6" size="lg" onClick={handleInvest}>
                    {t('projects.investNow') || "Investir maintenant"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="description" className="max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="gallery">Galerie</TabsTrigger>
                <TabsTrigger value="evaluation">Évaluation</TabsTrigger>
                <TabsTrigger value="details">Données</TabsTrigger>
                <TabsTrigger value="updates">Actualités</TabsTrigger>
                <TabsTrigger value="team">Équipe</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-6">
                <Card>
                  <CardContent className="pt-6">
                    <MarkdownView>{project.description}</MarkdownView>
                    <div className="mt-8 flex flex-wrap gap-3 pt-6 border-t">
                      <InvestorInterestDialog projectId={project.id} projectTitle={project.title} />
                      {project.website_url && (
                        <Button asChild variant="outline" size="lg">
                          <a href={project.website_url} target="_blank" rel="noopener noreferrer">
                            <Globe className="mr-2 h-4 w-4" /> Site officiel
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="gallery" className="mt-6">
                {project.gallery_urls && project.gallery_urls.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {project.gallery_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-[4/3] overflow-hidden rounded-lg group bg-muted">
                        <img src={url} alt={`${project.title} — visuel ${i + 1}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucun visuel disponible pour le moment.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>



              {/* MODULE 8 — Évaluation avec interprétation auto */}
              <TabsContent value="evaluation" className="mt-6">
                {evaluation ? (
                  <div className="space-y-4">
                    {(() => {
                      const interp = interpretScore(evaluation.score_global);
                      const maturity = getMaturityLevel(evaluation.niveau_maturite);
                      return (
                        <>
                          <Card className={`border-2 border-${interp.color}`}>
                            <CardHeader>
                              <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                  <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Score Global : {evaluation.score_global}/100
                                  </CardTitle>
                                  <CardDescription className={interp.textClass + " font-semibold mt-1"}>
                                    {interp.label}
                                  </CardDescription>
                                </div>
                                <Badge className={`${interp.bgClass} text-white text-base py-2 px-4`}>
                                  {interp.shortLabel}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <Progress value={evaluation.score_global} className="h-3" />
                              <p className="text-sm text-muted-foreground">{interp.description}</p>
                              {maturity && (
                                <div className="bg-muted/50 rounded-lg p-3">
                                  <p className="text-xs uppercase text-muted-foreground">Niveau de maturité</p>
                                  <p className="font-semibold">Niveau {maturity.level} — {maturity.label}</p>
                                  <p className="text-sm text-muted-foreground">{maturity.description}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader><CardTitle className="text-lg">Détail par axe (100 pts)</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                              {EVALUATION_AXES.map((axe) => {
                                const score = (evaluation as any)[`score_${axe.key}`] ?? 0;
                                const pct = (score / axe.max) * 100;
                                return (
                                  <div key={axe.key}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span>{axe.label}</span>
                                      <span className="font-semibold">{score}/{axe.max}</span>
                                    </div>
                                    <Progress value={pct} className="h-2" />
                                  </div>
                                );
                              })}
                            </CardContent>
                          </Card>

                          {(evaluation.forces?.length || evaluation.faiblesses?.length) && (
                            <div className="grid md:grid-cols-2 gap-4">
                              {evaluation.forces && evaluation.forces.length > 0 && (
                                <Card>
                                  <CardHeader><CardTitle className="text-base text-emerald-600 flex items-center gap-2"><CheckCircle className="h-4 w-4" />Points forts</CardTitle></CardHeader>
                                  <CardContent><ul className="space-y-2 text-sm">{evaluation.forces.map((f, i) => <li key={i} className="flex gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /><span>{f}</span></li>)}</ul></CardContent>
                                </Card>
                              )}
                              {evaluation.faiblesses && evaluation.faiblesses.length > 0 && (
                                <Card>
                                  <CardHeader><CardTitle className="text-base text-amber-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Points à améliorer</CardTitle></CardHeader>
                                  <CardContent><ul className="space-y-2 text-sm">{evaluation.faiblesses.map((f, i) => <li key={i} className="flex gap-2"><AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /><span>{f}</span></li>)}</ul></CardContent>
                                </Card>
                              )}
                            </div>
                          )}

                          {evaluation.prochaines_etapes && evaluation.prochaines_etapes.length > 0 && (
                            <Card>
                              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowRight className="h-4 w-4" />Prochaines étapes</CardTitle></CardHeader>
                              <CardContent><ol className="space-y-2 text-sm list-decimal list-inside">{evaluation.prochaines_etapes.map((s, i) => <li key={i}>{s}</li>)}</ol></CardContent>
                            </Card>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucune évaluation disponible pour ce projet.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* MODULE 1 — Onglet Données d'évaluation détaillées (100% des données) */}
              <TabsContent value="details" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Données d'évaluation détaillées</CardTitle>
                    <CardDescription>Toutes les réponses et données saisies pour ce projet (mode lecture complète).</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div><p className="text-muted-foreground text-xs">ID Projet</p><p className="font-mono font-semibold">{formatProjectDisplayId(project.display_id, project.id)}</p></div>
                      <div><p className="text-muted-foreground text-xs">Titre</p><p className="font-medium">{project.title}</p></div>
                      <div><p className="text-muted-foreground text-xs">Catégorie</p><p>{project.category || "—"}</p></div>
                      <div><p className="text-muted-foreground text-xs">Secteur</p><p>{project.sector || "—"}</p></div>
                      <div><p className="text-muted-foreground text-xs">Pays</p><p>{project.country || "—"}</p></div>
                      <div><p className="text-muted-foreground text-xs">Ville</p><p>{project.city || "—"}</p></div>
                      <div><p className="text-muted-foreground text-xs">Objectif de financement</p><p>{project.funding_goal?.toLocaleString() || 0} FCFA</p></div>
                      <div><p className="text-muted-foreground text-xs">Fonds levés</p><p>{project.funds_raised?.toLocaleString() || 0} FCFA</p></div>
                      <div><p className="text-muted-foreground text-xs">Fonds disponibles porteur</p><p>{project.fonds_disponibles || "—"}</p></div>
                      <div><p className="text-muted-foreground text-xs">Statut</p><p>{project.status}</p></div>
                      <div><p className="text-muted-foreground text-xs">Score risque</p><p>{project.risk_score || "—"}</p></div>
                      <div><p className="text-muted-foreground text-xs">Date création</p><p>{new Date(project.created_at).toLocaleString('fr-FR')}</p></div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Description complète</p>
                      <div className="bg-muted/30 rounded p-3 whitespace-pre-wrap">{project.description || "—"}</div>
                    </div>
                    {evaluation?.answers && Object.keys(evaluation.answers).length > 0 && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-2 mt-4">Réponses détaillées d'évaluation ({Object.keys(evaluation.answers).length} réponses)</p>
                        <div className="bg-muted/30 rounded p-3 space-y-2">
                          {Object.entries(evaluation.answers).map(([k, v]) => (
                            <div key={k} className="border-b border-border/50 pb-2 last:border-0">
                              <p className="font-medium text-xs text-muted-foreground">{k}</p>
                              <p className="break-words">{typeof v === "object" ? JSON.stringify(v) : String(v)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {project.documents && Array.isArray(project.documents) && project.documents.length > 0 && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-2 mt-4">Documents joints ({project.documents.length})</p>
                        <ul className="space-y-1">
                          {project.documents.map((d: any, i: number) => (
                            <li key={i} className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>{d.name || d.title || `Document ${i + 1}`}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="updates" className="mt-6 space-y-4">
                {updates.length > 0 ? (
                  updates.map((update) => (
                    <Card key={update.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <CardTitle className="text-lg">{update.title}</CardTitle>
                          <span className="text-sm text-muted-foreground">{new Date(update.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <MarkdownView>{update.content}</MarkdownView>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucune actualité pour le moment</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="team" className="mt-6">
                {team.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {team.map((m) => (
                      <Card key={m.id}>
                        <CardContent className="pt-6 flex gap-4">
                          <Avatar className="h-14 w-14">
                            {m.photo_url && <AvatarImage src={m.photo_url} alt={m.full_name} />}
                            <AvatarFallback>{m.full_name.split(" ").map(x=>x[0]).join("").slice(0,2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{m.full_name}</p>
                            <p className="text-sm text-primary font-medium">{m.role_title}</p>
                            {m.bio && <p className="text-sm text-muted-foreground mt-2">{m.bio}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Informations sur l'équipe bientôt disponibles</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <Card>
                  <CardContent className="pt-8 pb-8 text-center space-y-5">
                    <FileText className="h-14 w-14 mx-auto text-primary" />
                    <div className="space-y-2 max-w-2xl mx-auto">
                      <h3 className="text-xl font-bold">Documents confidentiels — accès qualifié</h3>
                      <p className="text-muted-foreground">
                        L'Information Memorandum et les documents stratégiques détaillés (modèle économique, projections, structure du capital) sont transmis <strong>après un premier échange stratégique de qualification</strong>.
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-4 max-w-md mx-auto text-sm">
                      <p>📩 <a href="mailto:invest@ivoireprojet.com" className="font-semibold text-primary">invest@ivoireprojet.com</a></p>
                      <p className="mt-1">📞 +225 07 07 16 79 21 · +225 05 05 23 30 05</p>
                    </div>
                    <div className="pt-2">
                      <InvestorInterestDialog projectId={project.id} projectTitle={project.title} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />

      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          projectId={project.id}
          projectTitle={project.title}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
