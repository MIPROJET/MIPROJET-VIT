import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { HeroNewsCarousel } from "@/components/HeroNewsCarousel";
import logoGo from "@/assets/logos/miprojet-go.png.asset.json";
import logoPlus from "@/assets/logos/miprojet-plus.png.asset.json";
import logoInvest from "@/assets/logos/miprojet-invest.png.asset.json";

const SOLUTIONS = [
  {
    name: "MiPROJET Go",
    tagline: "Développer mon activité",
    desc: "Activités de terrain, artisans, commerçants, agriculteurs, microentrepreneurs.",
    href: "https://go.ivoireprojet.com",
    logo: logoGo.url,
    color: "hsl(140 55% 38%)",
  },
  {
    name: "MiPROJET+",
    tagline: "Structurer mon projet",
    desc: "Entreprises, startups, PME, coopératives, organisations structurées.",
    href: "https://plus.ivoireprojet.com",
    logo: logoPlus.url,
    color: "hsl(25 92% 55%)",
  },
  {
    name: "MiPROJET Invest",
    tagline: "Investir dans l'Afrique productive",
    desc: "Investisseurs, bailleurs, institutions financières.",
    href: "https://invest.ivoireprojet.com",
    logo: logoInvest.url,
    color: "hsl(42 78% 50%)",
  },
];

export const Hero = () => {
  return (
    <section className="relative pt-[128px] md:pt-[150px] pb-16 bg-[hsl(214_88%_18%)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden="true">
        <div className="absolute top-0 -left-24 w-[420px] h-[420px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-[480px] h-[480px] rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="container-luxe relative z-10 text-white">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
          {/* LEFT — Institutionnel */}
          <div>
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[11px] font-bold uppercase tracking-[0.18em] mb-6">
              Écosystème entrepreneurial africain
            </span>
            <h1 className="text-display text-4xl sm:text-5xl lg:text-[3.6rem] leading-[1.05] mb-5">
              Un écosystème.<br />
              Trois solutions.<br />
              <span className="text-white/85">Une vision africaine.</span>
            </h1>
            <p className="text-lg text-white/85 leading-relaxed max-w-xl mb-7">
              MiPROJET est le portail officiel de l'écosystème entrepreneurial africain.
              Structurer, financer et faire croître les projets qui transforment le continent.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-7">
              <Link to="/ecosystem">
                <Button size="lg" className="bg-white text-[hsl(214_88%_18%)] hover:bg-white/90 font-bold">
                  Découvrir l'écosystème <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#solutions">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-white/5 text-white hover:bg-white/15"
                >
                  Explorer les solutions
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Partenariats institutionnels
              </span>
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Projets qualifiés & structurés
              </span>
            </div>
          </div>

          {/* RIGHT — Actualités */}
          <div className="lg:pl-4">
            <HeroNewsCarousel />
          </div>
        </div>

        {/* Solutions */}
        <div id="solutions" className="grid md:grid-cols-3 gap-5 mt-16">
          {SOLUTIONS.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative p-6 rounded-2xl bg-white hover:shadow-2xl border border-white/10 transition-all hover:-translate-y-1"
            >
              <div className="h-16 mb-4 flex items-center">
                <img src={s.logo} alt={s.name} className="h-full w-auto object-contain" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: s.color }}>
                {s.tagline}
              </p>
              <p className="text-sm text-foreground/70 mb-4 leading-relaxed">{s.desc}</p>
              <span
                className="inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-2.5 transition-all"
                style={{ color: s.color }}
              >
                Accéder à {s.name} <ArrowRight className="h-4 w-4" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
