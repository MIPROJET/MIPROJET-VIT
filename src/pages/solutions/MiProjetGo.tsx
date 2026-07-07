import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Smartphone, Check, ArrowRight, TrendingUp, Package, Users, FileBarChart, WifiOff, Wallet } from "lucide-react";
import { useSEO } from "@/components/SEOHead";

const brand = "hsl(140 55% 38%)";
const features = [
  { icon: TrendingUp, title: "Suivi financier", desc: "Recettes, dépenses et bénéfices en temps réel." },
  { icon: Package, title: "Gestion des stocks", desc: "Inventaire, alertes et rotations." },
  { icon: Users, title: "Gestion des équipes", desc: "Employés, salaires et présences." },
  { icon: FileBarChart, title: "Rapports automatiques", desc: "Bilans clairs, exportables." },
  { icon: WifiOff, title: "Mode hors connexion", desc: "Fonctionne partout, se synchronise ensuite." },
  { icon: Wallet, title: "Préparation financement", desc: "Historique financier crédible pour les bailleurs." },
];

const audience = [
  "Commerçants", "Vendeuses de marché", "Boutiquiers", "Restaurateurs", "Gérants de maquis",
  "Artisans", "Couturiers", "Coiffeurs", "Maçons", "Menuisiers", "Électriciens", "Plombiers",
  "Chauffeurs", "Transporteurs", "Livreurs", "Agriculteurs", "Éleveurs", "Pêcheurs",
  "Microentrepreneurs", "Travailleurs indépendants",
];

const MiProjetGo = () => {
  useSEO({
    title: "MiPROJET Go — Tracez. Gérez. Grandissez.",
    description: "Application de gestion quotidienne pour commerçants, artisans, agriculteurs et microentrepreneurs. Recettes, dépenses, stocks, rapports.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-[140px] pb-16" style={{ background: `linear-gradient(135deg, ${brand}, hsl(22 95% 48%))` }}>
        <div className="container-luxe text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur grid place-items-center ring-1 ring-white/25">
              <Smartphone className="h-7 w-7" />
            </div>
            <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-bold uppercase tracking-wider">Application terrain</span>
          </div>
          <h1 className="text-display text-4xl md:text-6xl mb-4">MiPROJET Go</h1>
          <p className="text-2xl font-semibold italic mb-6 text-white/90">Tracez. Gérez. Grandissez.</p>
          <p className="text-lg text-white/85 max-w-2xl mb-8">
            Digitalisez la gestion quotidienne de votre activité économique. Simple, rapide, adapté au terrain africain.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="https://go.ivoireprojet.com" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-white text-green-700 hover:bg-white/90 font-bold">
                Accéder à MiPROJET Go <ArrowRight className="ml-2 h-4 w-4" />
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
            <p className="text-muted-foreground">Tout ce qu'il faut pour gérer sereinement son activité.</p>
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
            <p className="text-muted-foreground">MiPROJET Go s'adresse à toutes les activités économiques de terrain.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
            {audience.map((a) => (
              <span key={a} className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium">
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="acces" className="py-20">
        <div className="container-luxe max-w-2xl text-center">
          <h2 className="text-display text-3xl md:text-4xl mb-4">Prêt à digitaliser votre activité ?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Rejoignez la communauté MiPROJET Go et transformez la gestion de votre activité.
          </p>
          <a href="https://go.ivoireprojet.com" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="font-bold text-white" style={{ background: brand }}>
              Accéder à MiPROJET Go <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MiProjetGo;
