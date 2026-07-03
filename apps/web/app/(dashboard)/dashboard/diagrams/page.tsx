"use client";

import { motion } from "framer-motion";
import { Puzzle, Download, GitBranch, Terminal, Loader2, ZoomIn, ZoomOut, Maximize2, Minimize2, Move } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

const diagramTypes = [
  { label: "ARCHITECTURE", value: "architecture", icon: Puzzle, description: "System architecture and components", color: "text-primary", bg: "bg-primary-muted" },
  { label: "DEPENDENCY GRAPH", value: "dependency", icon: GitBranch, description: "Module dependency visualization", color: "text-secondary", bg: "bg-secondary-muted" },
  { label: "DATA FLOW", value: "sequence", icon: Puzzle, description: "Data movement and pipelines", color: "text-accent", bg: "bg-accent-muted" },
  { label: "FLOWCHART", value: "flowchart", icon: Puzzle, description: "Application flow and decisions", color: "text-success", bg: "bg-success-muted" },
  { label: "ER DIAGRAM", value: "entity_relationship", icon: GitBranch, description: "Data models and relationships", color: "text-danger", bg: "bg-danger-muted" },
  { label: "INFRASTRUCTURE", value: "infrastructure", icon: Puzzle, description: "Deployment architecture", color: "text-primary", bg: "bg-primary-muted" },
];

