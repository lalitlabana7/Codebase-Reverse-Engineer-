"use client";

import { motion } from "framer-motion";
import { Globe, Search, Shield, Code2, Server, Terminal, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface WebsiteAnalysis {
  url: string;
  title: string | null;
  description: string | null;
  techStack: Array<{ name: string; category: string; confidence: number }>;
  securityHeaders: Record<string, string>;
  ssl: { valid: boolean; issuer: string | null; expiresAt: string | null };
  serverInfo: { server: string | null; poweredBy: string | null; contentType: string | null };
  stats: { scripts: number; stylesheets: number; images: number; links: number; totalSize: string; loadTime: string };
  socialLinks: string[];
}

export default function WebsitesPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(null); setAnalysis(null);
    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) targetUrl = `https://${targetUrl}`;
    
    try {
      const res = await fetch("/api/websites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: targetUrl }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to analyze"); }
      const data = await res.json();
      setAnalysis(data.analysis);
      setHistory(prev => [targetUrl, ...prev.filter(u => u !== targetUrl)].slice(0, 10));
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const getHeaderScore = () => analysis ? Math.round((Object.keys(analysis.securityHeaders).length / 8) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
          <Terminal className="w-3.5 h-3.5" />
          <span>[root@acre]$ <span className="text-primary">./web/analyze --url=target</span></span>
        </div>
        <h1 className="text-lg font-bold tracking-wider text-primary uppercase">Websites</h1>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">Analyze websites for tech stack, security, and architecture</p>
      </div>

      {/* URL Input */}
      <Card className="terminal-panel">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 terminal-input text-xs">
              <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input type="url" placeholder="https://example.com" value={url}
                onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                className="flex-1 bg-transparent text-xs text-primary placeholder:text-muted-foreground outline-none font-mono" />
            </div>
            <Button onClick={handleAnalyze} disabled={loading || !url.trim()} size="sm">
              {loading ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />SCANNING</> : <><Search className="w-3 h-3 mr-1.5" />ANALYZE</>}
            </Button>
          </div>
          {history.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[9px] font-mono text-muted-foreground">Recent:</span>
              {history.map((h) => (
                <button key={h} onClick={() => { setUrl(h); setAnalysis(null); setError(null); }}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-primary-muted/30 text-muted-foreground hover:text-primary truncate max-w-[180px]">
                  {h.replace(/^https?:\/\//, "")}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card className="terminal-panel">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
            <p className="text-xs font-mono text-muted-foreground">Scanning target...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="terminal-panel border-danger/20">
          <CardContent className="p-4 flex items-start gap-3">
            <XCircle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-mono text-danger mb-1">Scan failed</p>
              <p className="text-[11px] font-mono text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && !loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Card className="terminal-panel"><CardContent className="p-3">
              <p className="text-[9px] font-mono text-muted-foreground tracking-wider">TITLE</p>
              <p className="text-xs font-mono text-primary truncate mt-1">{analysis.title ?? "N/A"}</p>
            </CardContent></Card>
            <Card className="terminal-panel"><CardContent className="p-3">
              <p className="text-[9px] font-mono text-muted-foreground tracking-wider">TECH STACK</p>
              <p className="text-lg font-bold font-mono text-primary mt-1">{analysis.techStack.length}</p>
              <p className="text-[9px] text-muted-foreground font-mono">technologies</p>
            </CardContent></Card>
            <Card className="terminal-panel"><CardContent className="p-3">
              <p className="text-[9px] font-mono text-muted-foreground tracking-wider">SECURITY</p>
              <p className="text-lg font-bold font-mono mt-1" style={{ color: getHeaderScore() >= 50 ? "var(--color-success)" : "var(--color-danger)" }}>{getHeaderScore()}%</p>
              <p className="text-[9px] text-muted-foreground font-mono">headers</p>
            </CardContent></Card>
            <Card className="terminal-panel"><CardContent className="p-3">
              <p className="text-[9px] font-mono text-muted-foreground tracking-wider">PAGE SIZE</p>
              <p className="text-lg font-bold font-mono text-primary mt-1">{analysis.stats.totalSize}</p>
              <p className="text-[9px] text-muted-foreground font-mono">{analysis.stats.loadTime}</p>
            </CardContent></Card>
          </div>

          {/* Tech Stack */}
          <Card className="terminal-panel">
            <CardHeader className="p-4 pb-2"><CardTitle className="flex items-center gap-2 text-xs font-mono text-primary"><Code2 className="w-3 h-3" />TECH STACK</CardTitle></CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {analysis.techStack.map((tech, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-sm border border-primary/10">
                    <Code2 className="w-3 h-3 text-primary" />
                    <div>
                      <p className="text-[11px] font-mono text-primary">{tech.name}</p>
                      <p className="text-[8px] text-muted-foreground font-mono">{tech.category} · {Math.round(tech.confidence * 100)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Server & Security */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="terminal-panel">
              <CardHeader className="p-4 pb-2"><CardTitle className="flex items-center gap-2 text-xs font-mono text-primary"><Server className="w-3 h-3" />SERVER</CardTitle></CardHeader>
              <CardContent className="p-4 pt-2 space-y-1.5">
                {[["Server", analysis.serverInfo.server], ["Powered By", analysis.serverInfo.poweredBy], ["Content Type", analysis.serverInfo.contentType], ["SSL/TLS", analysis.ssl.valid ? "Valid" : "Not Detected"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between p-2 rounded-sm bg-primary-muted/20 border border-primary/5">
                    <span className="text-[10px] font-mono text-muted-foreground">{k}</span>
                    <span className={cn("text-[10px] font-mono", k === "SSL/TLS" ? (analysis.ssl.valid ? "text-success" : "text-danger") : "text-primary")}>{v ?? "N/A"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="terminal-panel">
              <CardHeader className="p-4 pb-2"><CardTitle className="flex items-center gap-2 text-xs font-mono text-primary"><Shield className="w-3 h-3" />SECURITY HEADERS</CardTitle></CardHeader>
              <CardContent className="p-4 pt-2">
                {Object.keys(analysis.securityHeaders).length > 0 ? (
                  <div className="space-y-1.5">
                    {Object.entries(analysis.securityHeaders).map(([h, v]) => (
                      <div key={h} className="p-2 rounded-sm bg-primary-muted/20 border border-primary/5">
                        <p className="text-[10px] font-mono text-success">{h}</p>
                        <p className="text-[9px] font-mono text-muted-foreground truncate">{v}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-mono text-muted-foreground text-center py-6">No security headers detected</p>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
