import { Link } from "react-router-dom";
import { Smartphone, Building2, TrendingUp, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const solutions = [
  {
    id: "go",
    name: "MiPROJET Go",
    slogan: "Tracez. Gérez. Grandissez.",
    mission: "Digitaliser la gestion quotidienne des activités économiques de terrain.",
    audience: "Commerçants, artisans, restaurateurs, agriculteurs, microentrepreneurs.",
    benefits: ["Suivi recettes & dépenses", "Gestion des stocks", "Rapports automatiques", "Préparation au financement"],
    href: "/solutions/miprojet-go",
    icon: Smartphone,
    color: "hsl(22 95% 58%)",
    bg: "bg-[hsl(22_95%_58%/0.08)]",
    ring: "ring-[hsl(22_95%_58%/0.3)]",
    badge: "Application terrain",
  },
  {
    id: "plus",
    name: "MiPROJET+",
    slogan: "Structurez. Certifiez. Financez.",
    mission: "Transformer les activités prometteuses en organisations structurées et finançables.",
    audience: "Startups, PME, TPE, coopératives, associations, ONG.",
    benefits: ["Structuration & gouvernance", "Diagnostic & accompagnement", "Certification", "Préparation bancaire"],
    href: "/miprojet-plus",
    icon: Building2,
    color: "hsl(207 74% 41%)",
    bg: "bg-[hsl(207_74%_41%/0.08)]",
    ring: "ring-[hsl(207_74%_41%/0.3)]",
    badge: "Structuration",
  },
  {
    id: "invest",
    name: "MiPROJET Invest",
    slogan: "Investir dans l'Afrique productive.",
    mission: "Mettre en relation les projets qualifiés avec les investisseurs.",
    audience: "Investisseurs privés, business angels, fonds, banques, microfinances.",
    benefits: ["Projets sélectionnés", "Découverte d'opportunités", "Mise en relation", "Dossiers d'investissement"],
    href: "/solutions/miprojet-invest",
    icon: TrendingUp,
    color: "hsl(110 39% 47%)",
    bg: "bg-[hsl(110_39%_47%/0.08)]",
    ring: "ring-[hsl(110_39%_47%/0.3)]",
    badge: "Investissement",
  },
];

export const EcosystemSolutions = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container-luxe">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
            Écosystème MiPROJET
          </span>
          <h2 className="text-display text-3xl md:text-5xl mb-4">
            Trois solutions. Une vision.
          </h2>
          <p className="text-muted-foreground text-lg">
            Chaque application répond à un moment précis du parcours entrepreneurial africain.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {solutions.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={cn(
                  "group relative rounded-2xl border border-border bg-card p-7 flex flex-col hover:shadow-luxe transition-all hover:-translate-y-1",
                  s.bg
                )}
              >
                <div
                  className={cn("w-14 h-14 rounded-xl grid place-items-center ring-1 mb-5", s.ring)}
                  style={{ background: `${s.color}20` }}
                >
                  <Icon className="h-7 w-7" style={{ color: s.color }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {s.badge}
                </span>
                <h3 className="text-2xl font-extrabold mb-1" style={{ color: s.color }}>
                  {s.name}
                </h3>
                <p className="text-sm font-semibold text-foreground/80 italic mb-3">{s.slogan}</p>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{s.mission}</p>

                <div className="mb-4 pb-4 border-b border-border/60">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Cible</p>
                  <p className="text-sm text-foreground/80">{s.audience}</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {s.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: s.color }} />
                      <span className="text-foreground/85">{b}</span>
                    </li>
                  ))}
                </ul>

                <Link to={s.href}>
                  <Button
                    className="w-full font-semibold text-white group-hover:scale-[1.02] transition-transform"
                    style={{ background: s.color }}
                  >
                    Découvrir {s.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
