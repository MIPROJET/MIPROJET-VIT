import { Link } from "react-router-dom";
import { Briefcase, Facebook, Linkedin, Instagram, Youtube } from "lucide-react";

export const TopBar = () => {
  return (
    <div className="hidden lg:block bg-gradient-to-r from-accent via-accent to-secondary text-accent-foreground text-[11px] xl:text-xs">
      <div className="container-luxe flex items-center justify-center gap-4 xl:gap-6 h-9 overflow-hidden">
        <div className="flex items-center justify-center gap-2.5 xl:gap-4 font-medium min-w-0 flex-1">
          <Link to="/appels-doffres" className="inline-flex items-center gap-1.5 rounded-full border border-accent-foreground/45 bg-background/95 px-3 py-1 font-bold text-primary shadow-sm hover:bg-background transition-colors whitespace-nowrap">
            <Briefcase className="h-3.5 w-3.5" /> Appels d'offres
          </Link>
          <span className="opacity-40">|</span>
          <a href="https://go.ivoireprojet.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity whitespace-nowrap">MiPROJET Go</a>
          <span className="opacity-40">|</span>
          <a href="https://plus.ivoireprojet.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity whitespace-nowrap">MiPROJET+</a>
          <span className="opacity-40">|</span>
          <a href="https://invest.ivoireprojet.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity whitespace-nowrap">MiPROJET Invest</a>
          <span className="opacity-40">|</span>
          <Link to="/partners" className="hover:opacity-80 transition-opacity whitespace-nowrap">Partenaires</Link>
          <span className="opacity-40">|</span>
          <Link to="/contact" className="hover:opacity-80 transition-opacity">Contact</Link>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <a href="#" aria-label="Facebook" className="hover:opacity-80"><Facebook className="h-3.5 w-3.5" /></a>
            <a href="#" aria-label="LinkedIn" className="hover:opacity-80"><Linkedin className="h-3.5 w-3.5" /></a>
            <a href="#" aria-label="Instagram" className="hover:opacity-80"><Instagram className="h-3.5 w-3.5" /></a>
            <a href="#" aria-label="YouTube" className="hover:opacity-80"><Youtube className="h-3.5 w-3.5" /></a>
          </div>
        </div>
      </div>
    </div>
  );
};
