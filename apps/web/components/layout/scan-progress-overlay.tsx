"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const PROGRESS_STAGES = [
  { stage: "queued", label: "In Queue", icon: "○" },
  { stage: "cloning", label: "Cloning Repository", icon: "◷" },
  { stage: "scanning", label: "Scanning Files", icon: "◶" },
  { stage: "chunking", label: "Analyzing Code", icon: "◵" },
  { stage: "security", label: "Running Security Checks", icon: "◴" },
  { stage: "complete", label: "Complete", icon: "●" },
];

interface ActiveJob {
  id: string;
  repositoryId: string;
  repositoryName: string;
  status: string;
  stage: string;
  stageLabel: string;
  progress: number;
  message: string;
  createdAt: string;
}

export function ScanProgressOverlay() {
  const { data } = useQuery({
    queryKey: ["active-jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      if (!res.ok) return { active: [] };
      return res.json();
    },
    refetchInterval: 3000,
  });

  const activeJobs: ActiveJob[] = data?.active ?? [];

  if (activeJobs.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed bottom-4 right-4 z-50 w-full max-w-sm"
      >
        {activeJobs.map((job) => {
          const stageIndex = PROGRESS_STAGES.findIndex((s) => s.stage === job.stage);
          const isComplete = job.stage === "complete";
          const isFailed = job.status === "failed";

          return (
            <div
              key={job.id}
              className={cn(
                "terminal-panel-elevated rounded-sm border text-xs font-mono overflow-hidden",
                isFailed ? "border-danger/30" : "border-primary/20"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-primary/10 bg-primary-muted/20">
                <div className="flex items-center gap-2">
                  {isFailed ? (
                    <XCircle className="w-3.5 h-3.5 text-danger" />
                  ) : isComplete ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  )}
                  <span className="text-primary font-semibold tracking-wider uppercase">
                    {job.repositoryName}
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  {job.progress}%
                </span>
              </div>

              {/* Body */}
              <div className="px-3 py-2.5 space-y-2">
                {/* Progress bar */}
                <div className="terminal-progress">
                  <div
                    className="terminal-progress-bar"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>

                {/* Stage timeline */}
                <div className="space-y-1">
                  {PROGRESS_STAGES.slice(0, -1).map((stage, i) => {
                    const isActive = i === stageIndex;
                    const isDone = i < stageIndex;
                    const isFuture = i > stageIndex;

                    return (
                      <div
                        key={stage.stage}
                        className={cn(
                          "flex items-center gap-2 py-0.5 transition-all duration-300",
                          isActive ? "text-primary" : isDone ? "text-success/60" : "text-muted-foreground/30"
                        )}
                      >
                        <span
                          className={cn(
                            "font-mono text-[10px] w-3 text-center",
                            isActive && "animate-blink"
                          )}
                        >
                          {isActive ? "▶" : isDone ? "●" : "○"}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-mono tracking-wider",
                            isActive && "text-primary",
                            isDone && "text-success/60",
                            isFuture && "text-muted-foreground/30"
                          )}
                        >
                          {stage.label}
                        </span>
                        {isActive && (
                          <span className="ml-auto flex gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Complete/failed status */}
                  {isComplete && (
                    <div className="flex items-center gap-2 py-0.5 text-success">
                      <span className="font-mono text-[10px] w-3 text-center">●</span>
                      <span className="text-[10px] font-mono tracking-wider">Analysis Complete</span>
                    </div>
                  )}
                  {isFailed && (
                    <div className="flex items-center gap-2 py-0.5 text-danger">
                      <XCircle className="w-3 h-3" />
                      <span className="text-[10px] font-mono tracking-wider">Failed</span>
                    </div>
                  )}
                </div>

                {/* Status message */}
                {job.message && !isComplete && !isFailed && (
                  <div className="mt-1 px-2 py-1 rounded-sm bg-primary-muted/20 border border-primary/5">
                    <p className="text-[9px] text-muted-foreground font-mono">
                      <span className="text-primary">$</span> {job.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
