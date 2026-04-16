import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function normalizeMarkdownContent(content: string): string {
  return (content ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

const markdownComponents: Components = {
  a: ({ className, ...props }) => (
    <a
      {...props}
      className={joinClasses("font-medium text-blue-600 underline underline-offset-4", className)}
      rel="noreferrer"
      target="_blank"
    />
  ),
  p: ({ className, ...props }) => (
    <p {...props} className={joinClasses("mb-4 leading-7 last:mb-0", className)} />
  ),
  ul: ({ className, ...props }) => (
    <ul {...props} className={joinClasses("mb-4 list-disc pl-6 space-y-2", className)} />
  ),
  ol: ({ className, ...props }) => (
    <ol {...props} className={joinClasses("mb-4 list-decimal pl-6 space-y-2", className)} />
  ),
  li: ({ className, ...props }) => (
    <li {...props} className={joinClasses("leading-7", className)} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      {...props}
      className={joinClasses("mb-4 border-l-4 border-slate-300 pl-4 italic text-slate-600", className)}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr {...props} className={joinClasses("my-6 border-slate-200", className)} />
  ),
  table: ({ className, ...props }) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-slate-200">
      <table {...props} className={joinClasses("w-full border-collapse text-sm", className)} />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead {...props} className={joinClasses("bg-slate-50", className)} />
  ),
  th: ({ className, ...props }) => (
    <th
      {...props}
      className={joinClasses("border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-900", className)}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      {...props}
      className={joinClasses("border-b border-slate-200 px-4 py-3 align-top text-slate-700", className)}
    />
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = typeof className === "string" && className.includes("language-");
    if (isBlock) {
      return (
        <code
          {...props}
          className={joinClasses("block overflow-x-auto rounded-md bg-slate-950 px-4 py-3 text-sm text-slate-50", className)}
        >
          {children}
        </code>
      );
    }

    return (
      <code
        {...props}
        className={joinClasses("rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-800", className)}
      >
        {children}
      </code>
    );
  },
  pre: ({ className, ...props }) => (
    <pre
      {...props}
      className={joinClasses("mb-4 overflow-x-auto rounded-md bg-slate-950 p-0 text-slate-50", className)}
    />
  ),
  h1: ({ className, ...props }) => (
    <h1 {...props} className={joinClasses("mb-4 text-3xl font-bold tracking-tight text-slate-950", className)} />
  ),
  h2: ({ className, ...props }) => (
    <h2 {...props} className={joinClasses("mb-3 mt-8 text-2xl font-semibold tracking-tight text-slate-950 first:mt-0", className)} />
  ),
  h3: ({ className, ...props }) => (
    <h3 {...props} className={joinClasses("mb-3 mt-6 text-xl font-semibold text-slate-950 first:mt-0", className)} />
  ),
};

export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={joinClasses("prose prose-slate max-w-none", className)}>
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm, remarkBreaks]}
      >
        {normalizeMarkdownContent(content)}
      </ReactMarkdown>
    </div>
  );
}
