// Database Service Layer
import { db } from "@codebuff/database";
import {
  users,
  repositories,
  analyses,
  securityFindings,
  secrets,
  securityScores,
  dependencies,
  chatSessions,
  chatMessages,
  notifications,
  activityLogs,
} from "@codebuff/database";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";

// ======== User Service ========
export const userService = {
  async findById(id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  },

  async findByClerkId(clerkId: string) {
    return db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  },

  async upsert(data: {
    clerkId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }) {
    const existing = await this.findByClerkId(data.clerkId);
    if (existing) {
      return db
        .update(users)
        .set({
          email: data.email,
          name: data.name ?? existing.name,
          avatarUrl: data.avatarUrl ?? existing.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
    }      return db
        .insert(users)
        .values({
          clerkId: data.clerkId,
          email: data.email,
          name: data.name,
          avatarUrl: data.avatarUrl,
        })
        .onConflictDoNothing({ target: users.clerkId })
        .returning();
  },
};

// ======== Repository Service ========
export const repositoryService = {
  async list(userId: string) {
    return db.query.repositories.findMany({
      where: eq(repositories.userId, userId),
      orderBy: desc(repositories.updatedAt),
    });
  },

  async findById(id: string) {
    return db.query.repositories.findFirst({ where: eq(repositories.id, id) });
  },

  async create(data: {
    userId: string;
    name: string;
    url: string;
    fullName?: string;
    description?: string;
    language?: string;
    topics?: string[];
    stars?: number;
    isPrivate?: boolean;
    defaultBranch?: string;
    cloneStatus?: string;
    organizationId?: string;
  }) {      return db
        .insert(repositories)
        .values({
          userId: data.userId,
          name: data.name,
          url: data.url,
          fullName: data.fullName,
          description: data.description,
          language: data.language,
          topics: data.topics,
          stars: data.stars ?? 0,
          isPrivate: data.isPrivate ?? false,
          defaultBranch: data.defaultBranch ?? "main",
          cloneStatus: (data.cloneStatus as any) ?? "pending",
          organizationId: data.organizationId,
        })
        .returning();
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      language: string;
      cloneStatus: string;
      clonedAt: Date;
      size: number;
      fileCount: number;
      lastAnalysisAt: Date;
    }>
  ) {
    return db
      .update(repositories)
      .set({ ...(data as any), updatedAt: new Date() })
      .where(eq(repositories.id, id))
      .returning();
  },

  async delete(id: string) {
    return db.delete(repositories).where(eq(repositories.id, id)).returning();
  },
};

// ======== Analysis Service ========
export const analysisService = {
  async list(repositoryId: string) {
    return db.query.analyses.findMany({
      where: eq(analyses.repositoryId, repositoryId),
      orderBy: desc(analyses.createdAt),
    });
  },

  async listAll(userId: string) {
    // Get user's repository IDs first
    const userRepos = await db
      .select({ id: repositories.id, name: repositories.name })
      .from(repositories)
      .where(eq(repositories.userId, userId));
    
    const repoIds = userRepos.map(r => r.id);
    if (repoIds.length === 0) return [];
    
    const repoMap = new Map(userRepos.map(r => [r.id, r.name]));
    
    const results = await db.query.analyses.findMany({
      where: inArray(analyses.repositoryId, repoIds),
      orderBy: desc(analyses.createdAt),
      limit: 50,
    });
    
    // Attach repository name to each analysis
    return results.map(a => ({
      ...a,
      repositoryName: repoMap.get(a.repositoryId) ?? 'Unknown',
    }));
  },

  async create(data: {
    repositoryId: string;
    type?: string;
  }) {
    return db
      .insert(analyses)
      .values({
        repositoryId: data.repositoryId,
        type: (data.type as any) ?? "full",
      })
      .returning();
  },

  async updateStatus(
    id: string,
    status: string,
    data?: Record<string, unknown>
  ) {
    return db
      .update(analyses)
      .set({
        status: status as any,
        ...(data as any),
        completedAt: status === "completed" ? new Date() : undefined,
        startedAt: status === "processing" ? new Date() : undefined,
      })
      .where(eq(analyses.id, id))
      .returning();
  },
};

// ======== Security Service ========
export const securityService = {
  async getScore(repositoryId: string) {
    return db.query.securityScores.findFirst({
      where: eq(securityScores.repositoryId, repositoryId),
      orderBy: desc(securityScores.calculatedAt),
    });
  },

  async createScore(data: {
    repositoryId: string;
    overall: number;
    codeQuality: number;
    dependencyHealth: number;
    architectureScore: number;
    vulnerabilityScore: number;
    riskPosture: string;
  }) {
    return db
      .insert(securityScores)
      .values({
        repositoryId: data.repositoryId,
        overall: String(data.overall),
        codeQuality: String(data.codeQuality),
        dependencyHealth: String(data.dependencyHealth),
        architectureScore: String(data.architectureScore),
        vulnerabilityScore: String(data.vulnerabilityScore),
        riskPosture: data.riskPosture as any,
      })
      .returning();
  },

  async listFindings(repositoryId: string) {
    return db.query.securityFindings.findMany({
      where: eq(securityFindings.repositoryId, repositoryId),
      orderBy: desc(securityFindings.createdAt),
    });
  },

  async createFinding(data: {
    repositoryId: string;
    analysisId?: string;
    type: string;
    severity: string;
    title: string;
    description?: string;
    filePath?: string;
    codeSnippet?: string;
    cveId?: string;
    recommendation?: string;
  }) {
    return db
      .insert(securityFindings)
      .values({
        repositoryId: data.repositoryId,
        analysisId: data.analysisId,
        type: data.type as any,
        severity: data.severity as any,
        title: data.title,
        description: data.description,
        filePath: data.filePath,
        codeSnippet: data.codeSnippet,
        cveId: data.cveId,
        recommendation: data.recommendation,
      })
      .returning();
  },

  async listSecrets(repositoryId: string) {
    return db.query.secrets.findMany({
      where: eq(secrets.repositoryId, repositoryId),
      orderBy: desc(secrets.discoveredAt),
    });
  },
};

// ======== Dependency Service ========
export const dependencyService = {
  async listByRepository(repositoryId: string) {
    return db.query.dependencies.findMany({
      where: eq(dependencies.repositoryId, repositoryId),
      orderBy: desc(dependencies.createdAt),
    });
  },

  async listAll(userId: string) {
    // Get user's repositories first
    const userRepos = await db
      .select({ id: repositories.id, name: repositories.name })
      .from(repositories)
      .where(eq(repositories.userId, userId));
    
    const repoIds = userRepos.map(r => r.id);
    if (repoIds.length === 0) return [];

    return db.query.dependencies.findMany({
      where: inArray(dependencies.repositoryId, repoIds),
      orderBy: desc(dependencies.createdAt),
      limit: 200,
    });
  },

  async getSummary(repositoryId: string) {
    const depsList = await this.listByRepository(repositoryId);
    return {
      total: depsList.length,
      direct: depsList.filter(d => d.isDirect).length,
      devDeps: depsList.filter(d => d.isDevDependency).length,
      outdated: depsList.filter(d => d.isOutdated).length,
      vulnerable: depsList.filter(d => (d.vulnerabilities as any[])?.length > 0).length,
      ecosystems: [...new Set(depsList.map(d => d.type))],
    };
  },

  async listAllSummary(userId: string) {
    const depsList = await this.listAll(userId);
    return {
      total: depsList.length,
      direct: depsList.filter(d => d.isDirect).length,
      devDeps: depsList.filter(d => d.isDevDependency).length,
      outdated: depsList.filter(d => d.isOutdated).length,
      vulnerable: depsList.filter(d => (d.vulnerabilities as any[])?.length > 0).length,
      ecosystems: [...new Set(depsList.map(d => d.type))] as string[],
    };
  },
};

// ======== Chat Service ========
export const chatService = {
  async listSessions(repositoryId: string, userId: string) {
    return db.query.chatSessions.findMany({
      where: and(
        eq(chatSessions.repositoryId, repositoryId),
        eq(chatSessions.userId, userId)
      ),
      orderBy: desc(chatSessions.updatedAt),
    });
  },

  async createSession(repositoryId: string, userId: string, title?: string) {
    return db
      .insert(chatSessions)
      .values({ repositoryId, userId, title })
      .returning();
  },

  async getMessages(sessionId: string) {
    return db.query.chatMessages.findMany({
      where: eq(chatMessages.sessionId, sessionId),
      orderBy: asc(chatMessages.createdAt),
    });
  },

  async addMessage(data: {
    sessionId: string;
    role: string;
    content: string;
    sources?: Record<string, unknown>;
    tokensUsed?: number;
  }) {
    // Update message count
    await db
      .update(chatSessions)
      .set({
        messageCount: sql`message_count + 1`,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, data.sessionId));

    return db
      .insert(chatMessages)
      .values({
        sessionId: data.sessionId,
        role: data.role as any,
        content: data.content,
        sources: data.sources as any,
        tokensUsed: data.tokensUsed,
      })
      .returning();
  },

  async deleteSession(sessionId: string) {
    return db.delete(chatSessions).where(eq(chatSessions.id, sessionId)).returning();
  },
};

// ======== Notification Service ========
export const notificationService = {
  async list(userId: string) {
    return db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: desc(notifications.createdAt),
      limit: 50,
    });
  },

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message?: string;
    data?: Record<string, unknown>;
  }) {
    return db
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        data: data.data as any,
      })
      .returning();
  },

  async markAsRead(id: string) {
    return db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
  },

  async unreadCount(userId: string) {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      );
    return result[0]?.count ?? 0;
  },
};

