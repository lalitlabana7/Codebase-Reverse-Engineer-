// Diagram Generator - AI-powered architecture & dependency visualizations
import { aiClient } from "./ai";
import { db } from "@codebuff/database";
import { codeChunks, diagrams, dependencies } from "@codebuff/database";
import { eq } from "drizzle-orm";

export type DiagramType = "architecture" | "flowchart" | "dependency" | "sequence" | "entity_relationship" | "infrastructure";

interface DiagramNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, unknown>;
}

interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: "solid" | "dashed" | "dotted";
}

interface DiagramOutput {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  mermaid: string;
}

export class DiagramGenerator {
  async generate(params: {
    repositoryId: string;
    type: DiagramType;
    title?: string;
  }): Promise<{ data: DiagramOutput; mermaid: string }> {
    const { repositoryId, type } = params;

    // Gather code context
    const chunks = await db
      .select({
        content: codeChunks.content,
        filePath: codeChunks.filePath,
      })
      .from(codeChunks)
      .where(eq(codeChunks.repositoryId, repositoryId))
      .limit(20);

    // Get dependencies
    const deps = await db
      .select({
        name: dependencies.name,
        version: dependencies.version,
        type: dependencies.type,
      })
      .from(dependencies)
      .where(eq(dependencies.repositoryId, repositoryId))
      .limit(30);

    const contextSection = chunks
      .slice(0, 10)
      .map(
        (c) =>
          `### ${c.filePath}\n\`\`\`\n${c.content.slice(0, 1500)}\n\`\`\``
      )
      .join("\n\n");

    const depsSection = deps
      .slice(0, 20)
      .map((d) => `- ${d.name}@${d.version} (${d.type})`)
      .join("\n");

    const result = await aiClient.generateWithContext({
      systemPrompt: `You are a system architecture expert. Generate ${type} diagrams in Mermaid.js format based on code analysis. Focus on accuracy and clarity.`,
      userMessage: `Generate a ${type} diagram for this project.\n\n## Dependencies\n${depsSection}\n\n## Code Context\n${contextSection}`,
    });

    // Parse Mermaid from response
    const mermaidMatch = result.content.match(/```(?:mermaid)?\n([\s\S]*?)```/);
    const mermaid = mermaidMatch?.[1] ?? this.fallbackMermaid(type);

    // Build structured data
    const data: DiagramOutput = {
      nodes: this.parseNodes(mermaid, type),
      edges: this.parseEdges(mermaid),
      mermaid,
    };

    // Store in database
    await db
      .insert(diagrams)
      .values({
        repositoryId,
        type: type as any,
        title: params.title ?? `${type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} Diagram`,
        data: data as any,
        format: "mermaid",
      })
      .returning();

    return { data, mermaid };
  }

  private parseNodes(mermaid: string, type: DiagramType): DiagramNode[] {
    const nodes: DiagramNode[] = [];
    // Simple Mermaid node extraction
    const nodeMatches = mermaid.matchAll(/([A-Za-z_]\w*)\[[""]([^""]*)["""]\]/g);
    for (const match of nodeMatches) {
      nodes.push({
        id: match[1]!,
        label: match[2]!,
        type,
      });
    }
    // Also catch parentheses style
    const parenMatches = mermaid.matchAll(/([A-Za-z_]\w*)\([""]([^""]*)["""]\)/g);
    for (const match of parenMatches) {
      nodes.push({
        id: match[1]!,
        label: match[2]!,
        type: `${type}_process`,
      });
    }
    return nodes;
  }

  private parseEdges(mermaid: string): DiagramEdge[] {
    const edges: DiagramEdge[] = [];
    const edgeMatches = mermaid.matchAll(
      /([A-Za-z_]\w*)\s*(-->|===|-.->|==>)\s*([A-Za-z_]\w*)(?:\|([^|]*)\|)?/g
    );
    for (const match of edgeMatches) {
      edges.push({
        id: `${match[1]}->${match[3]}`,
        source: match[1]!,
        target: match[3]!,
        label: match[4],
        type: match[2] === "===" ? "solid" : "dashed",
      });
    }
    return edges;
  }

  private fallbackMermaid(type: DiagramType): string {
    const fallbacks: Record<DiagramType, string> = {
      architecture: `graph TB\n    Client[Client] --> API[API Gateway]\n    API --> Auth[Auth Service]\n    API --> App[Application]\n    App --> DB[Database]\n    App --> Cache[Cache Layer]`,
      flowchart: `flowchart LR\n    Start([Start]) --> Process[Process Request]\n    Process --> Decision{Valid?}\n    Decision -->|Yes| Response[Send Response]\n    Decision -->|No| Error[Return Error]\n    Response --> End([End])\n    Error --> End`,
      dependency: `graph LR\n    App[Application] --> Lib[Library]\n    App --> Frame[Framework]\n    Lib --> Util[Utilities]\n    Frame --> Util`,
      sequence: `sequenceDiagram\n    Client->>Server: Request\n    Server->>DB: Query\n    DB-->>Server: Results\n    Server->>Client: Response`,
      entity_relationship: `erDiagram\n    User ||--o{ Order : places\n    Order ||--|{ OrderItem : contains\n    Product ||--o{ OrderItem : includes`,
      infrastructure: `graph TB\n    subgraph Production\n        LB[Load Balancer] --> App1[App Instance 1]\n        LB --> App2[App Instance 2]\n        App1 --> DB[(Database)]\n        App2 --> DB\n    end`,
    };
    return fallbacks[type] ?? fallbacks.architecture;
  }
}

export const diagramGenerator = new DiagramGenerator();
