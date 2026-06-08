import { Shield, Medal, Award, Crown } from "lucide-react";
import { getScoreTier } from "@/lib/scoreTier";
import { cn } from "@/lib/utils";

interface Props {
  score?: number | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const iconMap = { shield: Shield, medal: Medal, award: Award, crown: Crown };

export const ScoreBadge = ({ score, size = "md", showLabel = true, className }: Props) => {
  const info = getScoreTier(score);
  if (!info) return null;
  const Icon = iconMap[info.icon];

  const sizing = {
    sm: { wrap: "px-2.5 py-1 text-xs gap-1.5", icon: "h-3 w-3", num: "text-xs" },
    md: { wrap: "px-3 py-1.5 text-sm gap-2", icon: "h-3.5 w-3.5", num: "text-sm" },
    lg: { wrap: "px-4 py-2 text-base gap-2.5", icon: "h-4 w-4", num: "text-base" },
  }[size];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-semibold backdrop-blur-sm",
        info.gradient,
        info.ring,
        info.text,
        info.shadow,
        sizing.wrap,
        className
      )}
      title={`Score MIPROJET ${info.label} — ${Math.round(Number(score))}/100`}
    >
      <Icon className={cn(sizing.icon, "shrink-0")} />
      <span className={cn("tabular-nums font-bold", sizing.num)}>
        {Math.round(Number(score))}
      </span>
      <span className="opacity-60">/100</span>
      {showLabel && (
        <span className="ml-1 hidden sm:inline border-l border-current/20 pl-2 font-medium">
          {info.label}
        </span>
      )}
    </div>
  );
};
