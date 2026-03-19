import type { Id, Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { getSecondarySpacesForProject } from "./spaces";

const HOT_SCORE_GRAVITY = 1.0;
const HOT_SCORE_AGE_OFFSET = 2;

/**
 * Calculate HN-style hot score for a project
 * Formula: (score + 1) / (age_hours + 2)^gravity
 */
export function calculateHotScore(
  engagementScore: number,
  creationTime: number,
  now: number = Date.now(),
  lastVersionAt?: number
): number {
  const effectiveTime = lastVersionAt ? Math.max(creationTime, lastVersionAt) : creationTime;
  const ageHours = (now - effectiveTime) / (1000 * 60 * 60);
  return (engagementScore + 1) / Math.pow(ageHours + HOT_SCORE_AGE_OFFSET, HOT_SCORE_GRAVITY);
}

export async function enrichProjects(
  ctx: QueryCtx,
  projects: Doc<"projects">[],
  userId: Id<"users"> | undefined
) {
  const focusAreaIds = Array.from(
    new Set(projects.map((project) => project.focusAreaId).filter((id): id is Id<"focusAreas"> => id !== undefined))
  );
  const focusAreaDocs = await Promise.all(
    focusAreaIds.map((id) => ctx.db.get(id))
  );
  const focusAreaMap = new Map(
    focusAreaDocs
      .filter((fa): fa is NonNullable<typeof fa> => fa !== null)
      .map((fa) => [fa._id, fa])
  );

  return Promise.all(
    projects.map(async (project) => {
      const [upvotes, comments, creator, team, mediaFiles, adoptions] = await Promise.all([
        ctx.db
          .query("upvotes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect(),
        ctx.db
          .query("comments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .filter((q) => q.neq(q.field("isDeleted"), true))
          .collect(),
        ctx.db.get(project.userId),
        project.teamId ? ctx.db.get(project.teamId) : Promise.resolve(null),
        ctx.db
          .query("mediaFiles")
          .withIndex("by_project_ordered", (q) => q.eq("projectId", project._id))
          .order("asc")
          .collect(),
        ctx.db
          .query("adoptions")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .order("desc")
          .collect(),
      ]);

      const previewMedia = await Promise.all(
        mediaFiles.map(async (media) => ({
          _id: media._id,
          storageId: media.storageId,
          type: media.type,
          url: await ctx.storage.getUrl(media.storageId),
        }))
      );

      const focusAreaDoc = project.focusAreaId ? focusAreaMap.get(project.focusAreaId) : null;
      const focusArea = focusAreaDoc ? {
        _id: focusAreaDoc._id,
        name: focusAreaDoc.name,
        group: focusAreaDoc.group,
        icon: focusAreaDoc.icon,
      } : null;

      const [adoptersWithInfo, additionalFocusAreas] = await Promise.all([
        Promise.all(
          adoptions.slice(0, 4).map(async (adoption) => {
            const user = await ctx.db.get(adoption.userId);
            return {
              _id: adoption.userId,
              name: user?.name ?? "Unknown User",
              avatarUrl: user?.avatarUrlId ?? "",
            };
          })
        ),
        getSecondarySpacesForProject(ctx, project._id),
      ]);

      return {
        ...project,
        team: team?.name ?? "",
        upvotes: upvotes.length,
        viewCount: project.viewCount ?? 0,
        commentCount: comments.length,
        hasUpvoted: userId ? upvotes.some((u) => u.userId === userId) : false,
        creatorName: creator?.name ?? "Unknown User",
        creatorAvatar: creator?.avatarUrlId ?? "",
        focusArea,
        additionalFocusAreas,
        previewMedia,
        adoptionCount: adoptions.length,
        adopters: adoptersWithInfo,
        hasAdopted: userId ? adoptions.some((a) => a.userId === userId) : false,
      };
    })
  );
}
