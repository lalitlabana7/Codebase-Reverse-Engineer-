"use client";

import { useQuery } from "@tanstack/react-query";
import { Wifi, Activity, Cpu, Database, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function SocStatusBar() {
  // Real health check via /api/health
  const { data: health, isError: healthError } = useQuery({
    queryKey: ["health-check"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      const data = await res.json();
      return data;
    },
    refetchInterval: 15000,
  });

  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories");
      const data = await res.json();
      return data.repositories || [];
    },
    refetchInterval: 15000,
  });

  const systemOnline = !healthError && health?.status === "ok";
  const dbConnected = !healthError && health?.database === "connected";
  const queued = repos?.filter((r: any) => r.cloneStatus === "cloning").length ?? 0;
  const failed = repos?.filter((r: any) => r.cloneStatus === "failed").length ?? 0;
  const total = repos?.length ?? 0;

  const indicators = [
    {
      label: "SYSTEM",
      value: systemOnline ? "ONLINE" : "OFFLINE",
      dot: systemOnline ? "bg-success" : "bg-danger animate-pulse-dot",
      pulse: systemOnline,
      icon: Wifi,
    },
    {
      label: "DATABASE",
      value: dbConnected ? "CONNECTED" : "DISCONNECTED",
      dot: dbConnected ? "bg-success" : "bg-danger animate-pulse-dot",
      pulse: dbConnected,
      icon: Database,
    },
    {
      label: "REPOS",
      value: `${total} connected`,
      dot: total > 0 ? "bg-primary" : "bg-muted",
      icon: Cpu,
    },
    {
      label: "ACTIVE",
      value: `${queued} queued`,
      dot: queued > 0 ? "bg-accent animate-pulse-dot" : "bg-muted",
      icon: Activity,
    },
    {
      label: "FAILED",
      value: `${failed} repos`,
      dot: failed > 0 ? "bg-danger animate-pulse-dot" : "bg-muted",
      icon: Zap,
    },
  ];

  return (
    <div className="flex items-center gap-0.5 h-full">
      {indicators.map((ind) => {
        const Icon = ind.icon;
        return (
          <div
            key={ind.label}
            className="flex items-center gap-1.5 px-2.5 py-1 border-r border-border/20 last:border-r-0 h-full"
            title={`${ind.label}: ${ind.value}`}
          >
            <Icon className="w-2.5 h-2.5 text-muted-foreground hidden sm:block" />
            <span
              className={cn(
                "inline-block w-1.5 h-1.5 rounded-full flex-shrink-0",
                ind.dot,
                ind.pulse && "animate-pulse-dot"
              )}
            />
            <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">
              <span className="hidden sm:inline">{ind.label}: </span>
              <span className="text-foreground/80">{ind.value}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
