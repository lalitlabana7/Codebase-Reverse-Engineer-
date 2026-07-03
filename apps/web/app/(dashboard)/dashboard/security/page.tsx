"use client";

import { motion } from "framer-motion";
import { Shield, Terminal, Loader2, Lock, GitBranch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/effects/empty-state";

interface SecurityFinding {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  filePath: string;
  codeSnippet?: string;
  recommendation?: string;
  createdAt: string;
}

interface SecurityScore {
  overall: string;
  codeQuality: string;
  dependencyHealth: string;
  architectureScore: string;
  vulnerabilityScore: string;
  riskPosture: string;
}

export default function SecurityPage() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories");
      const data = await res.json();
      return data.repositories || [];
    },
  });

  const { data: securityData, isLoading } = useQuery({
    queryKey: ["security-data", selectedRepo],
    queryFn: async () => {
      if (!selectedRepo) return null;
      const res = await fetch(`/api/security?repositoryId=${selectedRepo}`);
      return res.json();
    },
    enabled: !!selectedRepo,
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return "terminal-badge-danger";
      case "high": return "terminal-badge-accent";
      case "medium": return "terminal-badge-secondary";
      default: return "terminal-badge";
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>[root@acre]$ <span className="text-primary">./security/scan --full</span></span>
          </div>
          <h1 className="text-lg font-bold tracking-wider text-primary uppercase">Security Center</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">Vulnerability detection and threat analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {repos && repos.length > 0 && (
            <select
              value={selectedRepo ?? ""}
              onChange={(e) => setSelectedRepo(e.target.value || null)}
              className="terminal-select text-xs"
            >
              <option value="">Select repo...</option>
              {repos.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {!selectedRepo ? (
        <EmptyState
          icon={<Lock className="w-5 h-5 text-primary" />}
          command="$ ./security/scan --select-target"
          title="Select a Repository"
          description="Choose a repository from the dropdown above to view AI-powered security scan results, vulnerability findings, and threat analysis."
          action={repos && repos.length > 0 ? undefined : { label: "CONNECT REPO", icon: <GitBranch className="w-3 h-3 mr-1.5" />, onClick: () => window.location.href = "/dashboard/repositories" }}
          steps={[
            { command: "./security/scan --full", description: "Run a comprehensive vulnerability scan" },
            { command: "./security/score --repository=./repo", description: "View detailed security score breakdown" },
            { command: "cat ./findings | grep critical", description: "Filter and review critical findings" },
          ]}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>Loading security data...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Score Cards */}
          {securityData?.score && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                { label: "OVERALL SCORE", value: `${(securityData.score as SecurityScore).overall}/100`, color: parseInt((securityData.score as SecurityScore).overall) >= 70 ? "text-success" : parseInt((securityData.score as SecurityScore).overall) >= 40 ? "text-accent" : "text-danger" },
                { label: "CODE QUALITY", value: (securityData.score as SecurityScore).codeQuality, color: "text-primary" },
                { label: "VULN SCORE", value: (securityData.score as SecurityScore).vulnerabilityScore, color: "text-secondary" },
                { label: "RISK POSTURE", value: (securityData.score as SecurityScore).riskPosture.toUpperCase(), color: (securityData.score as SecurityScore).riskPosture === "low" ? "text-success" : (securityData.score as SecurityScore).riskPosture === "high" ? "text-accent" : "text-danger" },
              ].map((item) => (
                <Card key={item.label} className="terminal-panel">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-mono text-muted-foreground tracking-wider">{item.label}</p>
                    <p className={cn("text-lg font-bold font-mono mt-1", item.color)}>{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Findings */}
          {securityData?.findings && securityData.findings.length > 0 ? (
            <div>
              <h2 className="text-xs font-mono text-muted-foreground tracking-wider mb-3 uppercase">Findings ({securityData.findings.length})</h2>
              <div className="space-y-1.5">
                {securityData.findings.map((finding: SecurityFinding) => (
                  <Card key={finding.id} className="terminal-panel cursor-pointer" onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={cn("text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm border", getSeverityBadge(finding.severity))}>
                            {finding.severity}
                          </span>
                          <span className="text-xs font-mono text-primary truncate">{finding.title}</span>
                        </div>
                        {finding.filePath && (
                          <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[200px] ml-2">{finding.filePath}</span>
                        )}
                      </div>
                      {expandedFinding === finding.id && (
                        <div className="mt-2 pt-2 border-t border-primary/5 space-y-2">
                          <p className="text-[11px] font-mono text-muted-foreground">{finding.description}</p>
                          {finding.recommendation && (
                            <div className="p-2 rounded-sm bg-primary-muted/30 border border-primary/10">
                              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">Recommendation</p>
                              <p className="text-[11px] font-mono text-primary">{finding.recommendation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="terminal-panel">
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="w-6 h-6 text-success mb-2" />
                  <p className="text-xs font-mono text-success">No findings — repository is clean.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
