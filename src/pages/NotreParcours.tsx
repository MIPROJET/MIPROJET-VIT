import { useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Mic, Rocket, Globe2, Handshake, Sparkles, Calendar,
  Building2, Users, Target, Lightbulb, Award, TrendingUp,
} from "lucide-react";

function setMeta(title: string, description: string) {
  document.title = title;
  let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
  meta.content = description;
}

type Milestone = {
  date: string;
  title: string;
  description: string;
  icon: any;
  tone: "primary" | "secondary" | "success" | "accent";
  upcoming?: boolean;
};

const milestones: Milestone[] = [
  {
    date: "2024",
    title: "Genèse — Mako Ivoire Projet SARL",
    description:
      "Création de la société Mako Ivoire Projet (MIPROJET) par une équipe pluridisciplinaire d'ingénieurs en gestion de projets, en structuration d'entreprise et en développement informatique. Une réponse concrète à un constat partagé : l'Afrique ne manque pas d'idées, mais de structuration, de données fiables et de mécanismes de crédibilité.",
    icon: Building2,
    tone: "primary",
  },
  {
    date: "Conférence de presse — 2025",
    title: "Lancement officiel de MIPROJET",
    description:
      "Présentation publique de la plateforme MIPROJET devant la presse et les acteurs de l'écosystème entrepreneurial ivoirien. Annonce de la mission : transformer les idées en projets crédibles, et les projets crédibles en opportunités de financement.",
    icon: Mic,
    tone: "secondary",
  },
  {
    date: "2025",
    title: "Mise en ligne de la plateforme web",
    description:
      "Déploiement de la plateforme MIPROJET sur ivoireprojet.com : structuration de projets selon les standards internationaux ISO 21500, accompagnement des porteurs de projets, mise en relation avec partenaires et bailleurs.",
    icon: Rocket,
    tone: "primary",
  },
  {
    date: "Octobre 2025",
    title: "Protocole d'accord avec FasterCapital",
    description:
      "Signature d'un protocole d'accord avec FasterCapital pour intégrer leur programme de levée de fonds. Un levier stratégique pour connecter les projets accompagnés à un réseau international de business angels et de partenaires financiers.",
    icon: Handshake,
    tone: "accent",
  },
  {
    date: "2026",
    title: "Représentation exclusive de dgMarket en Côte d'Ivoire",
    description:
      "Signature du Mémorandum d'Entente (MoU) avec dgMarket International (Washington D.C.), faisant de MIPROJET le représentant exclusif de dgMarket en Côte d'Ivoire. Accès direct à plus d'un million de notifications d'appels d'offres dans 180+ pays.",
    icon: Globe2,
    tone: "success",
  },
  {
    date: "2026",
    title: "Ouverture du module Appels d'offres",
    description:
      "Mise à disposition d'un moteur dédié aux opportunités de marchés publics et internationaux, avec alertes intelligentes par pays et par secteur — directement intégré à la plateforme MIPROJET.",
    icon: Target,
    tone: "primary",
  },
  {
    date: "2ᵉ semestre 2026",
    title: "Lancement de MiProjet+",
    description:
      "Déploiement de MiProjet+, la solution numérique destinée aux PME, coopératives, commerçants et acteurs de l'informel. Objectif : construire un historique d'activité fiable, produire des données exploitables et générer un score de crédibilité et de finançabilité — pour faciliter l'accès aux financements et aux investisseurs.",
    icon: Sparkles,
    tone: "secondary",
    upcoming: true,
  },
];

const toneStyles: Record<Milestone["tone"], { dot: string; ring: string; badge: string; icon: string }> = {
  primary:   { dot: "bg-primary",   ring: "ring-primary/30",   badge: "bg-primary/10 text-primary",     icon: "text-primary" },
  secondary: { dot: "bg-secondary", ring: "ring-secondary/30", badge: "bg-secondary/10 text-secondary", icon: "text-secondary" },
  success:   { dot: "bg-success",   ring: "ring-success/30",   badge: "bg-success/10 text-success",     icon: "text-success" },
  accent:    { dot: "bg-accent",    ring: "ring-accent/30",    badge: "bg-accent/20 text-accent-foreground", icon: "text-accent" },
};

const teamPillars = [
  { icon: Users,      title: "Gestion de projets", description: "Expertise en planification, pilotage et suivi-évaluation selon les standards ISO 21500." },
  { icon: Lightbulb,  title: "Structuration & stratégie", description: "Modélisation économique, structuration financière et préparation des dossiers d'investissement." },
  { icon: TrendingUp, title: "Développement digital", description: "Conception, développement et maintenance de plateformes numériques robustes et évolutives." },
  { icon: Award,      title: "Accompagnement entrepreneurial", description: "Coaching opérationnel, mise en relation et orientation vers les partenaires adaptés." },
];

