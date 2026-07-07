import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoGo from "@/assets/logos/miprojet-go.png.asset.json";
import logoPlus from "@/assets/logos/miprojet-plus.png.asset.json";
import logoInvest from "@/assets/logos/miprojet-invest.png.asset.json";

const solutions = [
  {
    id: "go",
    name: "MiPROJET Go",
    slogan: "Tracez. Gérez. Grandissez.",
    mission: "Digitaliser la gestion quotidienne des activités économiques de terrain.",
    audience: "Commerçants, artisans, restaurateurs, agriculteurs, microentrepreneurs.",
    benefits: ["Suivi recettes & dépenses", "Gestion des stocks", "Rapports automatiques", "Préparation au financement"],
    href: "https://go.ivoireprojet.com",
    logo: logoGo.url,
    color: "hsl(140 55% 38%)",
    ring: "ring-[hsl(140_55%_38%/0.25)]",
    badge: "Application terrain",
  },
  {
    id: "plus",
    name: "MiPROJET+",
    slogan: "Structurez. Certifiez. Financez.",
    mission: "Transformer les activités prometteuses en organisations structurées et finançables.",
    audience: "Startups, PME, TPE, coopératives, associations, ONG.",
    benefits: ["Structuration & gouvernance", "Diagnostic & accompagnement", "Certification", "Préparation bancaire"],
    href: "https://plus.ivoireprojet.com",
    logo: logoPlus.url,
    color: "hsl(25 92% 55%)",
    ring: "ring-[hsl(25_92%_55%/0.25)]",
    badge: "Structuration",
  },
  {
    id: "invest",
    name: "MiPROJET Invest",
    slogan: "Investir dans l'Afrique productive.",
    mission: "Mettre en relation les projets qualifiés avec les investisseurs.",
    audience: "Investisseurs privés, business angels, fonds, banques, microfinances.",
    benefits: ["Projets sélectionnés", "Découverte d'opportunités", "Mise en relation", "Dossiers d'investissement"],
    href: "https://invest.ivoireprojet.com",
    logo: logoInvest.url,
    color: "hsl(42 78% 50%)",
    ring: "ring-[hsl(42_78%_50%/0.25)]",
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
          {solutions.map((s) => (
            <div
              key={s.id}
              className={cn(
                "group relative rounded-2xl border border-border bg-card p-7 flex flex-col hover:shadow-luxe transition-all hover:-translate-y-1 ring-1",
                s.ring
              )}
            >
              <div className="h-16 mb-5 flex items-center">
                <img src={s.logo} alt={s.name} className="h-full w-auto object-contain" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {s.badge}
              </span>
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

              <a href={s.href} target="_blank" rel="noopener noreferrer">
                <Button
                  className="w-full font-semibold text-white group-hover:scale-[1.02] transition-transform"
                  style={{ background: s.color }}
                >
                  Accéder à {s.name}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
