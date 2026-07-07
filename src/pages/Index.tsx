import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { EcosystemSolutions } from "@/components/EcosystemSolutions";
import { StatsSection } from "@/components/StatsSection";
import { FeaturedProjects } from "@/components/FeaturedProjects";
import { PartnershipBanner } from "@/components/PartnershipBanner";
import { LatestNews } from "@/components/LatestNews";
import { CallToAction } from "@/components/CallToAction";
import { Footer } from "@/components/Footer";
import { useSEO } from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase } from "lucide-react";

const Index = () => {
  useSEO({
    title: "MiPROJET — L'écosystème entrepreneurial africain",
    description: "Portail officiel de l'écosystème MiPROJET : MiPROJET Go, MiPROJET+ et MiPROJET Invest. Présenter, structurer, financer les projets africains.",
    image: window.location.origin + "/favicon.png",
    url: window.location.origin,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <EcosystemSolutions />

      {/* Impact */}
      <StatsSection />

      {/* Opportunités */}
      <section className="py-16 bg-muted/30">
        <div className="container-luxe">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                Opportunités
              </span>
              <h2 className="text-display text-3xl md:text-4xl">Appels d'offres, financements & projets accompagnés</h2>
            </div>
            <Link to="/opportunities">
              <Button variant="outline">
                Toutes les opportunités <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: "Appels d'offres", desc: "Marchés publics et privés en Afrique.", href: "/appels-doffres" },
              { title: "Opportunités", desc: "Programmes, subventions et concours ouverts.", href: "/opportunities" },
              { title: "Projets accompagnés", desc: "Projets qualifiés et structurés dans l'écosystème.", href: "/projects" },
            ].map((o) => (
              <Link
                key={o.title}
                to={o.href}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-card transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 grid place-items-center mb-4">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-1">{o.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{o.desc}</p>
                <span className="text-sm font-semibold text-primary inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                  Découvrir <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Projets en lumière */}
      <FeaturedProjects />

      {/* Partenaires */}
      <PartnershipBanner />

      {/* Actualités */}
      <LatestNews />

      {/* Rejoindre */}
      <CallToAction />

      <Footer />
    </div>
  );
};

export default Index;
