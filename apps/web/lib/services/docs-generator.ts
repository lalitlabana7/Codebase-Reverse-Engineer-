// Documentation Generator - AI-powered doc creation
import { aiClient } from "./ai";
import { db } from "@codebuff/database";
import { codeChunks, documents } from "@codebuff/database";
import { eq, sql } from "drizzle-orm";

export type DocType = "readme" | "api_docs" | "install_guide" | "module_doc" | "onboarding_guide" | "dev_reference";

const DOC_PROMPTS: Record<DocType, { title: string; systemPrompt: string }> = {
  readme: {
    title: "README",
    systemPrompt: `Generate a comprehensive README.md for a software project. Include:
1. Project title and description
2. Key features
3. Tech stack
4. Quick start / installation
5. Usage examples
6. Project structure overview
7. API documentation (if applicable)
8. Contributing guidelines
9. License information

Use the repository context provided below. Format in Markdown.`,
  },
  api_docs: {
    title: "API Documentation",
    systemPrompt: `Generate comprehensive API documentation for the project. Include:
1. Base URL and authentication
2. All endpoints with methods, paths, request/response schemas
3. Code examples for each endpoint
4. Error codes and handling
5. Rate limiting info

Use the code context to extract actual API routes and handlers. Format in Markdown.`,
  },
  install_guide: {
    title: "Installation Guide",
    systemPrompt: `Generate a detailed installation and setup guide. Include:
1. Prerequisites and system requirements
2. Step-by-step installation instructions
3. Configuration options
4. Environment variables
5. Development setup
6. Production deployment
7. Troubleshooting common issues

Use the repository context for accurate dependency info. Format in Markdown.`,
  },
  module_doc: {
    title: "Module Documentation",
    systemPrompt: `Generate detailed documentation for a specific module or directory. Include:
1. Module purpose and responsibilities
2. Key files and their roles
3. Exported functions/classes
4. Dependencies and relationships
5. Usage examples
6. Configuration options

Use the code context for accuracy. Format in Markdown.`,
  },
  onboarding_guide: {
    title: "Onboarding Guide",
    systemPrompt: `Generate a developer onboarding guide for new team members. Include:
1. Repository overview and structure
2. Development environment setup
3. Key conventions and patterns
4. How to run tests
5. Deployment workflow
6. Where to find help

Format in Markdown with clear sections.`,
  },
  dev_reference: {
    title: "Developer Reference",
    systemPrompt: `Generate a comprehensive developer reference document. Include:
1. Architecture overview
2. Data flow diagrams (text-based)
3. Key design patterns used
4. Database schema overview
5. Testing strategy
6. Build and CI/CD pipeline
7. Security considerations

Use the repository context. Format in Markdown.`,
  },
};

export class DocumentationGenerator {
  async generate(params: {
    repositoryId: string;
    type: DocType;
    modulePath?: string;
  }): Promise<{ content: string; title: string }> {
    const { repositoryId, type, modulePath } = params;
    const config = DOC_PROMPTS[type];

    // Gather context from code chunks
    const chunks = await db
      .select({
        content: codeChunks.content,
        filePath: codeChunks.filePath,
        tokenCount: codeChunks.tokenCount,
      })
      .from(codeChunks)
      .where(eq(codeChunks.repositoryId, repositoryId))
      .limit(30);

    // Filter by module path if specified
    const filteredChunks = modulePath
      ? chunks.filter((c) => c.filePath.startsWith(modulePath))
      : chunks;

    // Build context section
    const contextSection = filteredChunks
      .slice(0, 15)
      .map(
        (c) =>
          `### File: ${c.filePath}\n\`\`\`\n${c.content.slice(0, 2000)}\n\`\`\``
      )
      .join("\n\n");

    // Get repository info
    const repoInfo = filteredChunks
      .map((c) => c.filePath)
      .filter((f, i, a) => a.indexOf(f) === i)
      .slice(0, 20)
      .join("\n");

    // Generate with AI
    const result = await aiClient.generateWithContext({
      systemPrompt: config.systemPrompt,
      userMessage: `Generate ${config.title} for this project.\n\n## File Structure\n${repoInfo}\n\n## Code Context\n${contextSection}`,
    });

    // Store in database
    await db
      .insert(documents)
      .values({
        repositoryId,
        type: type as any,
        title: config.title,
        content: result.content,
        format: "markdown",
      })
      .returning();

    return {
      content: result.content,
      title: config.title,
    };
  }

  async regenerate(params: {
    repositoryId: string;
    type: DocType;
    feedback?: string;
  }): Promise<{ content: string; title: string }> {
    const { repositoryId, type, feedback } = params;
    const config = DOC_PROMPTS[type];

    // Get existing doc
    const existing = await db
      .select()
      .from(documents)
      .where(
        sql`${documents.repositoryId} = ${repositoryId} AND ${documents.type} = ${type}::doc_type`
      )
      .limit(1);

    const result = await aiClient.generateWithContext({
      systemPrompt: config.systemPrompt + "\n\nImprove upon the previous version.",
      userMessage: `Regenerate ${config.title} for this project.\n\n${
        feedback ? `Feedback: ${feedback}\n\n` : ""
      }${
        existing.length > 0
          ? `Previous version:\n${existing[0]!.content.slice(0, 3000)}`
          : ""
      }`,
    });

    // Persist the regenerated content
    await db
      .insert(documents)
      .values({
        repositoryId,
        type: type as any,
        title: config.title,
        content: result.content,
        format: "markdown",
      })
      .returning();

    return {
      content: result.content,
      title: config.title,
    };
  }
}

export const docsGenerator = new DocumentationGenerator();
