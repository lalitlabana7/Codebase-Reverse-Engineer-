"use client";

import { motion } from "framer-motion";
import { Package, AlertTriangle, GitBranch, ExternalLink, Shield, Layers, Terminal, Search, Loader2, PackageCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/effects/empty-state";

interface Dependency {
  id: string;
  repositoryId: string;
  name: string;
  version: string;
  latestVersion?: string | null;
  type: string;
  isDirect: boolean;
  isDevDependency?: boolean | null;
  description?: string | null;
  homepage?: string | null;
  license?: string | null;
  isOutdated?: boolean | null;
  riskScore?: string | null;
  vulnerabilities?: Record<string, unknown>[] | null;
}

interface DependencySummary {
  total: number;
  direct: number;
  devDeps: number;
  outdated: number;
  vulnerable: number;
  ecosystems: string[];
}

export default function DependenciesPage() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDep, setExpandedDep] = useState<string | null>(null);

  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories");
      const data = await res.json();
      return data.repositories || [];
    },
  });

  const { data: depsData, isLoading } = useQuery({
    queryKey: ["dependencies", selectedRepo],
    queryFn: async () => {
      const params = selectedRepo ? `?repositoryId=${selectedRepo}` : "";
      const res = await fetch(`/api/dependencies${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const dependencies: Dependency[] = depsData?.dependencies ?? [];
  const summary: DependencySummary = depsData?.summary ?? { total: 0, direct: 0, devDeps: 0, outdated: 0, vulnerable: 0, ecosystems: [] };

  const filtered = dependencies.filter((dep) =>
    searchQuery ? dep.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>[root@acre]$ <span className="text-primary">./deps/analyze</span></span>
          </div>
          <h1 className="text-lg font-bold tracking-wider text-primary uppercase">Dependencies</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">Package analysis and vulnerability tracking</p>
        </div>
        {repos && repos.length > 0 && (
          <select value={selectedRepo ?? ""} onChange={(e) => { setSelectedRepo(e.target.value || null); setSearchQuery(""); }}
            className="terminal-select text-xs">
            <option value="">All repos</option>
            {repos.map((r: any) => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </select>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {[
          { label: "TOTAL", value: summary.total, icon: Package, color: "text-primary", bg: "bg-primary-muted" },
          { label: "DIRECT", value: summary.direct, icon: GitBranch, color: "text-secondary", bg: "bg-secondary-muted" },
          { label: "DEV DEPS", value: summary.devDeps, icon: Layers, color: "text-accent", bg: "bg-accent-muted" },
          { label: "OUTDATED", value: summary.outdated, icon: AlertTriangle, color: summary.outdated > 0 ? "text-accent" : "text-muted-foreground", bg: summary.outdated > 0 ? "bg-accent-muted" : "bg-transparent" },
          { label: "VULNERABLE", value: summary.vulnerable, icon: Shield, color: summary.vulnerable > 0 ? "text-danger" : "text-success", bg: summary.vulnerable > 0 ? "bg-danger-muted" : "bg-success-muted" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="terminal-panel">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground tracking-wider">{item.label}</p>
                    <p className="text-lg font-bold font-mono mt-1">{item.value.toLocaleString()}</p>
                  </div>
                  <div className={`p-1.5 rounded-sm ${item.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      {dependencies.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 terminal-input text-xs">
            <Search className="w-3 h-3 text-muted-foreground" />
            <input type="text" placeholder="grep packages..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-primary placeholder:text-muted-foreground outline-none flex-1 font-mono" />
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-4 h-4 animate-spin text-primary mr-2" />
          <span className="text-xs font-mono text-muted-foreground">Scanning dependencies...</span>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((dep) => (
            <Card key={dep.id} className="terminal-panel cursor-pointer" onClick={() => setExpandedDep(expandedDep === dep.id ? null : dep.id)}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-primary truncate">{dep.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">@{dep.version}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[8px] px-1 py-0">{dep.type}</Badge>
                      {dep.isDirect && <Badge variant="primary" className="text-[8px] px-1 py-0">DIRECT</Badge>}
                      {dep.isDevDependency && <Badge variant="secondary" className="text-[8px] px-1 py-0">DEV</Badge>}
                      {dep.isOutdated && <Badge variant="warning" className="text-[8px] px-1 py-0">OUTDATED</Badge>}
                      {dep.vulnerabilities && dep.vulnerabilities.length > 0 && (
                        <Badge variant="danger" className="text-[8px] px-1 py-0">{dep.vulnerabilities.length} VULN</Badge>
                      )}
                    </div>
                  </div>
                  {dep.homepage && (
                    <a href={dep.homepage} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary-muted/30 transition-all opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                {expandedDep === dep.id && dep.description && (
                  <p className="text-[10px] text-muted-foreground font-mono mt-2 pt-2 border-t border-primary/5">{dep.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : dependencies.length > 0 ? (
        <Card className="terminal-panel">
          <CardContent className="py-8 text-center">
            <Search className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-mono text-muted-foreground">No packages match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={<PackageCheck className="w-5 h-5 text-primary" />}
          command="$ ./deps/analyze"
          title="No Dependency Data"
          description={repos && repos.length > 0 ? "Select a repository from the dropdown above to view dependency analysis results." : "Connect a repository first to analyze packages, detect vulnerabilities, and track outdated dependencies."}
          action={repos && repos.length > 0 ? undefined : { label: "CONNECT REPO", icon: <GitBranch className="w-3 h-3 mr-1.5" />, onClick: () => window.location.href = "/dashboard/repositories" }}
          steps={[
            { command: "./deps/analyze --depth=full", description: "Scan all packages and transitive dependencies" },
            { command: "grep -r 'vulnerable' ./deps/report", description: "Identify vulnerable packages needing updates" },
            { command: "cat ./deps/sbom", description: "View complete software bill of materials" },
          ]}
        />
      )}
    </motion.div>
  );
}
