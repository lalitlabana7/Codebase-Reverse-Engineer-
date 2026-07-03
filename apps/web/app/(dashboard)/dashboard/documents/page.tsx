"use client";

import { motion } from "framer-motion";
import { FileText, BookOpen, Code, BookMarked, Terminal, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const docTypes = [
  { label: "README", value: "readme", icon: BookMarked, description: "Project overview", color: "text-primary", bg: "bg-primary-muted" },
  { label: "API DOCS", value: "api_docs", icon: Code, description: "API endpoints", color: "text-secondary", bg: "bg-secondary-muted" },
  { label: "INSTALL GUIDE", value: "install_guide", icon: BookOpen, description: "Setup instructions", color: "text-accent", bg: "bg-accent-muted" },
  { label: "MODULE DOC", value: "module_doc", icon: FileText, description: "Per-module explanations", color: "text-success", bg: "bg-success-muted" },
  { label: "ONBOARDING", value: "onboarding_guide", icon: BookMarked, description: "Developer onboarding", color: "text-danger", bg: "bg-danger-muted" },
  { label: "DEV REFERENCE", value: "dev_reference", icon: Code, description: "Architecture reference", color: "text-primary", bg: "bg-primary-muted" },
];

export default function DocumentsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories");
      const data = await res.json();
      return data.repositories || [];
    },
  });

  const { data: existingDocs, refetch } = useQuery({
    queryKey: ["documents", selectedRepo],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await fetch(`/api/docs?repositoryId=${selectedRepo}`);
      const data = await res.json();
      return data.documents || [];
    },
    enabled: !!selectedRepo,
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/docs?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", selectedRepo] });                      if (docContent) { setDocContent(null); setDocTitle(null); }
    },
  });

  const generateDoc = async (type: string) => {
    if (!selectedRepo) return;
    setGenerating(type);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: selectedRepo, type }),
      });
      const data = await res.json();
      setDocContent(data.content);
      setDocTitle(data.title);
      refetch();
    } catch (error) {
      console.error("Failed:", error);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>[root@acre]$ <span className="text-primary">./docs/generate --all</span></span>
          </div>
          <h1 className="text-lg font-bold tracking-wider text-primary uppercase">Documents</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">AI-generated documentation</p>
        </div>
        {repos && repos.length > 0 && (
          <select value={selectedRepo ?? ""} onChange={(e) => setSelectedRepo(e.target.value || null)}
            className="terminal-select text-xs">
            <option value="">Select repo...</option>
            {repos.map((r: any) => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </select>
        )}
      </div>

      {/* Doc types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {docTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Card key={type.value} className={`terminal-panel cursor-pointer group ${!selectedRepo ? 'opacity-40 pointer-events-none' : ''}`}
              onClick={() => generateDoc(type.value)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-sm ${type.bg} group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-3.5 h-3.5 ${type.color}`} />
                    </div>
                    <div>
                      <h3 className="text-xs font-mono font-semibold text-primary group-hover:text-primary-hover">{type.label}</h3>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{type.description}</p>
                    </div>
                  </div>
                  {generating === type.value && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Generated doc */}
      {docContent && (
        <Card className="terminal-panel">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xs font-mono text-primary">
                <FileText className="w-3 h-3" />
                {docTitle}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[8px]">MARKDOWN</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="p-3 rounded-sm bg-[#0d130d] border border-primary/10 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto text-primary/80">
              {docContent}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing docs */}
      {existingDocs && existingDocs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono text-muted-foreground tracking-wider uppercase">Saved Documents ({existingDocs.length})</h2>
          </div>
          <div className="space-y-1.5">
            {existingDocs.map((d: any) => (
              <Card key={d.id} className="terminal-panel">
                <CardContent className="p-3 flex items-center justify-between">                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setDocContent(d.content); setDocTitle(d.title); }}>
                    <p className="text-xs font-mono text-primary">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{d.type} · {new Date(d.generatedAt).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => deleteDoc.mutate(d.id)}
                    className="p-1.5 rounded-sm text-muted-foreground hover:text-danger hover:bg-danger-muted transition-all ml-2">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!existingDocs?.length && !docContent && (
        <Card className="terminal-panel">
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-6 h-6 text-muted-foreground mb-3" />
              <p className="text-xs font-mono text-muted-foreground">
                {selectedRepo ? "Click a document type to generate AI-powered docs." : "Select a repository first."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
