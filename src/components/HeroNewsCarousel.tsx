import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Newspaper } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  category: string | null;
  published_at: string | null;
}

export const HeroNewsCarousel = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    supabase
      .from("news")
      .select("id, title, excerpt, image_url, category, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setItems(data);
      });
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;

  const current = items[index];

  return (
    <div className="mt-12 max-w-4xl mx-auto">
      <div className="bg-white/8 border border-white/15 backdrop-blur-md rounded-2xl overflow-hidden">
        <Link
          to={`/news/${current.id}`}
          className="grid md:grid-cols-[220px_1fr] gap-0 items-stretch group"
        >
          <div className="aspect-[16/10] md:aspect-auto md:h-full bg-white/10 overflow-hidden">
            {current.image_url && (
              <img
                src={current.image_url}
                alt={current.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )}
          </div>
          <div className="p-5 md:p-6 text-left">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/70 mb-2">
              <Newspaper className="h-3.5 w-3.5" />
              <span>Actualités</span>
              {current.category && (
                <>
                  <span>•</span>
                  <span>{current.category}</span>
                </>
              )}
            </div>
            <h3 className="text-white font-bold text-lg md:text-xl leading-snug line-clamp-2 mb-2">
              {current.title}
            </h3>
            {current.excerpt && (
              <p className="text-white/75 text-sm line-clamp-2 mb-3">{current.excerpt}</p>
            )}
            <span className="inline-flex items-center gap-1.5 text-white font-semibold text-sm group-hover:gap-2.5 transition-all">
              Lire l'article <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3 bg-black/20">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Actualité ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
