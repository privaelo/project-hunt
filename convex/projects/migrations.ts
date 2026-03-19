import { action } from "../_generated/server";
import { internalMutation as internalMutationFromFunctions } from "../functions";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export const backfillProjectSpacesAction = action({
  args: {},
  handler: async (ctx): Promise<{ inserted: number; skipped: number }> => {
    return await ctx.runMutation(internal.projects.backfillProjectSpaces, {});
  },
});

export const backfillProjectSpaces = internalMutationFromFunctions({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let inserted = 0;
    let skipped = 0;

    for (const project of projects) {
      if (!project.focusAreaId) {
        skipped++;
        continue;
      }

      // Skip if a primary membership row already exists
      const existing = await ctx.db
        .query("projectSpaces")
        .withIndex("by_project_focusArea", (q) =>
          q.eq("projectId", project._id).eq("focusAreaId", project.focusAreaId as Id<"focusAreas">)
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("projectSpaces", {
        projectId: project._id,
        focusAreaId: project.focusAreaId as Id<"focusAreas">,
        isPrimary: true,
        hotScore: project.hotScore ?? 0,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

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

export const clearFocusAreaIdFromProjectsAction = action({
  args: {},
  handler: async (ctx): Promise<{ updated: number }> => {
    return await ctx.runMutation(internal.projects.clearFocusAreaIdFromProjects, {});
  },
});

export const clearFocusAreaIdFromProjects = internalMutationFromFunctions({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    let updated = 0;
    for (const project of projects) {
      if (project.focusAreaId === undefined) continue;
      await ctx.db.patch(project._id, { focusAreaId: undefined });
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
