// Background Job Handlers — rewritten for GitHub API + synchronous processing
// On Vercel serverless, processing happens inline since background queues aren't available.
// The analyzeRepositoryViaApi function uses the GitHub API (no git binary, no filesystem needed).
import { analyzeRepositoryViaApi } from "@codebuff/ingestion";
import { repositoryService, analysisService, securityService, notificationService } from "./database";
import { scanForSecrets, scanForVulnerabilities, analyzeOWASP, calculateSecurityScore, mapAttackSurface } from "./security-engine";
import { db, dependencies as depsTable } from "@codebuff/database";
import { codeChunks } from "@codebuff/database";

export interface AnalysisJobParams {
  repositoryId: string;
  analysisId?: string;
  url: string;
  branch?: string;
  githubToken?: string;
  userId?: string;
}

/**
 * Run a full repository analysis synchronously using the GitHub API.
 * This is the primary analysis path for serverless environments (Vercel).
 *
 * Steps:
 *  1. Fetch repo metadata + file contents via GitHub API
 *  2. Parse dependencies
 *  3. Chunk code for RAG
 *  4. Run security scans (secrets, vulnerabilities, OWASP)
 *  5. Calculate security score
 *  6. Store everything in the database
 *  7. Send notification
 */
export async function analyzeRepositorySync(params: AnalysisJobParams): Promise<void> {
  const { repositoryId, analysisId, url, branch, githubToken, userId } = params;

  try {
    if (analysisId) {
      await analysisService.updateStatus(analysisId, "processing");
    }
    await repositoryService.update(repositoryId, { cloneStatus: "cloning" } as any);

    // Run the GitHub API-based analysis
    const result = await analyzeRepositoryViaApi({
      url,
      branch: branch || "main",
      githubToken,
    });

    // Update repository with analysis results
    await repositoryService.update(repositoryId, {
      cloneStatus: "cloned",
      clonedAt: new Date(),
      name: result.repository.name ?? undefined,
      description: result.repository.description ?? undefined,
      language: result.repository.language ?? undefined,
      size: result.repository.size ?? undefined,
      fileCount: result.scan.fileCount,
    } as any);

    // Store dependencies in database
    if (result.dependencies.length > 0) {
      for (const dep of result.dependencies) {
        await db.insert(depsTable).values({
          repositoryId,
          name: dep.name,
          version: dep.version,
          type: dep.type as any,
          isDirect: dep.isDirect,
          isDevDependency: dep.isDevDependency,
          isOutdated: false,
        }).onConflictDoNothing().catch(() => {});
      }
    }

    // Store code chunks for RAG
    if (result.chunks.length > 0) {
      for (const chunk of result.chunks) {
        await db.insert(codeChunks).values({
          repositoryId,
          filePath: chunk.filePath,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          metadata: chunk.metadata as any,
          tokenCount: chunk.tokenCount,
        }).onConflictDoNothing().catch(() => {});
      }
    }

    // Run security scans
    const secretFindings = scanForSecrets(result.scan.files as any);
    const vulnFindings = scanForVulnerabilities(result.scan.files as any);
    const owaspFindings = analyzeOWASP(result.scan.files as any);
    mapAttackSurface(result.scan.files as any);

    // Store security findings
    const allFindings = [
      ...secretFindings.map((f) => ({
        repositoryId,
        analysisId,
        type: "secret" as const,
        severity: f.severity,
        title: f.secretType,
        description: `Found in ${f.filePath}`,
        filePath: f.filePath,
        codeSnippet: f.context,
      })),
      ...vulnFindings.map((f) => ({
        repositoryId,
        analysisId,
        type: "vulnerability" as const,
        severity: f.severity,
        title: f.title,
        description: f.description,
        filePath: f.filePath,
        codeSnippet: f.codeSnippet,
        recommendation: f.recommendation,
      })),
      ...owaspFindings.map((f) => ({
        repositoryId,
        analysisId,
        type: "owasp" as const,
        severity: f.severity,
        title: f.title,
        description: f.description,
        filePath: f.filePath,
        recommendation: f.recommendation,
      })),
    ];

    for (const finding of allFindings) {
      await securityService.createFinding(finding as any);
    }

    // Calculate and store security score
    const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
    const highCount = allFindings.filter((f) => f.severity === "high").length;
    const outdatedDeps = result.dependencies.filter((d) => {
      const semverMatch = d.version.match(/\d+\.\d+\.\d+/);
      return !semverMatch;
    }).length;

    const score = calculateSecurityScore({
      vulnerabilityCount: vulnFindings.length + owaspFindings.length,
      secretCount: secretFindings.length,
      criticalCount,
      highCount,
      totalFiles: result.scan.fileCount,
      dependencyCount: result.dependencies.length,
      outdatedDeps,
    });

    await securityService.createScore({
      repositoryId,
      ...score,
    });

    // Save analysis summary
    if (analysisId) {
      await analysisService.updateStatus(analysisId, "completed", {
        summary: result.summary as any,
        folderStructure: result.folderStructure as any,
        importantFiles: result.importantFiles as any,
        technologies: result.technologies as any,
        architecturePatterns: result.summary.architecture as any,
        technicalSummary: `Analyzed ${result.scan.fileCount} files across ${result.scan.directoryCount} directories. Found ${result.dependencies.length} dependencies. Detected ${allFindings.length} security findings.`,
        beginnerSummary: `This project is a ${result.summary.projectType}. It uses ${result.summary.techStack.slice(0, 5).join(", ")}. The codebase has ${result.scan.fileCount} files.`,
      } as any);
    }

    // Update repository
    await repositoryService.update(repositoryId, {
      lastAnalysisAt: new Date(),
    } as any);

    // Send notification if user ID available
    if (userId) {
      await notificationService.create({
        userId,
        type: "scan_complete",
        title: `Analysis complete for ${result.repository.name}`,
        message: `${allFindings.length} security findings, ${result.dependencies.length} dependencies`,
        data: { repositoryId, findingCount: allFindings.length },
      });
    }
  } catch (error: any) {
    console.error("Analysis failed:", error);
    if (analysisId) {
      await analysisService.updateStatus(analysisId, "failed", {
        error: error.message,
      } as any);
    }
    await repositoryService.update(repositoryId, { cloneStatus: "failed" } as any);
    throw error;
  }
}
