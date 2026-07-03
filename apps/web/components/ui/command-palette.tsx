"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  GitBranch,
  Shield,
  Bot,
  FileText,
  Share2,
  Scan,
  Settings,
  Globe,
  Puzzle,
  Terminal,
  Search,
  Star,
  ArrowRight,
} from "lucide-react";

const pages = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "home main overview" },
  { label: "Repositories", href: "/dashboard/repositories", icon: GitBranch, keywords: "repos git code" },
  { label: "Security", href: "/dashboard/security", icon: Shield, keywords: "vulnerability scan threats" },
  { label: "Dependencies", href: "/dashboard/dependencies", icon: Share2, keywords: "packages npm modules" },
  { label: "AI Chat", href: "/dashboard/chat", icon: Bot, keywords: "ask question rag" },
  { label: "Documents", href: "/dashboard/documents", icon: FileText, keywords: "docs readme generation" },
  { label: "Diagrams", href: "/dashboard/diagrams", icon: Puzzle, keywords: "architecture mermaid" },
  { label: "Scans", href: "/dashboard/scans", icon: Scan, keywords: "history analysis jobs" },
  { label: "Websites", href: "/dashboard/websites", icon: Globe, keywords: "url analyze tech stack" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, keywords: "config profile api" },
];

const actions = [
  { id: "new-analysis", label: "New Analysis", icon: Star, keywords: "run scan analyze", action: "new-analysis" },
  { id: "connect-repo", label: "Connect Repository", icon: GitBranch, keywords: "add git url", action: "connect-repo" },
  { id: "open-terminal", label: "Open Terminal", icon: Terminal, keywords: "console shell", action: "open-terminal" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle menu with ⌘K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (value: string) => {
      setOpen(false);
      // Check if it's a page route
      const page = pages.find(
        (p) => p.href === value || p.label.toLowerCase() === value.toLowerCase()
      );
      if (page) {
        router.push(page.href);
        return;
      }
      // Check actions
      if (value === "new-analysis") {
        router.push("/dashboard/repositories");
      } else if (value === "connect-repo") {
        router.push("/dashboard/repositories");
      }
    },
    [router]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-[520px] rounded-xl border border-border/30 bg-surface shadow-2xl shadow-primary/5 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "0 0 40px rgba(129, 140, 248, 0.08), 0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <Command label="Command Menu" shouldFilter={false}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Command.Input
              ref={inputRef}
              autoFocus
              placeholder="Search pages, actions, or type a command..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none font-mono"
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground border border-border/20 bg-background/50">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[320px] overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground font-mono">No results found.</p>
              </div>
            </Command.Empty>

            {/* Pages */}
            <Command.Group heading={
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1">
                NAVIGATION
              </span>
            }>
              {pages.map((page) => {
                const Icon = page.icon;
                return (
                  <Command.Item
                    key={page.href}
                    value={page.label}
                    onSelect={() => handleSelect(page.href)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer
                      data-[selected=true]:bg-primary-muted data-[selected=true]:text-primary
                      text-muted-foreground hover:text-primary transition-all group"
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 font-mono text-xs">{page.label}</span>
                    <span className="text-[9px] text-muted-foreground/40 font-mono opacity-0 group-data-[selected=true]:opacity-100 transition-opacity">
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* Actions */}
            <Command.Group heading={
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1">
                ACTIONS
              </span>
            }>
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Command.Item
                    key={action.id}
                    value={action.label}
                    onSelect={() => handleSelect(action.action)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer
                      data-[selected=true]:bg-accent-muted data-[selected=true]:text-accent
                      text-muted-foreground hover:text-accent transition-all"
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 font-mono text-xs">{action.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* Footer hint */}
            <div className="px-3 py-2 text-[9px] font-mono text-muted-foreground/30 border-t border-border/10 mt-1">
              Type to search · ↑↓ to navigate · Enter to select · Esc to close
            </div>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