// ======== Activity Service ========
export const activityService = {
  async list(limit = 20) {
    return db.query.activityLogs.findMany({
      orderBy: desc(activityLogs.createdAt),
      limit,
    });
  },

  async create(data: {
    userId: string;
    organizationId?: string;
    action: string;
    metadata?: Record<string, unknown>;
  }) {
    return db
      .insert(activityLogs)
      .values({
        userId: data.userId,
        organizationId: data.organizationId,
        action: data.action as any,
        metadata: data.metadata as any,
      })
      .returning();
  },
};

// ======== Stats Service ========
export const statsService = {
  async getDashboardStats(userId: string) {
    // Get user's repository IDs first
    const userRepos = await db
      .select({ id: repositories.id })
      .from(repositories)
      .where(eq(repositories.userId, userId));
    
    const repoIds = userRepos.map(r => r.id);

    const [repoCount, findingCount, analysisCount] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(repositories)
        .where(eq(repositories.userId, userId)),
      // Scope findings to user's repos
      repoIds.length > 0
        ? db
            .select({ count: sql<number>`count(*)` })
            .from(securityFindings)
            .where(
              and(
                eq(securityFindings.status, "open" as any),
                inArray(securityFindings.repositoryId, repoIds)
              )
            )
        : Promise.resolve([{ count: 0 }]),
      repoIds.length > 0
        ? db
            .select({ count: sql<number>`count(*)` })
            .from(analyses)
            .where(
              and(
                eq(analyses.status, "completed" as any),
                inArray(analyses.repositoryId, repoIds)
              )
            )
        : Promise.resolve([{ count: 0 }]),
    ]);

    const recentActivity = await activityService.list(10);

    return {
      totalRepositories: repoCount[0]?.count ?? 0,
      openFindings: findingCount[0]?.count ?? 0,
      totalAnalyses: analysisCount[0]?.count ?? 0,
      criticalFindings: 0,
      averageSecurityScore: 0,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        metadata: (a.metadata ?? {}) as Record<string, unknown>,
        userName: "User",
        createdAt: a.createdAt.toISOString(),
      })),
    };
  },
};
