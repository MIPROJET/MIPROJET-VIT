import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, TrendingUp, Award, ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ScoreBadge } from "@/components/projects/ScoreBadge";

export interface PublicProject {
  id: string;
  display_id?: string | null;
  short_slug?: string | null;
  title: string;
  sector?: string | null;
  category?: string | null;
  country?: string | null;
  city?: string | null;
  amount_requested?: number | null;
  currency?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  image_url?: string | null;
  public_summary?: string | null;
  description?: string | null;
  expected_roi?: number | null;
  mp_score?: number | null;
  recommendation_level?: string | null;
}

const formatAmount = (n?: number | null, currency = "XOF") => {
  if (!n && n !== 0) return null;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md ${currency}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M ${currency}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k ${currency}`;
  return `${n} ${currency}`;
};

export const PublicProjectCard = ({ project }: { project: PublicProject }) => {
  const cover = project.cover_url || project.image_url || project.logo_url;
  const summary =
    project.public_summary ||
    project.description ||
    `Projet ${project.sector ? `dans le secteur ${project.sector}` : "à fort potentiel"}${
      project.country ? ` basé en ${project.country}` : ""
    }. Opportunité d'investissement structurée selon les standards MIPROJET.`;

  const amount = formatAmount(project.amount_requested, project.currency || "XOF");
  const link = `/projects/${project.id}`;


        {project.recommendation_level === "elite" && (
          <Badge className="absolute top-3 right-3 bg-amber-500 text-white">
            <Award className="h-3 w-3 mr-1" /> Recommandé
          </Badge>
        )}
      </Link>

      <CardContent className="flex-1 flex flex-col gap-3 p-4">
        <Link to={link}>
          <h3 className="text-base sm:text-lg font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {project.title}
          </h3>
        </Link>

        <p className="text-sm text-muted-foreground line-clamp-3">{summary}</p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
          {(project.city || project.country) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {[project.city, project.country].filter(Boolean).join(", ")}
            </span>
          )}
          {project.expected_roi != null && (
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> ROI ~{project.expected_roi}%
            </span>
          )}
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-border/60">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Montant recherché</p>
            <p className="font-semibold text-foreground">{amount || "Sur demande"}</p>
          </div>
          <Link to={link}>
            <Button size="sm" className="gap-1">
              Découvrir <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