export default function DiagramsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [mermaidCode, setMermaidCode] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const mermaidContentRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 0.25)), []);
  const handleReset = useCallback(() => { setZoom(1); setPanPos({ x: 0, y: 0 }); }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
    }
  }, [panPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPanPos({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Wheel zoom
  useEffect(() => {
    const el = mermaidContainerRef.current;
    if (!el || !mermaidCode) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) => Math.max(0.25, Math.min(3, z - e.deltaY * 0.002)));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [mermaidCode]);

  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories");
      const data = await res.json();
      return data.repositories || [];
    },
  });

  const { data: existingDiagrams, refetch } = useQuery({
    queryKey: ["diagrams", selectedRepo],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await fetch(`/api/diagrams?repositoryId=${selectedRepo}`);
      const data = await res.json();
      return data.diagrams || [];
    },
    enabled: !!selectedRepo,
  });

  // Render Mermaid diagram into the inner content ref (preserves zoom/pan outer container)
  useEffect(() => {
    if (!mermaidCode || !mermaidContentRef.current) return;
    setRenderError(null);
    
    const renderMermaid = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            primaryColor: "#818cf8",
            primaryTextColor: "#c7d2fe",
            primaryBorderColor: "rgba(129, 140, 248, 0.3)",
            lineColor: "rgba(129, 140, 248, 0.5)",
            secondaryColor: "#22c55e",
            tertiaryColor: "#0f172a",
            background: "#0f172a",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
            nodeBorder: "#818cf8",
            clusterBkg: "rgba(129, 140, 248, 0.05)",
            clusterBorder: "rgba(129, 140, 248, 0.2)",
            edgeLabelBackground: "#1e293b",
            nodeTextColor: "#c7d2fe",
          },
          securityLevel: "loose",
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" },
          sequence: { showSequenceNumbers: true },
        });

        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidCode);
        if (mermaidContentRef.current) {
          mermaidContentRef.current.innerHTML = svg;
          const svgEl = mermaidContentRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }
        }
      } catch (err: any) {
        console.error("Mermaid render error:", err);
        setRenderError(err.message || "Failed to render diagram");
        if (mermaidCode && mermaidContentRef.current) {
          try {
            mermaidContentRef.current.innerHTML = `<pre class="text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap p-4">${mermaidCode}</pre>`;
          } catch {}
        }
      }
    };
    
    renderMermaid();
  }, [mermaidCode]);

  const generateDiagram = async (type: string) => {
    if (!selectedRepo) return;
    setGenerating(type);
    setMermaidCode(null);
    setRenderError(null);
    try {
      const res = await fetch("/api/diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: selectedRepo, type }),
      });
      const data = await res.json();
      setMermaidCode(data.mermaid);
      refetch();
    } catch (err: any) {
      setRenderError(err.message || "Failed to generate");
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
            <span>[root@acre]$ <span className="text-primary">./diagrams/generate --type=all</span></span>
          </div>
          <h1 className="text-lg font-bold tracking-wider text-primary uppercase">Diagrams</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">Architecture and dependency visualizations</p>
        </div>
        {repos && repos.length > 0 && (
          <select value={selectedRepo ?? ""} onChange={(e) => setSelectedRepo(e.target.value || null)}
            className="terminal-select text-xs">
            <option value="">Select repo...</option>
            {repos.map((r: any) => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </select>
        )}
      </div>

      {/* Diagram type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {diagramTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Card key={type.value} className={`terminal-panel cursor-pointer group ${!selectedRepo ? 'opacity-40 pointer-events-none' : ''}`}
              onClick={() => generateDiagram(type.value)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-sm ${type.bg} group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-3.5 h-3.5 ${type.color}`} />
                    </div>
                    <div>
                      <h3 className="text-xs font-mono font-semibold text-primary group-hover:text-primary-hover transition-colors">{type.label}</h3>
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

      {/* Rendered Diagram */}
      {mermaidCode && (
        <Card className="terminal-panel">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xs font-mono text-primary">
                <Puzzle className="w-3 h-3" />
                GENERATED DIAGRAM
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-[10px]" onClick={() => navigator.clipboard.writeText(mermaidCode)}>
                  <Download className="w-2.5 h-2.5 mr-1" />COPY
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {renderError ? (
              <div className="p-3 rounded-sm bg-danger-muted border border-danger/20">
                <p className="text-xs font-mono text-danger mb-2">Error: {renderError}</p>
                <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">{mermaidCode}</pre>
              </div>
            ) : (
              <>
                {/* Zoom/pan toolbar */}
                <div className="flex items-center gap-1 mb-2">
                  <button onClick={handleZoomIn} className="p-1 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary-muted/30 transition-all" title="Zoom In (Ctrl+Scroll)">
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button onClick={handleZoomOut} className="p-1 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary-muted/30 transition-all" title="Zoom Out">
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] font-mono text-muted-foreground min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={handleReset} className="p-1 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary-muted/30 transition-all text-[9px] font-mono" title="Reset View">
                    <Move className="w-3 h-3" />
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => setFullscreen(!fullscreen)}
                    className="p-1 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary-muted/30 transition-all"
                    title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {fullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </button>
                </div>
                {/* Diagram canvas with pan/zoom */}
                <div
                  ref={mermaidContainerRef}
                  className={`relative overflow-hidden bg-[#0d130d] rounded-sm border border-border/10 ${fullscreen ? 'min-h-[70vh]' : 'min-h-[250px]'}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                >
                  <div
                    ref={mermaidContentRef}
                    className="flex items-center justify-center p-4"
                    style={{
                      transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                    }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing diagrams */}
      {existingDiagrams && existingDiagrams.length > 0 && !mermaidCode && (
        <div>
          <h2 className="text-xs font-mono text-muted-foreground tracking-wider mb-3 uppercase">Saved Diagrams</h2>
          <div className="space-y-1.5">
            {existingDiagrams.map((d: any) => (
              <Card key={d.id} className="terminal-panel cursor-pointer" onClick={() => setMermaidCode(d.data?.mermaid || d.mermaid)}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-primary">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{d.type} · {new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className="text-[8px]">{d.format}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!existingDiagrams?.length && !mermaidCode && (
        <Card className="terminal-panel">
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Puzzle className="w-6 h-6 text-muted-foreground mb-3" />
              <p className="text-xs font-mono text-muted-foreground">
                {selectedRepo ? "Click a diagram type above to generate one." : "Select a repository first."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
