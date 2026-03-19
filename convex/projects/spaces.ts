import { v } from "convex/values";
import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { internalMutation as internalMutationFromFunctions } from "../functions";
import { getCurrentUser } from "../users";
import { enrichProjects } from "./helpers";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

// ─── Internal mutations ──────────────────────────────────────────────────────

/**
 * Syncs ALL membership rows (primary + secondary) for a project.
 * Creates/updates/deletes rows so the table matches the desired state.
 */
export const syncProjectSpaceMemberships = internalMutationFromFunctions({
  args: {
    projectId: v.id("projects"),
    primaryFocusAreaId: v.optional(v.id("focusAreas")),
    additionalFocusAreaIds: v.array(v.id("focusAreas")),
    hotScore: v.number(),
  },
  handler: async (ctx, args) => {
    // Build desired membership set
    const desiredMap = new Map<string, boolean>(); // focusAreaId → isPrimary

    if (args.primaryFocusAreaId) {
      desiredMap.set(args.primaryFocusAreaId, true);
    }

    const secondaries = Array.from(
      new Set(
        args.additionalFocusAreaIds.filter(
          (id) => id !== args.primaryFocusAreaId
        )
      )
    );

    for (const id of secondaries) {
      if (!desiredMap.has(id)) {
        desiredMap.set(id, false);
      }
    }

    // Get existing rows
    const existing = await ctx.db
      .query("projectSpaces")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const existingByFocusArea = new Map(
      existing.map((row) => [row.focusAreaId as string, row])
    );

    // Delete rows no longer wanted
    for (const row of existing) {
      if (!desiredMap.has(row.focusAreaId)) {
        await ctx.db.delete(row._id);
      }
    }

    // Insert or update rows
    for (const [focusAreaId, isPrimary] of desiredMap) {
      const existingRow = existingByFocusArea.get(focusAreaId);
      if (existingRow) {
        if (existingRow.isPrimary !== isPrimary || existingRow.hotScore !== args.hotScore) {
          await ctx.db.patch(existingRow._id, { isPrimary, hotScore: args.hotScore });
        }
      } else {
        await ctx.db.insert("projectSpaces", {
          projectId: args.projectId,
          focusAreaId: focusAreaId as Id<"focusAreas">,
          isPrimary,
          hotScore: args.hotScore,
        });
      }
    }
  },
});

/**
 * Removes all membership rows for a project (used on deletion).
 */
export const deleteProjectMemberships = internalMutationFromFunctions({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("projectSpaces")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
  },
});

// ─── Hot score propagation ───────────────────────────────────────────────────

/**
 * Propagate a project's hotScore to all its membership rows.
 * Call this from any mutation that updates a project's hotScore.
 */
export async function propagateHotScoreToMemberships(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  hotScore: number
) {
  const rows = await ctx.db
    .query("projectSpaces")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const row of rows) {
    if (row.hotScore !== hotScore) {
      await ctx.db.patch(row._id, { hotScore });
    }
  }
}

// ─── Shared query helper ─────────────────────────────────────────────────────

export async function getAllSpacesForProject(
  ctx: QueryCtx,
  projectId: Id<"projects">
) {
  const rows = await ctx.db
    .query("projectSpaces")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  const resolved = await Promise.all(
    rows.map(async (row) => {
      const fa = await ctx.db.get(row.focusAreaId);
      if (!fa || !fa.isActive) return null;
      return {
        isPrimary: row.isPrimary,
        space: { _id: fa._id, name: fa.name, group: fa.group, icon: fa.icon },
      };
    })
  );

  const valid = resolved.filter((r): r is NonNullable<typeof r> => r !== null);
  return {
    primary: valid.find((r) => r.isPrimary)?.space ?? null,
    secondary: valid.filter((r) => !r.isPrimary).map((r) => r.space),
  };
}

// ─── Paginated space feed (primary + secondary, sorted by hotScore) ──────────

export const listPaginatedBySpaceMembership = query({
  args: {
    paginationOpts: paginationOptsValidator,
    focusAreaId: v.id("focusAreas"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;

    // Paginate through membership rows sorted by hotScore
    const paginatedResult = await ctx.db
      .query("projectSpaces")
      .withIndex("by_focusArea_hotScore", (q) =>
        q.eq("focusAreaId", args.focusAreaId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Fetch project docs, filtering out any that are pending or deleted
    const projects = (
      await Promise.all(
        paginatedResult.page.map(async (row) => {
          const project = await ctx.db.get(row.projectId);
          if (!project || project.status !== "active") return null;
          return project;
        })
      )
    ).filter((p): p is NonNullable<typeof p> => p !== null);

    const enrichedProjects = await enrichProjects(ctx, projects, userId);

    return {
      ...paginatedResult,
      page: enrichedProjects,
    };
  },
});
