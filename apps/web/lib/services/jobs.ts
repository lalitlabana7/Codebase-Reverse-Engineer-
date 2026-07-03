// Background Job Handlers
import { jobQueue } from "./queue";
import { analyzeRepository } from "@codebuff/ingestion";
import { repositoryService, analysisService, securityService, notificationService } from "./database";
import { scanForSecrets, scanForVulnerabilities, analyzeOWASP, calculateSecurityScore, mapAttackSurface } from "./security-engine";
import { db, dependencies as depsTable } from "@codebuff/database";
import { codeChunks } from "@codebuff/database";
import { eq } from "drizzle-orm";

export function registerAllJobs() {
  // ======== Repository Analysis Job ========
  jobQueue.register("analyze_repository", async (job) => {
    const data = job.data as Record<string, string>;
    const repositoryId = data.repositoryId!;
    const analysisId = data.analysisId;
    const url = data.url;
    const branch = data.branch;
    const githubToken = data.githubToken;
    const userId = data.userId;

    // Start analysis
    if (analysisId) {
      await analysisService.updateStatus(analysisId, "processing");
    }
    await repositoryService.update(repositoryId, { cloneStatus: "cloning" });

    const updateStage = async (stage: string, message: string) => {
      if (analysisId) {
        await analysisService.updateStatus(analysisId, "processing", {
          technicalSummary: `${stage}: ${message}`,
        } as any);
      }
    };

    try {
      // If URL is provided, run full analysis
      if (url) {
        await updateStage("cloning", "Cloning repository...");

        // Run the analysis engine
        const result = await analyzeRepository({
          url,
          branch: branch || "main",
          githubToken,
        });

        await updateStage("scanning", `Scanned files: analyzing ${result.scan.fileCount} files...`);

        // Update repository with analysis results
        await repositoryService.update(repositoryId, {
          cloneStatus: "cloned",
          clonedAt: new Date(),
          name: result.repository.name ?? undefined,
          description: result.repository.description ?? undefined,
          language: result.repository.language ?? undefined,
          size: result.repository.size ?? undefined,
          fileCount: result.scan.fileCount,
        });

        await updateStage("chunking", `Processing ${result.chunks.length} code chunks for AI...`);

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
          console.log(`[analysis] Stored ${result.dependencies.length} dependencies for repo ${repositoryId}`);
        }

        // Store code chunks for RAG
        if (result.chunks.length > 0) {
          for (const chunk of result.chunks) {
            await db.insert(codeChunks).values({
              repositoryId: repositoryId,
              filePath: chunk.filePath,
              chunkIndex: chunk.chunkIndex,
              content: chunk.content,
              metadata: chunk.metadata as any,
              tokenCount: chunk.tokenCount,
            }).onConflictDoNothing().catch(() => {});
          }
        }

        await updateStage("security", "Running security analysis...");

        // Run security scans
        const secretFindings = scanForSecrets(result.scan.files);
        const vulnFindings = scanForVulnerabilities(result.scan.files);
        const owaspFindings = analyzeOWASP(result.scan.files);
        mapAttackSurface(result.scan.files);

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

        await updateStage("complete", `Analysis complete. Found ${allFindings.length} issues.`);

        // Save analysis summary
        await analysisService.updateStatus(analysisId!, "completed", {
          summary: result.summary as any,
          folderStructure: result.folderStructure as any,
          importantFiles: result.importantFiles as any,
          technologies: result.technologies as any,
          architecturePatterns: result.summary.architecture as any,
          technicalSummary: `Analyzed ${result.scan.fileCount} files across ${result.scan.directoryCount} directories. Found ${result.dependencies.length} dependencies. Detected ${allFindings.length} security findings.`,
          beginnerSummary: `This project is a ${result.summary.projectType}. It uses ${result.summary.techStack.slice(0, 5).join(", ")}. The codebase has ${result.scan.fileCount} files.`,
        });

        // Update repository
        await repositoryService.update(repositoryId, {
          lastAnalysisAt: new Date(),
        });

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
      }
    } catch (error: any) {
      console.error("Analysis job failed:", error);
      if (analysisId) {
        await analysisService.updateStatus(analysisId, "failed", {
          error: error.message,
        } as any);
      }
      await repositoryService.update(repositoryId, { cloneStatus: "failed" });
      throw error;
    }
  });

  // ======== Security Scan Job ========
  jobQueue.register("security_scan", async (job) => {
    const data = job.data as Record<string, string>;
    const repositoryId = data.repositoryId!;
    const analysisId = data.analysisId;

    if (analysisId) {
      await analysisService.updateStatus(analysisId, "processing");
    }
    await repositoryService.update(repositoryId, { lastAnalysisAt: new Date() });

    try {
      // Load cached code chunks from the database to reconstruct file data
      const chunks = await db
        .select({ content: codeChunks.content as any, filePath: codeChunks.filePath })
        .from(codeChunks)
        .where(eq(codeChunks.repositoryId, repositoryId))
        .limit(500);

      if (chunks.length === 0) {
        console.warn(`[security_scan] No cached code chunks found for repo ${repositoryId}`);
        if (analysisId) {
          await analysisService.updateStatus(analysisId, "completed", {
            summary: "No code chunks available for security scan. Run a full analysis first.",
          } as any);
        }
        return;
      }

      // Group chunks by file path and reconstruct file contents
      const fileMap = new Map<string, string[]>();
      for (const chunk of chunks) {
        const existing = fileMap.get(chunk.filePath) ?? [];
        existing.push(chunk.content);
        fileMap.set(chunk.filePath, existing);
      }

      // Build ScannedFile-compatible objects
      const files = [...fileMap.entries()].map(([filePath, chunkContents]) => ({
        relativePath: filePath,
        content: chunkContents.join("\n"),
        size: chunkContents.join("\n").length,
        language: filePath.split(".").pop() ?? null,
      }));

      // Run security scans on reconstructed files
      const secretFindings = scanForSecrets(files as any);
      const vulnFindings = scanForVulnerabilities(files as any);
      const owaspFindings = analyzeOWASP(files as any);

      // Store findings
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

      // Calculate and update security score
      const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
      const highCount = allFindings.filter((f) => f.severity === "high").length;

      const score = calculateSecurityScore({
        vulnerabilityCount: vulnFindings.length + owaspFindings.length,
        secretCount: secretFindings.length,
        criticalCount,
        highCount,
        totalFiles: files.length,
        dependencyCount: 0,
        outdatedDeps: 0,
      });

      await securityService.createScore({
        repositoryId,
        ...score,
      });

      if (analysisId) {
        await analysisService.updateStatus(analysisId, "completed", {
          summary: `Security scan completed. Found ${allFindings.length} findings (${criticalCount} critical, ${highCount} high).`,
        } as any);
      }
    } catch (error: any) {
      console.error("Security scan job failed:", error);
      if (analysisId) {
        await analysisService.updateStatus(analysisId, "failed", {
          error: error.message,
        } as any);
      }
    }
  });

  // ======== Document Generation Job ========
  jobQueue.register("generate_documentation", async (job) => {
    const data = job.data as Record<string, string>;
    const repositoryId = data.repositoryId!;
    const type = data.type;

    try {
      const { docsGenerator } = await import("@/lib/services/docs-generator");
      const result = await docsGenerator.generate({
        repositoryId,
        type: (type as any) ?? "readme",
      });
      console.log(`[generate_documentation] Generated "${result.title}" for repo ${repositoryId}`);
    } catch (error: any) {
      console.error("Document generation job failed:", error);
    }
  });

  // ======== Diagram Generation Job ========
  jobQueue.register("generate_diagram", async (job) => {
    const data = job.data as Record<string, string>;
    const repositoryId = data.repositoryId!;
    const type = data.type;

    try {
      const { diagramGenerator } = await import("@/lib/services/diagram-generator");
      const result = await diagramGenerator.generate({
        repositoryId,
        type: (type as any) ?? "architecture",
      });
      console.log(`[generate_diagram] Generated ${type ?? "architecture"} diagram for repo ${repositoryId} (${result.mermaid.slice(0, 100)}...)`);
    } catch (error: any) {
      console.error("Diagram generation job failed:", error);
    }
  });
}
