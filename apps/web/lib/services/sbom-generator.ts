// SBOM Generator - Software Bill of Materials in CycloneDX format
import { db } from "@codebuff/database";
import { dependencies, sbom, repositories } from "@codebuff/database";
import { eq, desc } from "drizzle-orm";

interface CycloneDXSBOM {
  bomFormat: "CycloneDX";
  specVersion: "1.5";
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: { name: string; version: string }[];
    component: { name: string; type: string; version?: string };
  };
  components: CycloneDXComponent[];
  dependencies: CycloneDXDep[];
}

interface CycloneDXComponent {
  "bom-ref": string;
  type: string;
  name: string;
  version: string;
  purl?: string;
  licenses?: { license: { id: string } }[];
  description?: string;
  scope?: string;
}

interface CycloneDXDep {
  ref: string;
  dependsOn: string[];
}

export class SBOMGenerator {
  async generate(repositoryId: string): Promise<{ bom: CycloneDXSBOM; componentCount: number }> {
    // Get repo info
    const repo = await db.query.repositories.findFirst({
      where: eq(repositories.id, repositoryId),
    });

    // Get all dependencies
    const deps = await db
      .select()
      .from(dependencies)
      .where(eq(dependencies.repositoryId, repositoryId));

    // Build components
    const components: CycloneDXComponent[] = deps.map((dep) => ({
      "bom-ref": `pkg:${dep.type}/${dep.name}@${dep.version}`,
      type: "library",
      name: dep.name,
      version: dep.version,
      purl: `pkg:${dep.type}/${dep.name}@${dep.version}`,
      licenses: dep.license
        ? [{ license: { id: dep.license } }]
        : undefined,
      scope: dep.isDevDependency ? "development" : "runtime",
      description: dep.description ?? undefined,
    }));

    // Build dependency tree
    const bomDeps: CycloneDXDep[] = components.map((c) => ({
      ref: c["bom-ref"],
      dependsOn: [],
    }));

    // Build BOM
    const bom: CycloneDXSBOM = {
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      serialNumber: `urn:uuid:${crypto.randomUUID()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ name: "ACRE", version: "0.1.0" }],
        component: {
          name: repo?.name ?? "unknown",
          type: "application",
          version: "latest",
        },
      },
      components,
      dependencies: bomDeps,
    };

    // Store in database
    await db
      .insert(sbom)
      .values({
        repositoryId,
        format: "cyclonedx",
        content: bom as any,
        version: "1.0.0",
        componentCount: components.length,
      })
      .returning();

    return { bom, componentCount: components.length };
  }

  async getLatest(repositoryId: string): Promise<{ bom: CycloneDXSBOM | null }> {
    const result = await db.query.sbom.findFirst({
      where: eq(sbom.repositoryId, repositoryId),
      orderBy: desc(sbom.generatedAt),
    });

    return { bom: (result?.content as CycloneDXSBOM) ?? null };
  }
}

export const sbomGenerator = new SBOMGenerator();
