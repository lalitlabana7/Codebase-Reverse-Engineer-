// Ingestion Engine - Code Chunker
// Splits source files into semantically meaningful chunks for embedding

export interface CodeChunk {
  content: string;
  filePath: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: {
    language: string | null;
    startLine: number;
    endLine: number;
    chunkType: "imports" | "header" | "function" | "class" | "block" | "exports";
  };
}

const MAX_CHUNK_TOKENS = 512;
const MIN_CHUNK_TOKENS = 64;

/** Rough token count estimation for code */
export function estimateTokens(text: string): number {
  // Average ~4 chars per token for code
  return Math.ceil(text.length / 4);
}

export function chunkFile(
  content: string,
  filePath: string,
  language: string | null
): CodeChunk[] {
  if (!content.trim()) return [];

  const lines = content.split("\n");
  const chunks: CodeChunk[] = [];

  // Strategy: split by logical boundaries (functions, classes, imports)
  let currentChunk: string[] = [];
  let currentStartLine = 1;
  let currentType: CodeChunk["metadata"]["chunkType"] = "block";
  let isInFunction = false;
  let isInClass = false;
  let braceDepth = 0;

  function flushChunk() {
    if (currentChunk.length === 0) return;

    const chunkContent = currentChunk.join("\n");
    const tokenCount = estimateTokens(chunkContent);

    if (tokenCount < MIN_CHUNK_TOKENS && chunks.length > 0) {
      // Merge with previous chunk if too small
      const lastChunk = chunks[chunks.length - 1]!;
      const mergedTokens = estimateTokens(lastChunk.content + "\n" + chunkContent);
      if (mergedTokens <= MAX_CHUNK_TOKENS) {
        lastChunk.content += "\n" + chunkContent;
        lastChunk.tokenCount = mergedTokens;
        lastChunk.metadata.endLine = currentStartLine + currentChunk.length - 1;
        currentChunk = [];
        return;
      }
    }

    if (tokenCount > 0) {
      chunks.push({
        content: chunkContent,
        filePath,
        chunkIndex: chunks.length,
        tokenCount,
        metadata: {
          language,
          startLine: currentStartLine,
          endLine: currentStartLine + currentChunk.length - 1,
          chunkType: currentType,
        },
      });
    }

    currentChunk = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    const lineNumber = i + 1;

    // Track brace depth for functions/classes
    for (const char of line) {
      if (char === "{" || char === "(" || char === "[") braceDepth++;
      if (char === "}" || char === ")" || char === "]") braceDepth--;
    }

    // Detect chunk boundaries
    const isImportLine = /^(import|from|require|using|include|#include|package)\b/.test(trimmed);
    const isFunctionStart = /^\s*(export\s+)?(async\s+)?function\s+\w/.test(trimmed) ||
      /^\s*\w+\s*=\s*(async\s+)?\(/.test(trimmed) ||
      /^\s*def\s+\w+\s*\(/.test(trimmed) ||
      /^\s*fn\s+\w+/.test(trimmed) ||
      /^\s*func\s+\w+/.test(trimmed);
    const isClassStart = /^\s*(export\s+)?(abstract\s+)?class\s+\w/.test(trimmed) ||
      /^\s*class\s+\w+/.test(trimmed);
    const isExportLine = /^\s*export\s+(default\s+)?/.test(trimmed) ||
      /^\s*module\.exports/.test(trimmed);

    // Flush at logical boundaries when current chunk is substantial
    if (currentChunk.length > 10) {
      if (braceDepth === 0) {
        if (isFunctionStart && !isInFunction) {
          flushChunk();
          currentType = "function";
          isInFunction = true;
          currentStartLine = lineNumber;
        } else if (isClassStart && !isInClass) {
          flushChunk();
          currentType = "class";
          isInClass = true;
          currentStartLine = lineNumber;
        } else if (isExportLine) {
          flushChunk();
          currentType = "exports";
          currentStartLine = lineNumber;
        }
      }
    }

    // Track when we exit a function/class (brace depth returns to previous level)
    if ((isInFunction || isInClass) && braceDepth <= 0 && trimmed === "}") {
      currentChunk.push(line);
      flushChunk();
      isInFunction = false;
      isInClass = false;
      currentType = "block";
      currentStartLine = lineNumber + 1;
      continue;
    }

    // Handle imports section
    if (isImportLine && braceDepth === 0 && !isInFunction && !isInClass) {
      if (currentChunk.length > 0 && currentType !== "imports") {
        flushChunk();
        currentType = "imports";
        currentStartLine = lineNumber;
      } else if (currentChunk.length === 0) {
        currentType = "imports";
      }
    }

    currentChunk.push(line);

    // Flush if chunk is too large
    if (estimateTokens(currentChunk.join("\n")) >= MAX_CHUNK_TOKENS) {
      flushChunk();
      currentStartLine = lineNumber + 1;
      currentType = "block";
    }
  }

  // Flush remaining content
  flushChunk();

  // Trim trailing whitespace from chunks
  for (const chunk of chunks) {
    chunk.content = chunk.content.trimEnd();
  }

  return chunks;
}

/** Split content into overlapping chunks for better retrieval */
export function chunkWithOverlap(
  content: string,
  filePath: string,
  language: string | null,
  overlapLines = 5
): CodeChunk[] {
  const chunks = chunkFile(content, filePath, language);
  if (chunks.length <= 1) return chunks;

  // Add overlap between adjacent chunks
  const result: CodeChunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    result.push(chunk);

    // If there's a next chunk and current chunk has content
    if (i < chunks.length - 1 && chunk.content.length > 0) {
      const lines = chunk.content.split("\n");
      const overlapLines_content = lines.slice(-overlapLines).join("\n");
      if (overlapLines_content.trim()) {
        // Include overlap in the next chunk
        const nextChunk = chunks[i + 1]!;
        nextChunk.content = overlapLines_content + "\n" + nextChunk.content;
        nextChunk.metadata.startLine = Math.max(1, chunk.metadata.endLine - overlapLines + 1);
      }
    }
  }

  return result;
}
