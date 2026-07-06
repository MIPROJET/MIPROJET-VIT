import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone, Building2, TrendingUp, Sparkles } from "lucide-react";

export const Hero = () => {
  return (
    <section
      className="relative pt-[128px] md:pt-[150px] pb-16 overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-secondary/20 blur-3xl animate-blob" />
        <div
          className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full bg-primary-glow/25 blur-3xl animate-blob"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="container-luxe relative z-10 text-white">
        <div className="max-w-3xl mx-auto text-center reveal-up">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur-md mb-6">
            <Sparkles className="h-3.5 w-3.5 text-secondary-glow" /> Écosystème entrepreneurial africain
          </span>
          <h1 className="text-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mb-5">
            Un écosystème.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-secondary)" }}
            >
              Trois solutions.
            </span>
          </h1>
          <p className="text-lg text-white/85 leading-relaxed max-w-2xl mx-auto">
            MiPROJET est le portail officiel de l'écosystème entrepreneurial africain. Découvrez, connectez-vous et grandissez.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-12 max-w-5xl mx-auto reveal-up" style={{ animationDelay: "0.15s" }}>
          {[
            { icon: Smartphone, name: "MiPROJET Go", tagline: "Tracez. Gérez. Grandissez.", href: "/solutions/miprojet-go", color: "hsl(22 95% 58%)" },
            { icon: Building2, name: "MiPROJET+", tagline: "Structurez. Certifiez. Financez.", href: "/miprojet-plus", color: "hsl(207 79% 55%)" },
            { icon: TrendingUp, name: "MiPROJET Invest", tagline: "Investir dans l'Afrique productive.", href: "/solutions/miprojet-invest", color: "hsl(110 45% 60%)" },
          ].map((s) => (
            <Link
              key={s.name}
              to={s.href}
              className="group relative p-6 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/15 backdrop-blur-md transition-all hover:-translate-y-1"
            >
              <div
                className="w-12 h-12 rounded-xl grid place-items-center mb-4 ring-1 ring-white/20"
                style={{ background: `${s.color}30` }}
              >
                <s.icon className="h-6 w-6" style={{ color: s.color }} />
              </div>
              <h3 className="font-extrabold text-xl mb-1 text-white">{s.name}</h3>
              <p className="text-sm text-white/75 italic mb-4">{s.tagline}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary-glow group-hover:gap-2.5 transition-all">
                Découvrir <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link to="/ecosystem">
            <Button
              size="lg"
              variant="outline"
              className="bg-white/5 border-white/30 text-white hover:bg-white/15 hover:border-white/50 backdrop-blur-md"
            >
              Explorer l'écosystème
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
