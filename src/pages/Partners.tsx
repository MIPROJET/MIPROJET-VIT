import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Landmark, Handshake, ArrowRight } from "lucide-react";
import { useSEO } from "@/components/SEOHead";

const categories = [
  {
    icon: Building2,
    title: "Investisseurs privés & Fonds",
    desc: "Business angels, fonds d'investissement, family offices intéressés par les projets africains qualifiés.",
    href: "/solutions/miprojet-invest",
    cta: "Découvrir MiPROJET Invest",
  },
  {
    icon: Landmark,
    title: "Institutions financières",
    desc: "Banques, microfinances et institutions publiques cherchant des dossiers structurés et bancables.",
    href: "/contact",
    cta: "Devenir partenaire",
  },
  {
    icon: Handshake,
    title: "Partenaires stratégiques",
    desc: "Incubateurs, accélérateurs, cabinets d'expertise et organismes publics de développement.",
    href: "/contact",
    cta: "Nous contacter",
  },
];

const Partners = () => {
  useSEO({
    title: "Investisseurs & Partenaires — MiPROJET",
    description: "Rejoignez l'écosystème MiPROJET en tant qu'investisseur, institution financière ou partenaire stratégique.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-[140px] pb-14 bg-mesh">
        <div className="container-luxe text-center max-w-3xl mx-auto">
          <h1 className="text-display text-4xl md:text-6xl mb-5">Investisseurs & Partenaires</h1>
          <p className="text-lg text-muted-foreground">
            L'écosystème MiPROJET connecte les projets africains qualifiés aux capitaux et compétences nécessaires à leur essor.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container-luxe grid md:grid-cols-3 gap-6">
          {categories.map((c) => (
            <div key={c.title} className="p-7 rounded-2xl border border-border bg-card hover:shadow-luxe transition-all flex flex-col">
              <div className="w-14 h-14 rounded-xl bg-primary/10 grid place-items-center mb-5">
                <c.icon className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">{c.title}</h2>
              <p className="text-muted-foreground text-sm mb-6 flex-1">{c.desc}</p>
              <Link to={c.href}>
                <Button className="w-full">{c.cta} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Partners;
