import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRight, Target, Handshake, ShieldCheck, LineChart, Briefcase } from "lucide-react";
import { useSEO } from "@/components/SEOHead";

const brand = "hsl(110 39% 47%)";

const features = [
  { icon: Target, title: "Projets sélectionnés", desc: "Uniquement des projets qualifiés et structurés via MiPROJET+." },
  { icon: LineChart, title: "Découverte d'opportunités", desc: "Filtres par secteur, ticket, géographie, maturité." },
  { icon: Handshake, title: "Mise en relation", desc: "Contact direct avec les porteurs qualifiés." },
  { icon: Briefcase, title: "Dossiers d'investissement", desc: "Accès aux dossiers selon vos droits." },
  { icon: ShieldCheck, title: "Qualification MiPROJET", desc: "Score, diagnostic et gouvernance vérifiés." },
];

const audience = [
  "Investisseurs privés", "Business angels", "Fonds d'investissement",
  "Banques", "Microfinances", "Institutions financières", "Entreprises",
];

const MiProjetInvest = () => {
  useSEO({
    title: "MiPROJET Invest — Investir dans l'Afrique productive",
    description: "Mise en relation entre projets africains qualifiés et investisseurs. Découvrez, suivez et financez les meilleures opportunités.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-[140px] pb-16" style={{ background: `linear-gradient(135deg, ${brand}, hsl(110 39% 38%))` }}>
        <div className="container-luxe text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur grid place-items-center ring-1 ring-white/25">
              <TrendingUp className="h-7 w-7" />
            </div>
            <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-bold uppercase tracking-wider">Investissement</span>
          </div>
          <h1 className="text-display text-4xl md:text-6xl mb-4">MiPROJET Invest</h1>
          <p className="text-2xl font-semibold italic mb-6 text-white/90">Investir dans l'Afrique productive.</p>
          <p className="text-lg text-white/85 max-w-2xl mb-8">
            Accédez aux projets sélectionnés de l'écosystème MiPROJET et connectez-vous directement aux porteurs qualifiés.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/projects">
              <Button size="lg" className="bg-white text-emerald-700 hover:bg-white/90 font-bold">
                Voir les projets <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20">
                Devenir partenaire
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe">
          <div className="text-center mb-12">
            <h2 className="text-display text-3xl md:text-4xl mb-3">Ce que vous obtenez</h2>
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
          <h2 className="text-display text-3xl md:text-4xl mb-4">Rejoignez MiPROJET Invest</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Contactez-nous pour ouvrir votre accès investisseur ou demander une démonstration.
          </p>
          <Link to="/contact">
            <Button size="lg" className="font-bold text-white" style={{ background: brand }}>
              Prendre contact <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MiProjetInvest;
