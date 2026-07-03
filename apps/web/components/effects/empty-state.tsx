"use client";

import { motion } from "framer-motion";
import { ArrowRight, GitBranch } from "lucide-react";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: ReactNode;
  command?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  steps?: Array<{
    command: string;
    description: string;
  }>;
}

export function EmptyState({
  icon,
  command = "$ ./init",
  title,
  description,
  action,
  secondaryAction,
  steps,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="terminal-panel rounded-xl overflow-hidden"
    >
      <div className="p-6 sm:p-8 text-center max-w-lg mx-auto">
        {/* Icon */}
        {icon && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-muted border border-primary/20 mb-5"
          >
            {icon}
          </motion.div>
        )}

        {/* Terminal command */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/50 border border-border/20 mb-4 font-mono"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
          <code className="text-[11px] text-primary">{command}</code>
        </motion.div>

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-base font-bold font-mono text-primary tracking-tight mb-2"
        >
          {title}
        </motion.h3>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-mono text-muted-foreground leading-relaxed mb-6"
        >
          {description}
        </motion.p>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          {action && (
            <>
              {action.href ? (
                <a href={action.href}>
                  <Button size="sm">
                    {action.icon}
                    {action.label}
                  </Button>
                </a>
              ) : (
                <Button size="sm" onClick={action.onClick}>
                  {action.icon}
                  {action.label}
                </Button>
              )}
            </>
          )}
          {secondaryAction && (
            <>
              {secondaryAction.href ? (
                <a
                  href={secondaryAction.href}
                  className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  {secondaryAction.label}
                  <ArrowRight className="w-3 h-3" />
                </a>
              ) : (
                <button
                  onClick={secondaryAction.onClick}
                  className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  {secondaryAction.label}
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </motion.div>

        {/* Steps (optional onboarding) */}
        {steps && steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 pt-5 border-t border-border/20 text-left"
          >
            <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-3">
              QUICK START
            </p>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-background/30 border border-border/10"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-sm bg-primary-muted text-[10px] font-mono text-primary flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <code className="text-[11px] font-mono text-primary">
                      $ {step.command}
                    </code>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/** Shorthand for the common "no repos" empty state */
export function NoReposEmptyState({ onConnect }: { onConnect?: () => void }) {
  return (
    <EmptyState
      icon={<GitBranch className="w-5 h-5 text-primary" />}
      command="$ ls ./repositories"
      title="No Repositories Connected"
      description="Connect a Git repository to start AI-powered security analysis, dependency tracking, and automated documentation."
      action={{
        label: "CONNECT REPOSITORY",
        onClick: onConnect,
        icon: <GitBranch className="w-3 h-3 mr-1.5" />,
      }}
      steps={[
        { command: "connect https://github.com/owner/repo", description: "Paste any public Git URL" },
        { command: "./analyze --full", description: "Automatic clone, scan, and dependency detection" },
        { command: "cat ./dashboard/status", description: "View real-time security insights and findings" },
      ]}
    />
  );
}
