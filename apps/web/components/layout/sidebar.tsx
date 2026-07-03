"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GitBranch,
  Shield,
  Bot,
  FileText,
  Share2,
  Puzzle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Scan,
  Globe,
  Terminal,
} from "lucide-react";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

const navigation = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "Analysis",
    items: [
      { label: "Repositories", href: "/dashboard/repositories", icon: GitBranch },
      { label: "Websites", href: "/dashboard/websites", icon: Globe },
      { label: "Security", href: "/dashboard/security", icon: Shield },
      { label: "Dependencies", href: "/dashboard/dependencies", icon: Share2 },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { label: "AI Chat", href: "/dashboard/chat", icon: Bot },
      { label: "Documents", href: "/dashboard/documents", icon: FileText },
      { label: "Diagrams", href: "/dashboard/diagrams", icon: Puzzle },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Scans", href: "/dashboard/scans", icon: Scan },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  useEffect(() => {
    const sidebarWidth = collapsed ? 56 : 220;
    document.documentElement.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "h-screen fixed left-0 top-0 z-30 flex flex-col transition-all duration-300 ease-in-out border-r border-border",
        "bg-background",
        collapsed ? "w-[56px]" : "w-[220px]"
      )}
      style={{ borderColor: "rgba(34, 197, 94, 0.08)" }}

    >
      {/* Logo — terminal header */}
      <div
        className={cn(
          "flex items-center h-11 px-3 border-b",
          collapsed ? "justify-center" : "gap-2.5"
        )}
      >
        <div className="relative flex items-center justify-center w-7 h-7 flex-shrink-0">
          <Terminal className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-wider text-primary">ACRE</span>
            <span className="text-[10px] text-muted-foreground font-mono">v0.1</span>
          </div>
        )}
      </div>

      {/* Terminal prompt line */}
      {!collapsed && (
        <div className="px-3 py-1.5 border-b border-border">
          <span className="text-[10px] text-muted-foreground font-mono">
            <span className="text-primary">root@acre</span>:<span className="text-secondary">~</span>$ _
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-1.5 space-y-4">
        {navigation.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="px-2 mb-1 text-[9px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-1.5 text-xs font-mono transition-all duration-150 rounded-sm",
                      collapsed && "justify-center px-1",
                      isActive
                        ? "text-primary bg-primary-muted"
                        : "text-muted-foreground hover:text-primary hover:bg-primary-muted/50"
                    )}
                    style={isActive ? { boxShadow: "inset 2px 0 0 var(--color-primary)" } : {}}
                  >
                    <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive && "text-primary")} />
                    {!collapsed && <span className="tracking-wide">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom status bar */}
      <div className="border-t border-border px-2 py-1.5">
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-mono justify-center">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
          <span>SYSTEM ONLINE</span>
        </div>
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 mt-1 py-1 rounded-sm text-[10px] text-muted-foreground hover:text-primary hover:bg-primary-muted/30 transition-all"
          >
            <ChevronLeft className="w-3 h-3" />
            <span className="font-mono">COLLAPSE</span>
          </button>
        )}
        {collapsed && (
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center py-1 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary-muted/30 transition-all"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </aside>
  );
}
