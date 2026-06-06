import { useEffect, useState } from "react";
import { Quote, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  content: string;
  rating: number | null;
  country: string | null;
};

export const TestimonialsSection = () => {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Try to load real testimonials if a table exists; otherwise stay empty.
        const { data } = await (supabase as any)
          .from("testimonials")
          .select("id,name,role,content,rating,country,published")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(6);
        if (!cancelled && Array.isArray(data)) setItems(data as Testimonial[]);
      } catch {
        // table absent — leave empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="py-16 md:py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in">
          <span className="inline-block px-4 py-2 bg-success/10 rounded-full text-success font-semibold text-sm mb-4">
            Témoignages
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ils nous font confiance
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Les premiers retours de nos porteurs de projets seront publiés ici dès leur disponibilité.
          </p>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {items.map((t) => (
              <Card key={t.id} className="border-border/50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <Quote className="h-6 w-6 text-primary/40 mb-3" />
                  <p className="text-sm text-foreground leading-relaxed italic mb-4">
                    "{t.content}"
                  </p>
                  <div className="pt-3 border-t border-border">
                    <p className="font-semibold text-sm text-foreground">{t.name}</p>
                    {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                    {t.country && <p className="text-xs text-muted-foreground mt-1">{t.country}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto border-dashed border-2 border-border/60 mb-8">
            <CardContent className="p-10 text-center space-y-3">
              <Quote className="h-10 w-10 text-primary/40 mx-auto" />
              <h3 className="text-lg font-semibold text-foreground">
                Aucun témoignage publié pour le moment
              </h3>
              <p className="text-sm text-muted-foreground">
                Nous publions uniquement des témoignages authentiques de nos clients.
                Les premiers retours apparaîtront ici dès leur validation.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center flex flex-wrap justify-center gap-3">
          <Link to="/success-stories">
            <Button variant="outline" className="gap-2">
              Histoires de réussite
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
