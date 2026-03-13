import { action } from "../_generated/server";
import { internalMutation as internalMutationFromFunctions } from "../functions";
import { internal } from "../_generated/api";

export const migrateClearFocusAreasAction = action({
  args: {},
  handler: async (ctx): Promise<{ updated: number }> => {
    return await ctx.runMutation(internal.projects.migrateClearFocusAreas, {});
  },
});

export const migrateClearFocusAreas = internalMutationFromFunctions({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    let updated = 0;
    for (const project of projects) {
      await ctx.db.replace(project._id, {
        name: project.name,
        summary: project.summary,
        teamId: project.teamId,
        upvotes: project.upvotes,
        viewCount: project.viewCount,
        entryId: project.entryId,
        status: project.status,
        userId: project.userId,
        allFields: project.allFields,
        links: project.links,
        focusAreaId: undefined,
        readinessStatus: project.readinessStatus,
        pinned: project.pinned,
        engagementScore: project.engagementScore,
        hotScore: project.hotScore,
      });
      updated++;
    }
    return { updated };
  },
});

export const migrateReadinessStatusAction = action({
  args: {},
  handler: async (ctx): Promise<{ updated: number }> => {
    return await ctx.runMutation(internal.projects.migrateReadinessStatus, {});
  },
});

export const migrateReadinessStatus = internalMutationFromFunctions({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    let updated = 0;
    for (const project of projects) {
      if (project.readinessStatus === "in_progress") {
        await ctx.db.patch(project._id, {
          readinessStatus: "early_prototype",
        });
        updated++;
      }
    }
    return { updated };
  },
});

export const migrateBackfillV0Action = action({
  args: {},
  handler: async (ctx): Promise<{ updated: number }> => {
    return await ctx.runMutation(internal.projects.migrateBackfillV0, {});
  },
});

export const migrateBackfillV0 = internalMutationFromFunctions({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    let updated = 0;

    for (const project of projects) {
      if ((project.versionCount ?? 0) === 0) continue;

      // Check if v0 already exists
      const versions = await ctx.db
        .query("projectVersions")
        .withIndex("by_project_createdAt", (q) => q.eq("projectId", project._id))
        .order("asc")
        .collect();

      const hasV0 = versions.some((v) => v.tag === "v0");
      if (hasV0) continue;

      // Find earliest existing version to set v0 createdAt before it
      const earliestVersion = versions[0];
      if (!earliestVersion) continue;

      const projectFiles = await ctx.db
        .query("projectFiles")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();

      const v0Id = await ctx.db.insert("projectVersions", {
        projectId: project._id,
        tag: "v0",
        title: "Initial Release",
        body: undefined,
        links: project.links,
        userId: project.userId,
        createdAt: earliestVersion.createdAt - 1,
      });

      for (const pf of projectFiles) {
        await ctx.db.insert("versionFiles", {
          versionId: v0Id,
          storageId: pf.storageId,
          filename: pf.filename,
          contentType: pf.contentType,
          fileSize: pf.fileSize,
          uploadedAt: pf.uploadedAt,
        });
      }

      await ctx.db.patch(project._id, {
        versionCount: (project.versionCount ?? 0) + 1,
      });

      updated++;
    }

    return { updated };
  },
});
