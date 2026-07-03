"use client";

import { cn } from "@/lib/utils";

/** Base shimmer block */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("skeleton rounded-md", className)}
      aria-hidden="true"
    />
  );
}

/** Stat card skeleton (4-column grid) */
export function StatCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="terminal-panel p-4 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Chart skeleton (2-column layout) */
export function ChartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 terminal-panel p-4 space-y-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-[200px] w-full" />
      </div>
      <div className="terminal-panel p-4 space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>
  );
}

/** List item skeleton */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="terminal-panel p-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-sm" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-2.5 w-2/5" />
          </div>
          <Skeleton className="h-6 w-16 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/** Full page skeleton — dashboard loading state */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      {/* Stats */}
      <StatCardSkeleton />
      {/* Quick actions */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="terminal-panel p-4 space-y-2">
              <Skeleton className="h-8 w-8 rounded-sm" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          ))}
        </div>
      </div>
      {/* Charts */}
      <ChartSkeleton />
    </div>
  );
}
