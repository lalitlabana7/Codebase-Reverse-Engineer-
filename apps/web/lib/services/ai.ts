// AI Pipeline - OpenRouter Client & Chat Service
import { db } from "@codebuff/database";
import { codeChunks } from "@codebuff/database";
import { eq, sql } from "drizzle-orm";

const OPENROUTER_BASE = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const MODEL = process.env.OPENROUTER_MODEL ?? "openrouter/free";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = OPENROUTER_API_KEY;
    this.baseUrl = OPENROUTER_BASE;
    this.model = MODEL;
  }

  async chat(
    messages: OpenRouterMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      onStream?: (chunk: string) => void;
    }
  ): Promise<{ content: string; tokensUsed: number }> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "ACRE - AI Codebase Reverse Engineer",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 4096,
        stream: !!options?.onStream,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }

    if (options?.onStream && response.body) {
      return this.handleStream(response, options.onStream);
    }

    const data = (await response.json()) as OpenRouterResponse;
    return {
      content: data.choices[0]?.message?.content ?? "",
      tokensUsed: data.usage?.total_tokens ?? 0,
    };
  }

  private async handleStream(
    response: Response,
    onChunk: (chunk: string) => void
  ): Promise<{ content: string; tokensUsed: number }> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let tokensUsed = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content ?? "";
          if (content) {
            fullContent += content;
            onChunk(content);
          }
          if (parsed.usage?.total_tokens) {
            tokensUsed = parsed.usage.total_tokens;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    return { content: fullContent, tokensUsed };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      return data.data[0]?.embedding ?? [];
    } catch {
      // Return empty embedding on failure
      return [];
    }
  }

  async generateWithContext(params: {
    systemPrompt: string;
    userMessage: string;
    contextChunks?: Array<{ content: string; filePath: string }>;
    onStream?: (chunk: string) => void;
  }): Promise<{ content: string; tokensUsed: number; sources: string[] }> {
    const { systemPrompt, userMessage, contextChunks, onStream } = params;

    let contextSection = "";
    const sources: string[] = [];

    if (contextChunks && contextChunks.length > 0) {
      contextSection =
        "\n\n## Repository Context\n\n" +
        contextChunks
          .map(
            (chunk) =>
              `### File: ${chunk.filePath}\n\`\`\`\n${chunk.content.slice(0, 1500)}\n\`\`\``
          )
          .join("\n\n");

      // Track unique sources
      const seen = new Set<string>();
      for (const chunk of contextChunks) {
        if (!seen.has(chunk.filePath)) {
          seen.add(chunk.filePath);
          sources.push(chunk.filePath);
        }
      }
    }

    const messages: OpenRouterMessage[] = [
      {
        role: "system",
        content:
          systemPrompt +
          "\n\nYou are an expert code analyst and cybersecurity professional. " +
          "Answer accurately using the provided repository context. " +
          "If the context doesn't contain enough information, say so clearly. " +
          "Provide code examples when relevant.",
      },
      {
        role: "user",
        content: contextSection
          ? `${contextSection}\n\n## Question\n\n${userMessage}`
          : userMessage,
      },
    ];

    const result = await this.chat(messages, {
      temperature: 0.3,
      onStream,
    });

    return { ...result, sources };
  }
}

// ======== RAG Service ========
export class RAGService {
  private ai: AIClient;

  constructor() {
    this.ai = new AIClient();
  }

  async retrieveRelevantChunks(
    repositoryId: string,
    query: string,
    limit = 5
  ): Promise<Array<{ content: string; filePath: string; relevance: number }>> {
    // First try keyword search
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (keywords.length === 0) return [];

    // Build search conditions
    const conditions = keywords.map(
      (kw) => sql`LOWER(${codeChunks.content}) LIKE ${`%${kw}%`}`
    );
    const whereClause = sql`${eq(codeChunks.repositoryId, repositoryId)} AND (${sql.join(conditions, sql` OR `)})`;

    try {
      const results = await db
        .select({
          content: codeChunks.content,
          filePath: codeChunks.filePath,
          tokenCount: codeChunks.tokenCount,
        })
        .from(codeChunks)
        .where(whereClause)
        .limit(limit);

      return results.map((r) => ({
        content: r.content,
        filePath: r.filePath,
        relevance: 0.8,
      }));
    } catch {
      return [];
    }
  }

  async answerQuestion(params: {
    repositoryId: string;
    question: string;
    onStream?: (chunk: string) => void;
  }): Promise<{ content: string; tokensUsed: number; sources: string[] }> {
    const { repositoryId, question, onStream } = params;

    // Retrieve relevant context
    const chunks = await this.retrieveRelevantChunks(repositoryId, question);

    // Generate answer with context
    return this.ai.generateWithContext({
      systemPrompt:
        "You are a code analysis assistant. Answer questions about the codebase " +
        "using the provided file contents. Be specific and reference actual code.",
      userMessage: question,
      contextChunks: chunks,
      onStream,
    });
  }
}

export const aiClient = new AIClient();
export const ragService = new RAGService();
