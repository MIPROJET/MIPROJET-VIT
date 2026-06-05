import { cn } from "@/lib/utils";

interface CountryFlagProps {
  code: string | null | undefined;
  className?: string;
  size?: number; // px, height
  rounded?: boolean;
  title?: string;
}

/**
 * Renders a real country flag image (PNG via flagcdn) — works on every OS,
 * including Windows desktop where flag emojis are not rendered.
 */
export const CountryFlag = ({ code, className, size = 18, rounded = true, title }: CountryFlagProps) => {
  const iso = (code || "").toLowerCase();
  if (!iso || iso.length !== 2) {
    return (
      <span
        className={cn("inline-flex items-center justify-center bg-muted text-muted-foreground", rounded && "rounded-sm", className)}
        style={{ height: size, width: Math.round(size * 1.5), fontSize: size * 0.7 }}
        aria-hidden
      >
        🌍
      </span>
    );
  }
  const allowed = [20, 40, 80, 160, 320, 640, 1280, 2560];
  const target = Math.max(20, Math.round(size * 1.6));
  const w = allowed.find((x) => x >= target) ?? 40;
  const w2 = allowed.find((x) => x >= target * 2) ?? 80;
  return (
    <img
      src={`https://flagcdn.com/w${w}/${iso}.png`}
      srcSet={`https://flagcdn.com/w${w2}/${iso}.png 2x`}
      alt={title || iso.toUpperCase()}
      title={title || iso.toUpperCase()}
      loading="lazy"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      className={cn("inline-block object-cover border border-border/40", rounded && "rounded-sm", className)}
      style={{ height: size, width: "auto" }}
    />
  );
};
