"use client";

import { motion } from "framer-motion";
import { GitBranch, Plus, Globe, ExternalLink, Terminal, Trash2, Loader2, Github } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/effects/empty-state";
import { FileTree } from "@/components/effects/file-tree";

interface Repository {
  id: string;
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  cloneStatus: string;
  stars: number;
  fileCount: number | null;
  lastAnalysisAt: string | null;
  createdAt: string;
}

export default function RepositoriesPage() {
  const [showConnect, setShowConnect] = useState(false);
  const [gitUrl, setGitUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.repositories as Repository[];
    },
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/repositories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/repositories/${id}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start analysis");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    await deleteMutation.mutateAsync(id);
    setDeleting(null);
  };

  const handleAnalyze = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await analyzeMutation.mutateAsync(id);
  };

  const handleConnectGitUrl = async () => {
    if (!gitUrl.trim()) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: gitUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setGitUrl("");
        setShowConnect(false);
        queryClient.invalidateQueries({ queryKey: ["repositories"] });
      } else {
        setError(data.error || "Failed to connect. Check the URL.");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setConnecting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "cloned": return "bg-success shadow-[0_0_6px_rgba(34,197,94,0.6)]";
      case "cloning": return "bg-accent shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse-dot";
      case "failed": return "bg-danger shadow-[0_0_6px_rgba(239,68,68,0.6)]";
      default: return "bg-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "cloned": return "CLONED";
      case "cloning": return "CLONING...";
      case "failed": return "FAILED";
      default: return "PENDING";
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>[root@acre]$ <span className="text-primary">ls ./repositories</span></span>
          </div>
          <h1 className="text-lg font-bold tracking-wider text-primary uppercase">Repositories</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">Connect and analyze code repositories</p>
        </div>
        <Button size="sm" onClick={() => setShowConnect(true)}>
          <Plus className="w-3 h-3 mr-1.5" />
          CONNECT
        </Button>
      </div>

      {/* Connect Dialog */}
      {showConnect && (
        <Card className="terminal-panel-elevated">
          <CardContent className="p-5">
            <h3 className="text-xs font-mono font-semibold text-primary mb-3 tracking-wider uppercase">$ connect --target=repository</h3>
            <div className="space-y-3">
              {/* Git URL */}
              <div className="flex items-center gap-3 p-3 rounded-sm border border-primary/10 bg-primary-muted/30">
                <div className="p-1.5 rounded-sm bg-primary-muted">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-mono text-primary">Git URL</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Paste any public Git repository URL</p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-2.5 rounded-sm bg-danger-muted border border-danger/20">
                  <p className="text-xs font-mono text-danger">{error}</p>
                </div>
              )}

              {/* Drag & Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const text = e.dataTransfer.getData("text");
                  if (text) {
                    setGitUrl(text.trim());
                    setError(null);
                  }
                }}
                className={`flex items-center gap-3 p-3 rounded-sm border-2 border-dashed transition-all cursor-pointer ${
                  dragOver
                    ? "border-primary bg-primary-muted/20"
                    : "border-border/20 hover:border-primary/30 hover:bg-primary-muted/10"
                }`}
              >
                <div className={`p-1.5 rounded-sm transition-colors ${dragOver ? "bg-primary-muted" : "bg-transparent"}`}>
                  <Globe className={`w-3.5 h-3.5 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className={`text-xs font-mono transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`}>
                    {dragOver ? "DROP URL HERE" : "Drag & drop a GitHub URL or type below"}
                  </p>
                  <p className="text-[9px] text-muted-foreground/50 font-mono mt-0.5">
                    Supports https://github.com/owner/repo format
                  </p>
                </div>
              </div>

              {/* Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://github.com/owner/repo"
                  value={gitUrl}
                  onChange={(e) => { setGitUrl(e.target.value); setError(null); }}
                  className="flex-1 terminal-input px-3 py-2 text-xs font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleConnectGitUrl()}
                />
                <Button onClick={handleConnectGitUrl} disabled={connecting || !gitUrl.trim()} size="sm">
                  {connecting ? "CONNECTING..." : "CONNECT"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowConnect(false); setError(null); }}>
                  CANCEL
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>Loading repositories...</span>
          </div>
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((repo) => (
            <Card key={repo.id} className="terminal-panel group"
              onClick={() => setExpandedRepo(expandedRepo === repo.id ? null : repo.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-1.5 rounded-sm bg-primary-muted mt-0.5">
                      <GitBranch className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-mono font-semibold text-primary truncate">{repo.name}</h3>
                        <span className={cn("inline-block w-2 h-2 rounded-full", getStatusColor(repo.cloneStatus))} />
                      </div>
                      {repo.description && (
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {repo.language && (
                          <Badge variant="primary" className="text-[9px] px-1 py-0">{repo.language}</Badge>
                        )}
                        <Badge variant="outline" className="text-[9px]">{getStatusLabel(repo.cloneStatus)}</Badge>
                        {repo.fileCount && (
                          <span className="text-[10px] text-muted-foreground font-mono">{repo.fileCount} files</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    {repo.cloneStatus !== "cloning" && (
                      <button onClick={(e) => handleAnalyze(repo.id, e)} disabled={analyzeMutation.isPending}
                        className="p-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary-muted/30 transition-all text-[9px] font-mono" title="Run Analysis">
                        {analyzeMutation.isPending && analyzeMutation.variables === repo.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span className="tracking-wider">▶</span>
                        )}
                      </button>
                    )}
                    {repo.cloneStatus === "failed" && (
                      <a href="/dashboard/scans" className="text-[9px] text-danger font-mono hover:underline">VIEW ERROR →</a>
                    )}
                    <a href={repo.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary-muted/30 transition-all">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button onClick={(e) => handleDelete(repo.id, e)} disabled={deleting === repo.id}
                      className="p-1.5 rounded-sm text-muted-foreground hover:text-danger hover:bg-danger-muted transition-all">
                      {deleting === repo.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                {/* Expandable file tree */}
                {expandedRepo === repo.id && (
                  <div className="mt-4 pt-4 border-t border-primary/5">
                    <FileTree
                      nodes={[
                        { name: "src", type: "directory", children: [
                          { name: "index.ts", type: "file", size: 2048 },
                          { name: "utils.ts", type: "file", size: 1024 },
                          { name: "components", type: "directory", children: [
                            { name: "App.tsx", type: "file", size: 4096 },
                            { name: "Header.tsx", type: "file", size: 1536 },
                          ]},
                        ]},
                        { name: "package.json", type: "file", size: 512 },
                        { name: "tsconfig.json", type: "file", size: 256 },
                      ]}
                      onFileClick={(node) => console.log("File clicked:", node.name)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Github className="w-5 h-5 text-primary" />}
          command="$ ls ./repositories"
          title="No Repositories Connected"
          description="Connect a Git repository to start AI-powered security analysis, dependency tracking, and automated documentation."
          action={{ label: "CONNECT REPOSITORY", icon: <GitBranch className="w-3 h-3 mr-1.5" />, onClick: () => setShowConnect(true) }}
          steps={[
            { command: "connect https://github.com/owner/repo", description: "Paste any public Git URL" },
            { command: "./analyze --full", description: "Automatic clone, scan, and dependency detection" },
            { command: "cat ./dashboard/status", description: "View real-time security insights and findings" },
          ]}
        />
      )}
    </motion.div>
  );
}
