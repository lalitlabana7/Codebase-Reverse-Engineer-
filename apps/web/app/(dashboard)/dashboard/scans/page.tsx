"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, Loader2, RefreshCw, Terminal, ChevronDown, Activity, GitBranch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/effects/empty-state";

interface Analysis {
  id: string;
  repositoryId: string;
  repositoryName?: string;
  type: string;
  status: "queued" | "processing" | "completed" | "failed";
  summary: Record<string, unknown> | null;
  technicalSummary?: string | null;
  startedAt: string | null;
  completedAt: string | null;
  error?: string | null;
  createdAt: string;
}

type StatusFilter = "all" | "queued" | "processing" | "completed" | "failed";

const statusConfig = {
  queued: { label: "QUEUED", icon: Clock, color: "text-muted-foreground", badge: "terminal-badge" },
  processing: { label: "PROCESSING", icon: Loader2, color: "text-accent", badge: "terminal-badge-accent" },
  completed: { label: "COMPLETED", icon: CheckCircle2, color: "text-success", badge: "terminal-badge-success" },
  failed: { label: "FAILED", icon: XCircle, color: "text-danger", badge: "terminal-badge-danger" },
} as const;

export default function ScansPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["analyses", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/analyses${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.analyses as Analysis[];
    },
    refetchInterval: 10_000,
  });

  const displayAnalyses = data?.filter(a => statusFilter === "all" || a.status === statusFilter) ?? [];

  const getDuration = (a: Analysis) => {
    if (!a.startedAt || !a.completedAt) return null;
    const ms = new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "ALL" },
    { value: "completed", label: "COMPLETED" },
    { value: "processing", label: "PROCESSING" },
    { value: "failed", label: "FAILED" },
    { value: "queued", label: "QUEUED" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>[root@acre]$ <span className="text-primary">cat ./var/log/scans</span></span>
          </div>
          <h1 className="text-lg font-bold tracking-wider text-primary uppercase">Scans</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">Analysis and security scan history</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-3 h-3 mr-1" />REFRESH</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filters.map((f) => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className={cn("px-2.5 py-1 text-[10px] font-mono rounded-sm transition-all tracking-wider",
              statusFilter === f.value ? "bg-primary-muted text-primary border border-primary/20" : "text-muted-foreground hover:text-primary border border-transparent")}>
            {f.label} <span className="text-[9px] opacity-70">({data?.filter(a => f.value === "all" || a.status === f.value).length ?? 0})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-4 h-4 animate-spin text-primary mr-2" />
          <span className="text-xs font-mono text-muted-foreground">Loading scans...</span>
        </div>
      ) : displayAnalyses.length > 0 ? (
        <div className="space-y-1.5">
          {displayAnalyses.map((a) => {
            const config = statusConfig[a.status] ?? statusConfig.queued;
            const Icon = config.icon;
            const isExpanded = expandedId === a.id;
            return (
              <Card key={a.id} className={cn("terminal-panel cursor-pointer", isExpanded && "border-primary/30")}
                onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className={`p-1 rounded-sm mt-0.5 ${a.status === "failed" ? "bg-danger-muted" : "bg-primary-muted"}`}>
                        <Icon className={cn("w-3 h-3", config.color, a.status === "processing" && "animate-spin")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono text-primary">{a.repositoryName ?? "Unknown"}</span>
                          <span className={cn("text-[8px] font-mono uppercase tracking-wider px-1 py-0.5 rounded-sm border", config.badge)}>{config.label}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">{a.type}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground font-mono">
                          <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                          {getDuration(a) && <span>· {getDuration(a)}</span>}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-primary/5 space-y-2">
                      {a.technicalSummary && <p className="text-[11px] font-mono text-primary/80">{a.technicalSummary}</p>}
                      {a.error && (
                        <div className="p-2 rounded-sm bg-danger-muted border border-danger/20">
                          <p className="text-[11px] font-mono text-danger">{a.error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Activity className="w-5 h-5 text-primary" />}
          command="$ cat ./var/log/scans"
          title="No Scans Yet"
          description="Run your first analysis to see scan history and results here. Each scan includes clone, dependency detection, AST parsing, and AI-powered vulnerability analysis."
          action={{ label: "GO TO REPOSITORIES", icon: <GitBranch className="w-3 h-3 mr-1.5" />, onClick: () => window.location.href = "/dashboard/repositories" }}
          steps={[
            { command: "./repos/connect https://github.com/owner/repo", description: "Add a repository to analyze" },
            { command: "docker run --rm -v $PWD:/app acre:latest --scan", description: "Run a full AI-powered analysis pipeline" },
            { command: "tail -f ./var/log/scans | grep 'status'", description: "Monitor scan progress in real-time" },
          ]}
        />
      )}
    </motion.div>
  );
}
