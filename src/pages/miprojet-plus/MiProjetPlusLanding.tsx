import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Building2, TrendingUp, Users, ShieldCheck, Award, Briefcase } from "lucide-react";
import { useSEO } from "@/components/SEOHead";
import logoPlus from "@/assets/logos/miprojet-plus.png.asset.json";

const brand = "hsl(25 92% 55%)";

const features = [
  { icon: Building2, title: "Structuration", desc: "Gouvernance, statuts, organigramme, fiscalité." },
  { icon: ShieldCheck, title: "Diagnostic & accompagnement", desc: "Audit complet et plan d'action personnalisé." },
  { icon: Award, title: "Certification MiPROJET", desc: "Score de qualification reconnu par les investisseurs." },
  { icon: Briefcase, title: "Préparation bancaire", desc: "Dossiers financiers prêts pour banques et bailleurs." },
  { icon: TrendingUp, title: "Croissance mesurée", desc: "Indicateurs de performance et suivi opérationnel." },
  { icon: Users, title: "Mise en relation", desc: "Accès à un réseau d'investisseurs et de partenaires." },
];

const audience = ["Startups", "PME", "TPE", "Coopératives", "Associations", "ONG", "Organisations structurées"];

const MiProjetPlusLanding = () => {
  useSEO({
    title: "MiPROJET+ — Structurez. Certifiez. Financez.",
    description: "Plateforme de structuration et certification pour startups, PME, coopératives et associations. Accédez à la préparation bancaire et à la mise en relation avec les investisseurs.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-[140px] pb-16" style={{ background: brand }}>
        <div className="container-luxe text-white">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 bg-white/95 rounded-xl px-3 flex items-center ring-1 ring-white/40">
              <img src={logoPlus.url} alt="MiPROJET+" className="h-11 w-auto" />
            </div>
            <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-bold uppercase tracking-wider">Structuration</span>
          </div>
          <h1 className="text-display text-4xl md:text-6xl mb-4">MiPROJET+</h1>
          <p className="text-2xl font-semibold italic mb-6 text-white/95">Structurez. Certifiez. Financez.</p>
          <p className="text-lg text-white/90 max-w-2xl mb-8">
            Transformez votre activité en organisation structurée et finançable. Diagnostic, gouvernance, certification et préparation bancaire.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="https://plus.ivoireprojet.com" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-white text-orange-700 hover:bg-white/90 font-bold">
                Accéder à MiPROJET+ <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20">
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe">
          <div className="text-center mb-12">
            <h2 className="text-display text-3xl md:text-4xl mb-3">Fonctionnalités principales</h2>
            <p className="text-muted-foreground">Tout pour structurer, certifier et financer votre organisation.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-border bg-card hover:shadow-card transition-all">
                <div className="w-12 h-12 rounded-xl grid place-items-center mb-4" style={{ background: `${brand}20`, color: brand }}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container-luxe">
          <div className="text-center mb-10">
            <h2 className="text-display text-3xl mb-3">Pour qui ?</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {audience.map((a) => (
              <span key={a} className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium">
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe max-w-2xl text-center">
          <h2 className="text-display text-3xl md:text-4xl mb-4">Prêt à structurer votre organisation ?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Rejoignez MiPROJET+ et transformez votre activité en organisation reconnue et finançable.
          </p>
          <a href="https://plus.ivoireprojet.com" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="font-bold text-white" style={{ background: brand }}>
              Accéder à MiPROJET+ <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MiProjetPlusLanding;
