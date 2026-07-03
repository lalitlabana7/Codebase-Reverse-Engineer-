import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.04) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 text-center max-w-3xl animate-fade-in">
        {/* Status indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary-muted border border-primary/20 mb-8">
          <span className="terminal-dot-active" />
          <span className="text-[10px] font-mono text-primary tracking-wider uppercase">System Online — AI-Powered Security Terminal</span>
        </div>

        {/* Terminal prompt */}
        <div className="mb-6">
          <p className="text-xs font-mono text-muted-foreground mb-2">
            <span className="text-primary">root@acre</span>:<span className="text-secondary">~</span>$ ./initialize --mode=full
          </p>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 font-mono">
          <span className="text-gradient">&gt; ACRE</span>
          <br />
          <span className="text-primary">AI Codebase Reverse Engineer</span>
        </h1>

        <p className="text-sm text-muted-foreground font-mono mb-8 leading-relaxed max-w-xl mx-auto">
          Instantly analyze any repository, source code, or website. Get comprehensive security insights, 
          architecture diagrams, and AI-powered code understanding — all from your terminal.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center gap-3">
          <a href="/sign-in" className="terminal-btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm font-mono">
            SIGN IN
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <a href="/sign-up" className="terminal-btn terminal-btn-outline inline-flex items-center gap-2 px-5 py-2 text-sm font-mono">
            CREATE ACCOUNT
          </a>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-16">
          {[
            { label: "REPOSITORY ANALYSIS", desc: "Understand any codebase in seconds", icon: ">" },
            { label: "SECURITY SCANNING", desc: "Detect vulnerabilities & secrets", icon: "#" },
            { label: "AI CHAT ASSISTANT", desc: "Ask questions about your code", icon: "$" },
          ].map((f) => (
            <div key={f.label} className="terminal-panel rounded-sm p-4 text-left hover:border-primary/25 transition-all">
              <p className="text-xs text-primary font-mono mb-2">{f.icon} ./{f.label.toLowerCase().replace(/\s+/g, "_")}</p>
              <h3 className="text-sm font-mono font-semibold text-primary mb-1">{f.label}</h3>
              <p className="text-[11px] text-muted-foreground font-mono">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-[10px] font-mono text-muted-foreground">
          <span className="text-primary">ACRE</span> v0.1 — Built with Next.js · OpenRouter · Clerk
        </div>
      </div>
    </div>
  );
}
