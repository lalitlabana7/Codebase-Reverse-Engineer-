"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const shortcuts = [
  { key: "d", label: "Dashboard", href: "/dashboard", mod: false },
  { key: "r", label: "Repositories", href: "/dashboard/repositories", mod: false },
  { key: "s", label: "Security", href: "/dashboard/security", mod: false },
  { key: "g", label: "Dependencies", href: "/dashboard/dependencies", mod: false },
  { key: "c", label: "AI Chat", href: "/dashboard/chat", mod: false },
  { key: "i", label: "Diagrams", href: "/dashboard/diagrams", mod: false },
  { key: "n", label: "Documents", href: "/dashboard/documents", mod: false },
  { key: "f", label: "Scans", href: "/dashboard/scans", mod: false },
  { key: "w", label: "Websites", href: "/dashboard/websites", mod: false },
  { key: ",", label: "Settings", href: "/dashboard/settings", mod: false },
];

interface ShortcutHintProps {
  visible: boolean;
}

export function KeyboardShortcutHints({ visible }: ShortcutHintProps) {
  const pathname = usePathname();

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 animate-fade-in">
      <div className="glass-strong rounded-lg p-3 border border-border/20 max-w-[280px] shadow-xl">
        <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
          Keyboard Shortcuts
        </p>
        <div className="grid grid-cols-2 gap-1">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded-sm text-[10px] font-mono transition-colors",
                pathname === s.href
                  ? "text-primary bg-primary-muted"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <kbd className="inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-mono bg-background/50 border border-border/20 text-foreground/60">
                {s.key.toUpperCase()}
              </kbd>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[8px] font-mono text-muted-foreground/40 mt-2 border-t border-border/10 pt-2">
          Press ? to toggle · ⌘K for command palette
        </p>
      </div>
    </div>
  );
}

/**
 * Global keyboard navigation hook.
 * Call once in the dashboard layout.
 */
export function useKeyboardNavigation(showHints: boolean, setShowHints: (v: boolean) => void) {
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      // Don't trigger if command palette is open (handled there)
      if (e.metaKey || e.ctrlKey) return;

      // ? to toggle shortcut hints
      if (e.key === "?") {
        e.preventDefault();
        setShowHints(!showHints);
        return;
      }

      // Single-key navigation (case-insensitive)
      const match = shortcuts.find(
        (s) => s.key === e.key.toLowerCase() && !e.metaKey && !e.ctrlKey
      );
      if (match) {
        e.preventDefault();
        router.push(match.href);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [router, showHints, setShowHints]);
}
