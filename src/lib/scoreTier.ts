// Tiered scoring badge system (MIPROJET)
// Bronze < 60 · Silver 60-79 · Gold 80-89 · Platinum 90+

export type ScoreTier = "bronze" | "silver" | "gold" | "platinum";

export interface ScoreTierInfo {
  tier: ScoreTier;
  label: string;          // ex: "Standard"
  shortLabel: string;     // ex: "Silver"
  gradient: string;       // tailwind gradient bg
  ring: string;           // tailwind ring color
  text: string;           // text color class for the value
  shadow: string;         // glow
  icon: "shield" | "medal" | "award" | "crown";
}

export const getScoreTier = (score?: number | null): ScoreTierInfo | null => {
  if (score == null || isNaN(score as number)) return null;
  const s = Number(score);
  if (s >= 90) {
    return {
      tier: "platinum",
      label: "Élite",
      shortLabel: "Platine",
      gradient: "bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300",
      ring: "ring-2 ring-slate-300",
      text: "text-slate-900",
      shadow: "shadow-[0_4px_20px_-4px_rgba(148,163,184,0.6)]",
      icon: "crown",
    };
  }
  if (s >= 80) {
    return {
      tier: "gold",
      label: "Premium",
      shortLabel: "Or",
      gradient: "bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400",
      ring: "ring-2 ring-amber-300",
      text: "text-amber-950",
      shadow: "shadow-[0_4px_20px_-4px_rgba(245,158,11,0.55)]",
      icon: "award",
    };
  }
  if (s >= 60) {
    return {
      tier: "silver",
      label: "Standard",
      shortLabel: "Argent",
      gradient: "bg-gradient-to-br from-zinc-200 via-slate-100 to-zinc-300",
      ring: "ring-2 ring-zinc-300",
      text: "text-zinc-900",
      shadow: "shadow-[0_4px_18px_-4px_rgba(113,113,122,0.5)]",
      icon: "medal",
    };
  }
  return {
    tier: "bronze",
    label: "Émergent",
    shortLabel: "Bronze",
    gradient: "bg-gradient-to-br from-orange-300 via-amber-200 to-orange-400",
    ring: "ring-2 ring-orange-300",
    text: "text-orange-950",
    shadow: "shadow-[0_4px_18px_-4px_rgba(234,88,12,0.5)]",
    icon: "shield",
  };
};
