import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, Search, Phone } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { TopBar } from "@/components/TopBar";
import logoAsset from "@/assets/logos/miprojet.png.asset.json";

type SubItem = { to?: string; href?: string; label: string; emoji?: string };
type MenuGroup = { key: string; label: string; items: SubItem[] };

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openMobileSub, setOpenMobileSub] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleMobileSub = (k: string) => setOpenMobileSub((p) => (p === k ? null : k));

  const groups: MenuGroup[] = [
    {
      key: "ecosystem",
      label: "Écosystème",
      items: [
        { to: "/ecosystem", label: "Qui sommes-nous", emoji: "🧭" },
        { to: "/notre-parcours", label: "Notre parcours", emoji: "🛤️" },
        { to: "/about", label: "À propos", emoji: "ℹ️" },
      ],
    },
    {
      key: "solutions",
      label: "Solutions",
      items: [
        { to: "/solutions/miprojet-go", label: "MiPROJET Go", emoji: "🟢" },
        { to: "/miprojet-plus", label: "MiPROJET+", emoji: "🟠" },
        { to: "/solutions/miprojet-invest", label: "MiPROJET Invest", emoji: "🟡" },
      ],
    },
    {
      key: "opportunities",
      label: "Opportunités",
      items: [
        { to: "/appels-doffres", label: "Appels d'offres", emoji: "📢" },
        { to: "/opportunities", label: "Opportunités", emoji: "🎯" },
        { to: "/projects", label: "Projets accompagnés", emoji: "🌟" },
      ],
    },
    {
      key: "partners",
      label: "Acteurs & Partenaires",
      items: [
        { to: "/partners", label: "Nos partenaires", emoji: "🤝" },
        { to: "/investors", label: "Investisseurs & bailleurs", emoji: "💰" },
      ],
    },
    {
      key: "ressources",
      label: "Ressources",
      items: [
        { to: "/news", label: "Actualités", emoji: "📰" },
        { to: "/documents", label: "Documents & guides", emoji: "📚" },
        { to: "/faq", label: "FAQ", emoji: "❓" },
      ],
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <TopBar />
      <nav
        className={cn(
          "bg-background/95 backdrop-blur-xl border-b border-border/60 transition-all duration-300 supports-[backdrop-filter]:bg-background/85",
          scrolled && "shadow-card"
        )}
      >
        <div className="container-luxe">
          <div className={cn("flex items-center justify-between transition-all", scrolled ? "h-14" : "h-[72px]")}>
            <Link to="/" className="flex items-center group shrink-0" aria-label="MiPROJET — Accueil">
              <img
                src={logoAsset.url}
                alt="MiPROJET"
                className={cn(
                  "w-auto object-contain transition-all duration-300 group-hover:scale-[1.02]",
                  scrolled ? "h-10" : "h-12"
                )}
              />
            </Link>

            <div className="hidden lg:flex items-center justify-center flex-1 min-w-0 px-3 xl:px-6">
              <NavigationMenu>
                <NavigationMenuList className="gap-0 xl:gap-0.5">
                  {groups.map((g) => (
                    <NavigationMenuItem key={g.key}>
                      <NavigationMenuTrigger className="text-[13px] font-semibold bg-transparent h-10 px-2 xl:px-3 data-[state=open]:text-primary hover:text-primary">
                        {g.label}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-[320px] gap-0.5 p-3">
                          {g.items.map((it) => (
                            <li key={(it.to || it.href) + it.label}>
                              <NavigationMenuLink asChild>
                                <Link
                                  to={it.to || "#"}
                                  className="flex items-center gap-3 rounded-lg p-2.5 text-sm hover:bg-muted transition-colors group/item"
                                >
                                  {it.emoji && <span className="text-lg">{it.emoji}</span>}
                                  <span className="font-medium group-hover/item:text-primary transition-colors">
                                    {it.label}
                                  </span>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  ))}
                  <NavigationMenuItem>
                    <Link
                      to="/contact"
                      className="text-[13px] font-semibold h-10 px-3 inline-flex items-center hover:text-primary transition-colors"
                    >
                      Contact
                    </Link>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <button
                aria-label="Rechercher"
                className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted text-foreground/70 hover:text-primary transition-colors"
                onClick={() => navigate("/opportunities")}
              >
                <Search className="h-4 w-4" />
              </button>
              <LanguageSelector />
            </div>

            <div className="flex items-center gap-1.5 lg:hidden">
              <button
                className="text-foreground p-2 -mr-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="lg:hidden py-4 space-y-1 border-t border-border max-h-[78vh] overflow-y-auto animate-fade-in">
              {groups.map((g) => (
                <div key={g.key}>
                  <button
                    onClick={() => toggleMobileSub(g.key)}
                    className="w-full flex items-center justify-between py-2.5 px-2 text-foreground hover:text-primary font-semibold"
                  >
                    <span>{g.label}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", openMobileSub === g.key && "rotate-180")}
                    />
                  </button>
                  {openMobileSub === g.key && (
                    <div className="pl-3 space-y-0.5 border-l-2 border-primary/30 ml-2 mb-2">
                      {g.items.map((it) => (
                        <Link
                          key={(it.to || it.href) + it.label}
                          to={it.to || "#"}
                          className="flex items-center gap-2 py-2 px-2 text-sm text-muted-foreground hover:text-primary"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {it.emoji && <span>{it.emoji}</span>}
                          <span>{it.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <Link
                to="/contact"
                className="block py-2.5 px-2 font-semibold text-foreground hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>

              <div className="pt-4 border-t border-border flex items-center justify-between px-2">
                <LanguageSelector />
                <a
                  href="tel:+22507071679"
                  className="flex items-center gap-2 text-sm font-semibold text-primary"
                >
                  <Phone className="h-4 w-4" /> +225 07 07 16 79 21
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
