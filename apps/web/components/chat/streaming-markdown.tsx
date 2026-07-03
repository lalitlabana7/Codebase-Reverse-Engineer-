"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Copy, Terminal } from "lucide-react";

interface StreamingMarkdownProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export function StreamingMarkdown({ content, className, isStreaming }: StreamingMarkdownProps) {
  return (
    <div className={cn("prose-custom font-mono text-xs leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks with copy button
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const isInline = !match && !className;
            const codeStr = String(children).replace(/\n$/, "");

            if (isInline) {
              return (
                <code
                  className="px-1 py-0.5 rounded-sm bg-primary-muted/30 text-primary border border-primary/10 text-[11px]"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock language={match?.[1] ?? "text"} code={codeStr} />;
          },

          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 border border-primary/10 rounded-sm">
                <table className="w-full text-[11px] border-collapse">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-primary-muted/20 border-b border-primary/10">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-2 py-1.5 text-left text-primary font-bold uppercase tracking-wider text-[10px]">{children}</th>;
          },
          td({ children }) {
            return <td className="px-2 py-1 text-muted-foreground border-t border-primary/5">{children}</td>;
          },

          // Headings
          h1({ children }) {
            return <h1 className="text-sm font-bold text-primary mb-2 mt-4 border-b border-primary/10 pb-1">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xs font-bold text-primary mb-1.5 mt-3">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-[11px] font-bold text-primary/90 mb-1 mt-2.5">{children}</h3>;
          },

          // Paragraphs & lists
          p({ children }) {
            return <p className="mb-2 last:mb-0 text-muted-foreground">{children}</p>;
          },
          ul({ children }) {
            return <ul className="mb-2 space-y-0.5 pl-4">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-2 space-y-0.5 pl-4 list-decimal">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-muted-foreground marker:text-primary/50">{children}</li>;
          },

          // Links
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer"
                className="text-secondary underline underline-offset-2 decoration-secondary/30 hover:decoration-secondary transition-all">
                {children}
              </a>
            );
          },

          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-secondary/30 pl-3 my-2 italic text-muted-foreground/80">
                {children}
              </blockquote>
            );
          },

          // Horizontal rules
          hr() {
            return <hr className="my-3 border-primary/10" />;
          },

          // Inline formatting
          strong({ children }) {
            return <strong className="font-bold text-primary">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-primary/80">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-flex items-center gap-0.5 ml-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </span>
      )}
    </div>
  );
}

// Code block with copy button
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-sm border border-primary/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-primary-muted/20 border-b border-primary/10">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground hover:text-primary transition-colors"
        >
          {copied ? (
            <><Check className="w-2.5 h-2.5 text-success" /> Copied</>
          ) : (
            <><Copy className="w-2.5 h-2.5" /> Copy</>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto">
        <code className="block p-3 text-[11px] leading-relaxed text-primary/90 font-mono">
          {code}
        </code>
      </pre>
    </div>
  );
}
