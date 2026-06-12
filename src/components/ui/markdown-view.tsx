import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Props {
  children?: string | null;
  className?: string;
}

/** Renders markdown text with professional Word-like typography (titles bold, lists, tables). */
export const MarkdownView = ({ children, className }: Props) => {
  if (!children) return null;
  return (
    <div
      className={cn(
        "prose prose-slate max-w-none",
        "prose-headings:font-bold prose-headings:tracking-tight",
        "prose-h1:text-3xl prose-h1:mt-6 prose-h1:mb-3",
        "prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-2 prose-h2:text-primary",
        "prose-h3:text-xl prose-h3:mt-5 prose-h3:mb-2",
        "prose-p:leading-relaxed prose-p:my-3",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-ul:my-3 prose-li:my-1",
        "prose-table:my-4 prose-th:bg-muted prose-th:font-semibold prose-td:p-2 prose-th:p-2 prose-table:border prose-td:border prose-th:border",
        "prose-hr:my-6",
        className,
      )}
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
};
