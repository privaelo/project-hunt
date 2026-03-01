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
