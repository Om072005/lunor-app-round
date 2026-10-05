"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders AI markdown safely: react-markdown never injects raw HTML, so model output cannot run scripts. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`prose-lunor ${className ?? ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