const NotreParcours = () => {
  useEffect(() => {
    setMeta(
      "Notre parcours | MIPROJET",
      "De la conférence de presse au lancement de la plateforme web et à MiProjet+ : découvrez le parcours de MIPROJET, fondé par une équipe pluridisciplinaire d'experts en gestion de projets, structuration et développement digital."
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main>
        {/* Hero */}
        <section className="relative pt-28 md:pt-32 pb-16 bg-gradient-hero text-primary-foreground overflow-hidden">
          <div className="absolute inset-0 opacity-20" aria-hidden="true">
            <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-secondary/30 blur-3xl" />
            <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-accent/20 blur-3xl" />
          </div>
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-2 bg-accent/20 rounded-full text-accent font-semibold text-sm mb-6">
                Notre parcours
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                De l'idée à l'<span className="text-accent">infrastructure de confiance</span>
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/90 leading-relaxed">
                MIPROJET est porté par une équipe pluridisciplinaire d'ingénieurs en gestion
                de projets, en structuration d'entreprise et en développement informatique.
                Découvrez les étapes clés de notre construction.
              </p>
            </div>
          </div>
        </section>

        {/* Team pillars */}
        <section className="py-16 md:py-20 bg-card border-b border-border">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Une équipe, quatre expertises</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                MIPROJET n'est pas l'œuvre d'un seul homme : c'est le fruit d'une équipe complémentaire,
                au service des entrepreneurs et des organisations.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {teamPillars.map((p, i) => (
                <Card key={i} className="border-border/60 hover:shadow-elegant transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <p.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold text-sm mb-4">
                Chronologie
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Les étapes clés</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                De la création de la société au déploiement de MiProjet+, voici les jalons
                qui structurent notre développement.
              </p>
            </div>

            <div className="relative max-w-4xl mx-auto">
              {/* Vertical line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-secondary/30 to-accent/30 md:-translate-x-1/2" aria-hidden="true" />

              <div className="space-y-10">
                {milestones.map((m, i) => {
                  const tone = toneStyles[m.tone];
                  const isLeft = i % 2 === 0;
                  return (
                    <div
                      key={i}
                      className={`relative grid md:grid-cols-2 gap-6 md:gap-10 items-start ${
                        isLeft ? "" : "md:[&>*:first-child]:order-2"
                      }`}
                    >
                      {/* Card side */}
                      <div className={`pl-12 md:pl-0 ${isLeft ? "md:pr-10 md:text-right" : "md:pl-10"}`}>
                        <Card className={`group border-border/60 hover:shadow-elegant transition-all duration-300 ${m.upcoming ? "ring-2 ring-secondary/30" : ""}`}>
                          <CardContent className="p-6">
                            <div className={`flex items-center gap-2 mb-3 ${isLeft ? "md:justify-end" : ""}`}>
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${tone.badge}`}>
                                {m.date}
                              </span>
                              {m.upcoming && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                  À venir
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">{m.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{m.description}</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Dot */}
                      <div className="absolute left-4 md:left-1/2 top-6 -translate-x-1/2 z-10">
                        <div className={`w-9 h-9 rounded-full bg-card ring-4 ${tone.ring} flex items-center justify-center shadow-md`}>
                          <m.icon className={`h-4.5 w-4.5 ${tone.icon}`} />
                        </div>
                      </div>

                      {/* Empty side (for desktop alternation) */}
                      <div className="hidden md:block" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* MiProjet+ highlight */}
        <section className="py-16 md:py-20 bg-gradient-to-br from-secondary/10 via-background to-primary/10">
          <div className="container mx-auto px-4">
            <Card className="max-w-4xl mx-auto border-2 border-secondary/30 overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-7 w-7 text-secondary" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-wider">
                      Prochaine étape — 2ᵉ semestre 2026
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                      MiProjet+ : la confiance économique mesurable
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      MiProjet+ accompagnera les PME, coopératives, commerçants et acteurs
                      de l'informel dans la gestion quotidienne de leur activité. À la clé :
                      un historique fiable, des données exploitables et un score de crédibilité
                      qui ouvre la voie aux financements et aux partenariats.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Link to="/miprojet-plus">
                        <Button>Découvrir MiProjet+</Button>
                      </Link>
                      <Link to="/contact">
                        <Button variant="outline">Nous contacter</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default NotreParcours;
