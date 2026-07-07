import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export const CallToAction = () => {
  return (
    <section className="py-20 relative overflow-hidden bg-[hsl(214_88%_18%)]">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-6 text-white">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold text-sm">Rejoindre l'écosystème</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold leading-tight">
            Choisissez votre point d'entrée
          </h2>

          <p className="text-lg text-white/85 max-w-2xl mx-auto">
            MiPROJET oriente chaque acteur vers la solution qui correspond à son besoin réel.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 pt-6">
            <a href="https://go.ivoireprojet.com" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="w-full bg-[hsl(140_55%_38%)] hover:bg-[hsl(140_55%_32%)] text-white font-bold">
                Développer mon activité <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="https://plus.ivoireprojet.com" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="w-full bg-[hsl(25_92%_55%)] hover:bg-[hsl(25_92%_48%)] text-white font-bold">
                Structurer mon projet <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="https://invest.ivoireprojet.com" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="w-full bg-[hsl(42_78%_50%)] hover:bg-[hsl(42_78%_44%)] text-white font-bold">
                Trouver des opportunités <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>

          <div className="pt-6">
            <Link to="/ecosystem" className="text-white/80 hover:text-white underline underline-offset-4">
              En savoir plus sur l'écosystème
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
