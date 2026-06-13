import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Props {
  children?: string | null;
  className?: string;
}

/**
 * Renders markdown text with professional Word-like typography.
 * GFM enabled → tables, strikethrough, task lists, autolinks all work.
 * Tables get an explicit "card" look (bold header, alternated rows, rounded border).
 */
export const MarkdownView = ({ children, className }: Props) => {
  if (!children) return null;
  return (
    <div
      className={cn(
        "prose prose-slate max-w-none",
        "prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground",
        "prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4",
        "prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-primary prose-h2:border-l-4 prose-h2:border-primary prose-h2:pl-3",
        "prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-foreground",
        "prose-p:leading-[1.8] prose-p:my-4 prose-p:text-foreground/90",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-ul:my-4 prose-li:my-1.5 prose-li:marker:text-primary",
        "prose-ol:my-4",
        "prose-a:text-primary prose-a:font-medium hover:prose-a:underline",
        "prose-hr:my-8 prose-hr:border-border",
        "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/40 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-md prose-blockquote:not-italic",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }) => (
            <div className="my-6 overflow-x-auto rounded-lg border border-border shadow-sm">
              <table {...props} className="w-full border-collapse text-sm" />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead {...props} className="bg-primary/10" />
          ),
          th: ({ node, ...props }) => (
            <th
              {...props}
              className="px-4 py-3 text-left font-bold text-foreground border-b border-border"
            />
          ),
          td: ({ node, ...props }) => (
            <td
              {...props}
              className="px-4 py-3 border-b border-border/60 align-top"
            />
          ),
          tr: ({ node, ...props }) => (
            <tr {...props} className="odd:bg-background even:bg-muted/30" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};
