export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative bg-background">
      {/* Subtle grid background */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.04) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Logo */}
      <div className="fixed top-6 left-6">
        <a href="/" className="flex items-center gap-2 terminal-panel rounded-sm px-2.5 py-1.5">
          <span className="text-primary font-mono text-xs font-bold">&gt;_</span>
          <span className="text-xs font-mono font-bold tracking-wider text-primary">ACRE</span>
          <span className="text-[9px] text-muted-foreground font-mono">v0.1</span>
        </a>
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Terminal decoration */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-primary-muted border border-primary/20">
            <span className="terminal-dot-active" />
            <span className="text-[10px] font-mono text-primary tracking-wider uppercase">
              AI-Powered Security Terminal
            </span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
