import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { EcosystemSolutions } from "@/components/EcosystemSolutions";
import { Compass, Target, TrendingUp, Route } from "lucide-react";
import { useSEO } from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Ecosystem = () => {
  useSEO({
    title: "L'écosystème MiPROJET — Vision, mission et impact",
    description: "Découvrez l'écosystème MiPROJET : portail officiel de l'entrepreneuriat africain, réunissant MiPROJET Go, MiPROJET+ et MiPROJET Invest.",
  });

  const pillars = [
    { icon: Compass, title: "Notre vision", desc: "Devenir la plateforme mère de l'écosystème entrepreneurial africain, reliant activités de terrain, structuration et investissement." },
    { icon: Target, title: "Notre mission", desc: "Présenter, connecter et valoriser tous les acteurs de l'écosystème via des applications spécialisées et un hub administratif unifié." },
    { icon: TrendingUp, title: "Notre impact", desc: "Des milliers d'activités digitalisées, des projets structurés et certifiés, et des mises en relation avec les investisseurs." },
    { icon: Route, title: "Notre parcours", desc: "Une évolution continue vers un écosystème cohérent et professionnel, au service des entrepreneurs africains." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-[140px] pb-16 bg-mesh">
        <div className="container-luxe text-center max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
            L'écosystème
          </span>
          <h1 className="text-display text-4xl md:text-6xl mb-5">
            Un écosystème. Trois solutions. Une vision.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            MiPROJET est le portail officiel de l'écosystème entrepreneurial africain. Il présente, oriente et connecte
            les acteurs vers les applications spécialisées de l'écosystème.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container-luxe grid md:grid-cols-2 gap-6">
          {pillars.map((p) => (
            <div key={p.title} className="p-8 rounded-2xl border border-border bg-card hover:shadow-luxe transition-all">
              <div className="w-14 h-14 rounded-xl bg-primary/10 grid place-items-center mb-5">
                <p.icon className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">{p.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <EcosystemSolutions />

      <section className="py-20 bg-muted/30">
        <div className="container-luxe max-w-2xl text-center">
          <h2 className="text-display text-3xl md:text-4xl mb-4">Rejoindre l'écosystème</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Que vous soyez porteur, investisseur ou partenaire, il y a une place pour vous.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/contact"><Button size="lg" className="font-semibold">Nous contacter</Button></Link>
            <Link to="/investors"><Button size="lg" variant="outline">Espace investisseurs</Button></Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Ecosystem;
