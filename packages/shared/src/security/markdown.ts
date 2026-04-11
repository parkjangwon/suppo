import { escapeHtml } from "./input-validation";

function renderInlineMarkdown(text: string) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function renderSafeMarkdown(text: string): string {
  const escaped = escapeHtml(text ?? "");
  const lines = escaped.split(/\r?\n/);

  return lines
    .map((line) => {
      if (!line.trim()) {
        return "<br />";
      }

      if (line.startsWith("### ")) {
        return `<h3>${renderInlineMarkdown(line.slice(4))}</h3>`;
      }

      if (line.startsWith("## ")) {
        return `<h2>${renderInlineMarkdown(line.slice(3))}</h2>`;
      }

      if (line.startsWith("# ")) {
        return `<h1>${renderInlineMarkdown(line.slice(2))}</h1>`;
      }

      return renderInlineMarkdown(line);
    })
    .join("<br />");
}
