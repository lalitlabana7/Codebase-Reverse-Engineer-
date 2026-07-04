// Ingestion Engine - Main Entry Point
export { GitHubClient, type GitHubRepo, type GitTreeItem, type ScannedAPIFile } from "./github";
export { scanDirectory, detectLanguage, type ScannedFile, type ScanResult } from "./scanner";
export { parseDependencies, type ParsedDependency, type DependencyParseResult } from "./deps";
export { chunkFile, chunkWithOverlap, estimateTokens, type CodeChunk } from "./chunker";
export { cloneRepository, parseGitUrl, cleanupRepo, type CloneResult } from "./git";
export { analyzeRepository, type AnalysisInput, type AnalysisOutput, type FolderEntry, type TechDetection, type ImportantFile } from "./analyzer";
export { analyzeRepositoryViaApi } from "./analyzer-github";
