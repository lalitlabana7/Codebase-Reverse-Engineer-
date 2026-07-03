"use client";

import { motion } from "framer-motion";
import {
  GitBranch,
  Shield,
  AlertTriangle,
  Activity,
  Code2,
  Lock,
  Zap,
  FileText,
  Bot,
  Terminal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SecurityTrendChart, FindingsDistribution, RepoActivityChart } from "@/components/dashboard/charts";
import { AnimatedCounter } from "@/components/effects/animated-counter";
import { DashboardSkeleton } from "@/components/effects/skeleton";
import { useQuery } from "@tanstack/react-query";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface DashboardStats {
  totalRepositories: number;
  totalAnalyses: number;
  openFindings: number;
  criticalFindings: number;
  averageSecurityScore: number;
  recentActivity: Array<{
    id: string;
    action: string;
    metadata: Record<string, unknown>;
    userName: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      return data.stats as DashboardStats;
    },
    refetchInterval: 30_000,
  });

  const statCards = [
    {
      label: "REPOSITORIES",
      value: stats?.totalRepositories ?? 0,
      change: `${stats?.totalAnalyses ?? 0} analyses`,
      icon: GitBranch,
      color: "text-primary",
      bg: "bg-primary-muted",
    },
    {
      label: "SECURITY SCORE",
      value: stats?.averageSecurityScore ? `${stats.averageSecurityScore}/100` : "--",
      change: stats?.averageSecurityScore ? "Latest scan" : "No data",
      icon: Shield,
      color: stats && stats.averageSecurityScore >= 70 ? "text-success" : "text-muted-foreground",
      bg: stats && stats.averageSecurityScore >= 70 ? "bg-success-muted" : "bg-transparent",
    },
    {
      label: "OPEN FINDINGS",
      value: stats?.openFindings ?? 0,
      change: `${stats?.criticalFindings ?? 0} critical`,
      icon: AlertTriangle,
      color: stats && stats.openFindings > 0 ? "text-danger" : "text-muted-foreground",
      bg: stats && stats.openFindings > 0 ? "bg-danger-muted" : "bg-transparent",
    },
    {
      label: "ANALYSES RUN",
      value: stats?.totalAnalyses ?? 0,
      change: "All time total",
      icon: Activity,
      color: "text-secondary",
      bg: "bg-secondary-muted",
    },
  ];

  const quickActions = [
    { label: "ANALYZE REPO", description: "Connect a Git URL or repo", icon: Code2, color: "text-primary", bg: "bg-primary-muted", href: "/dashboard/repositories" },
    { label: "SECURITY SCAN", description: "Run security analysis", icon: Lock, color: "text-danger", bg: "bg-danger-muted", href: "/dashboard/security" },
    { label: "AI CHAT", description: "Ask about your codebase", icon: Bot, color: "text-secondary", bg: "bg-secondary-muted", href: "/dashboard/chat" },
    { label: "GENERATE DOCS", description: "Auto-generate docs", icon: FileText, color: "text-accent", bg: "bg-accent-muted", href: "/dashboard/documents" },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Terminal header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>[root@acre]${" "}<span className="text-primary">cat ./dashboard/status</span></span>
          </div>
          <h1 className="text-lg font-bold tracking-wider text-primary uppercase">Dashboard</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            ACRE Security Terminal — AI-powered code analysis platform
          </p>
        </div>
        <a href="/dashboard/repositories">
          <Button size="sm">
            <Zap className="w-3 h-3 mr-1.5" />
            NEW ANALYSIS
          </Button>
        </a>
      </motion.div>

      {isLoading ? (
        <div className="py-8">
          <DashboardSkeleton />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="terminal-panel hover-lift">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground tracking-wider">{stat.label}</p>
                        <p className="text-xl font-bold text-primary mt-1 font-mono">
                          {typeof stat.value === "number" ? (
                            <AnimatedCounter value={stat.value} duration={1000} />
                          ) : stat.value}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{stat.change}</p>
                      </div>
                      <div className={`p-1.5 rounded-sm ${stat.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <h2 className="text-xs font-mono text-muted-foreground tracking-wider mb-3 uppercase">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <a key={action.label} href={action.href}>
                    <Card className="terminal-panel cursor-pointer group h-full hover-lift">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-sm ${action.bg} group-hover:scale-110 transition-transform duration-200`}>
                            <Icon className={`w-3.5 h-3.5 ${action.color}`} />
                          </div>
                          <div>
                            <h3 className="text-xs font-mono font-semibold text-primary group-hover:text-primary-hover transition-colors">
                              {action.label}
                            </h3>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{action.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          </motion.div>

          {/* Charts Section */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <SecurityTrendChart />
            </div>
            <div>
              <FindingsDistribution />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <RepoActivityChart />
            </div>
          </motion.div>

          {/* Activity & Security */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 terminal-panel">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xs font-mono text-primary">
                    <Activity className="w-3 h-3" />
                    RECENT ACTIVITY
                  </CardTitle>
                  <Badge variant="primary">LIVE</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {stats.recentActivity.slice(0, 6).map((event) => (
                      <div key={event.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                        <span className="text-[10px] text-muted-foreground font-mono w-16 flex-shrink-0">
                          {new Date(event.createdAt).toLocaleTimeString()}
                        </span>
                        <span className="text-xs text-primary font-mono">
                          $ {event.action.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Terminal className="w-6 h-6 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground font-mono">No activity yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="terminal-panel">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xs font-mono text-primary">
                    <Shield className="w-3 h-3" />
                    SECURITY
                  </CardTitle>
                  <Badge variant="outline">SCORE</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {stats && stats.averageSecurityScore > 0 ? (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary font-mono">{stats.averageSecurityScore}</div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">AVERAGE SCORE</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-muted-foreground">OPEN FINDINGS</span>
                        <span className={stats.openFindings > 0 ? "text-danger" : "text-success"}>{stats.openFindings}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-muted-foreground">CRITICAL</span>
                        <span className={stats.criticalFindings > 0 ? "text-danger" : "text-muted-foreground"}>{stats.criticalFindings}</span>
                      </div>
                    </div>
                    <a href="/dashboard/security">
                      <Button variant="outline" size="sm" className="w-full">VIEW SECURITY →</Button>
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Shield className="w-6 h-6 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground font-mono">Run a scan to see data.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Empty state */}
          {(!stats || stats.totalRepositories === 0) && (
            <motion.div variants={itemVariants} className="terminal-panel p-6 text-center terminal-scan">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-sm bg-primary-muted border border-primary/20 mb-4">
                  <span className="terminal-dot-active" />
                  <span className="text-[10px] font-mono text-primary">READY TO ANALYZE</span>
                </div>
                <h3 className="text-sm font-mono font-semibold text-primary mb-2">$ ./initialize_analysis.sh</h3>
                <p className="text-xs text-muted-foreground font-mono mb-4 max-w-md mx-auto">
                  Connect a repository to begin AI-powered security analysis.
                </p>
                <a href="/dashboard/repositories">
                  <Button size="sm">
                    <GitBranch className="w-3 h-3 mr-1.5" />
                    CONNECT REPOSITORY
                  </Button>
                </a>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
