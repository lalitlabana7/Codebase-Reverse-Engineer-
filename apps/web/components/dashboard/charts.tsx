"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartProps {
  className?: string;
}

/** Aggregate findings by day for the past 7 days */
function aggregateByDay(findings: any[]): { labels: string[]; vulns: number[]; secrets: number[] } {
  const days: Record<string, { vulns: number; secrets: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-US", { weekday: "short" });
    days[key] = { vulns: 0, secrets: 0 };
  }
  const dayKeys = Object.keys(days);
  for (const f of findings || []) {
    const d = new Date(f.createdAt);
    const key = d.toLocaleDateString("en-US", { weekday: "short" });
    if (days[key]) {
      if (f.type === "secret") days[key].secrets++;
      else days[key].vulns++;
    }
  }
  return {
    labels: dayKeys,
    vulns: dayKeys.map((k) => days[k]!.vulns),
    secrets: dayKeys.map((k) => days[k]!.secrets),
  };
}

export function SecurityTrendChart({ className }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  // Fetch all repos to get findings for the chart
  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories");
      const data = await res.json();
      return data.repositories || [];
    },
  });

  const [repoId, setRepoId] = useState<string | null>(null);

  const { data: securityData } = useQuery({
    queryKey: ["security-data-chart", repoId],
    queryFn: async () => {
      if (!repoId) return { findings: [] };
      const res = await fetch(`/api/security?repositoryId=${repoId}`);
      return res.json();
    },
    enabled: !!repoId,
    refetchInterval: 15000,
  });

  // Auto-select first repo
  useEffect(() => {
    if (repos?.length > 0 && !repoId) {
      const cloned = repos.find((r: any) => r.cloneStatus === "cloned");
      setRepoId(cloned?.id || repos[0]?.id);
    }
  }, [repos, repoId]);

  const aggregated: any = aggregateByDay(((securityData as any)?.findings ?? []) as any[]);
  const hasData: boolean = aggregated?.vulns?.some((v: number) => v > 0) || aggregated?.secrets?.some((s: number) => s > 0);

  useEffect(() => {
    if (!chartRef.current) return;
    let mounted = true;

    const initChart = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const echarts: any = await import("echarts");
        if (!mounted || !chartRef.current) return;

        if (instanceRef.current) instanceRef.current.dispose();
        instanceRef.current = echarts.init(chartRef.current);
        instanceRef.current.setOption({
          tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(17, 24, 39, 0.9)",
            borderColor: "rgba(148, 163, 184, 0.15)",
            textStyle: { color: "#e2e8f0", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" },
          },
          grid: { left: 40, right: 16, top: 20, bottom: 28 },
          xAxis: {
            type: "category",
            data: aggregated.labels,
            axisLine: { lineStyle: { color: "rgba(148, 163, 184, 0.15)" } },
            axisLabel: { color: "rgba(148, 163, 184, 0.5)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" },
            splitLine: { show: false },
          },
          yAxis: {
            type: "value",
            min: 0,
            splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.06)", type: "dashed" } },
            axisLabel: { color: "rgba(148, 163, 184, 0.5)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" },
          },
          animationDuration: 800,
          animationEasing: "cubicOut",
          animationDelay: (idx: number) => idx * 100,
          series: [
            {
              name: "Vulnerabilities",
              type: "line",
              smooth: true,
              symbol: "circle",
              symbolSize: 6,
              lineStyle: { width: 2, color: "#f43f5e" },
              itemStyle: { color: "#f43f5e" },
              areaStyle: {
                color: {
                  type: "linear",
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: "rgba(244, 63, 94, 0.2)" },
                    { offset: 1, color: "rgba(244, 63, 94, 0.02)" },
                  ],
                },
              },
              data: hasData ? aggregated.vulns : [0, 0, 0, 0, 0, 0, 0],
              animationDuration: 1200,
              animationEasing: "cubicOut",
            },
            {
              name: "Secrets",
              type: "line",
              smooth: true,
              symbol: "diamond",
              symbolSize: 6,
              lineStyle: { width: 2, color: "#f59e0b" },
              itemStyle: { color: "#f59e0b" },
              areaStyle: {
                color: {
                  type: "linear",
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: "rgba(245, 158, 11, 0.15)" },
                    { offset: 1, color: "rgba(245, 158, 11, 0.01)" },
                  ],
                },
              },
              data: hasData ? aggregated.secrets : [0, 0, 0, 0, 0, 0, 0],
              animationDuration: 1200,
              animationEasing: "cubicOut",
            },
          ],
        });
      } catch {}
    };

    initChart();

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      mounted = false;
      window.removeEventListener("resize", handleResize);
      instanceRef.current?.dispose();
    };
    // Re-render chart when data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggregated, hasData]);

  return (
    <Card className="terminal-panel">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-mono text-primary">
          <span className="w-2 h-2 rounded-full bg-danger animate-pulse-dot" />
          SECURITY TRENDS (7 DAYS)
          {repoId && repos?.length > 0 && (
            <select
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              className="ml-auto terminal-select text-[9px] py-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {repos.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div ref={chartRef} className={`w-full h-[200px] ${className ?? ""}`} />
      </CardContent>
    </Card>
  );
}

export function FindingsDistribution({ className }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories");
      const data = await res.json();
      return data.repositories || [];
    },
  });

  const [repoId, setRepoId] = useState<string | null>(null);

  const { data: securityData } = useQuery({
    queryKey: ["security-data-dist", repoId],
    queryFn: async () => {
      if (!repoId) return { findings: [] };
      const res = await fetch(`/api/security?repositoryId=${repoId}`);
      return res.json();
    },
    enabled: !!repoId,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (repos?.length > 0 && !repoId) {
      const cloned = repos.find((r: any) => r.cloneStatus === "cloned");
      setRepoId(cloned?.id || repos[0]?.id);
    }
  }, [repos, repoId]);

  const distData = securityData as any;
  const findings = distData?.findings ?? [];
  const counts = {
    vulnerability: findings.filter((f: any) => f.type === "vulnerability").length,
    secret: findings.filter((f: any) => f.type === "secret").length,
    owasp: findings.filter((f: any) => f.type === "owasp").length,
  };
  const hasData = counts.vulnerability > 0 || counts.secret > 0 || counts.owasp > 0;

  const pieData = hasData
    ? [
        { value: counts.vulnerability, name: "Vulnerabilities", itemStyle: { color: "#f43f5e" } },
        { value: counts.secret, name: "Secrets", itemStyle: { color: "#f59e0b" } },
        { value: counts.owasp, name: "OWASP", itemStyle: { color: "#818cf8" } },
      ].filter(d => d.value > 0)
    : [];

  useEffect(() => {
    if (!chartRef.current) return;
    let mounted = true;

    const initChart = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const echarts: any = await import("echarts");
        if (!mounted || !chartRef.current) return;

        if (instanceRef.current) instanceRef.current.dispose();
        instanceRef.current = echarts.init(chartRef.current);
        instanceRef.current.setOption({
          tooltip: {
            trigger: "item",
            backgroundColor: "rgba(17, 24, 39, 0.9)",
            borderColor: "rgba(148, 163, 184, 0.15)",
            textStyle: { color: "#e2e8f0", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" },
          },
          animationDuration: 1000,
          animationEasing: "cubicOut",
          series: [
            {
              type: "pie",
              radius: ["45%", "70%"],
              center: ["50%", "50%"],
              avoidLabelOverlap: true,
              itemStyle: {
                borderRadius: 4,
                borderColor: "rgba(11, 17, 32, 0.8)",
                borderWidth: 2,
              },
              label: {
                show: hasData,
                position: "outside",
                formatter: "{b}\n{d}%",
                fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(148, 163, 184, 0.7)",
              },
              labelLine: hasData ? { lineStyle: { color: "rgba(148, 163, 184, 0.2)" } } : { show: false },
              data: pieData,
              animationType: "scale",
              animationDuration: 1200,
              animationEasing: "elasticOut",
            },
          ],
        });
      } catch {}
    };

    initChart();

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      mounted = false;
      window.removeEventListener("resize", handleResize);
      instanceRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieData, hasData]);

  return (
    <Card className="terminal-panel">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-mono text-primary">
          <span className="w-2 h-2 rounded-full bg-purple animate-pulse-dot" />
          FINDINGS DISTRIBUTION
          {repoId && repos?.length > 0 && (
            <select
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              className="ml-auto terminal-select text-[9px] py-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {repos.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div ref={chartRef} className={`w-full h-[200px] ${className ?? ""}`} />
      </CardContent>
    </Card>
  );
}

export function RepoActivityChart({ className }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories");
      const data = await res.json();
      return data.repositories || [];
    },
    refetchInterval: 10000,
  });

  const hasRepos = repos?.length > 0;
  const repoData = hasRepos
    ? repos.slice(0, 10).map((r: any) => ({
        name: r.name.length > 14 ? r.name.slice(0, 12) + ".." : r.name,
        count: r.fileCount || 0,
        status: r.cloneStatus,
      }))
    : [];

  useEffect(() => {
    if (!chartRef.current) return;
    let mounted = true;

    const initChart = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const echarts: any = await import("echarts");
        if (!mounted || !chartRef.current) return;

        if (instanceRef.current) instanceRef.current.dispose();
        instanceRef.current = echarts.init(chartRef.current);
        instanceRef.current.setOption({
          tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(17, 24, 39, 0.9)",
            borderColor: "rgba(148, 163, 184, 0.15)",
            textStyle: { color: "#e2e8f0", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" },
            formatter: (params: any) => {
              const p = params[0];
              const repo = repos?.find((r: any) => r.name.startsWith(p.name.replace("..", "")));
              if (!repo) return `${p.name}: ${p.value} files`;
              return `${repo.name}: ${p.value} files | Status: ${repo.cloneStatus}`;
            },
          },
          grid: { left: 40, right: 16, top: 20, bottom: 28 },
          xAxis: {
            type: "category",
            data: repoData.map((r: any) => r.name),
            axisLine: { lineStyle: { color: "rgba(148, 163, 184, 0.15)" } },
            axisLabel: { color: "rgba(148, 163, 184, 0.5)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", rotate: hasRepos ? 20 : 0 },
          },
          yAxis: {
            type: "value",
            splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.06)", type: "dashed" } },
            axisLabel: { color: "rgba(148, 163, 184, 0.5)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" },
          },
          animationDuration: 800,
          animationEasing: "cubicOut",
          series: [
            {
              type: "bar",
              barWidth: hasRepos ? "32%" : "60%",
              itemStyle: {
                borderRadius: [4, 4, 0, 0],
                color: (params: any) => {
                  const item = repoData[params.dataIndex];
                  if (!item || !hasRepos) return "rgba(148,163,184,0.15)";
                  switch (item.status) {
                    case "cloned": return { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#10b981" }, { offset: 1, color: "rgba(16,185,129,0.3)" }] };
                    case "failed": return { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#f43f5e" }, { offset: 1, color: "rgba(244,63,94,0.3)" }] };
                    case "cloning": return { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#f59e0b" }, { offset: 1, color: "rgba(245,158,11,0.3)" }] };
                    default: return { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#818cf8" }, { offset: 1, color: "rgba(129,140,248,0.3)" }] };
                  }
                },
              },
              data: repoData.map((r: any) => r.count || 1),
              animationDuration: 600,
              animationEasing: "cubicOut",
              animationDelay: (idx: number) => idx * 80,
            },
          ],
        });
      } catch {}
    };

    initChart();

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      mounted = false;
      window.removeEventListener("resize", handleResize);
      instanceRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoData, hasRepos]);

  return (
    <Card className="terminal-panel">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-mono text-primary">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
          REPOSITORY ACTIVITY
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div ref={chartRef} className={`w-full h-[200px] ${className ?? ""}`} />
      </CardContent>
    </Card>
  );
}
