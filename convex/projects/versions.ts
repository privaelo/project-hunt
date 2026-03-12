import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { getCurrentUserOrThrow } from "../users";
import { calculateHotScore } from "./helpers";

export const listByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("projectVersions")
      .withIndex("by_project_createdAt", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    return Promise.all(
      versions.map(async (version) => {
        const creator = await ctx.db.get(version.userId);
        const files = await ctx.db
          .query("versionFiles")
          .withIndex("by_version", (q) => q.eq("versionId", version._id))
          .collect();
        return {
          ...version,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
          fileCount: files.length,
        };
      })
    );
  },
});

export const getVersionFiles = query({
  args: {
    versionId: v.id("projectVersions"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("versionFiles")
      .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
      .collect();
    return Promise.all(
      files.map(async (file) => ({
        _id: file._id,
        filename: file.filename,
        contentType: file.contentType,
        fileSize: file.fileSize,
        uploadedAt: file.uploadedAt,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );
  },
});

export const createVersion = mutation({
  args: {
    projectId: v.id("projects"),
    tag: v.string(),
    title: v.string(),
    body: v.optional(v.string()),
    readinessStatus: v.optional(
      v.union(
        v.literal("just_an_idea"),
        v.literal("early_prototype"),
        v.literal("mostly_working"),
        v.literal("ready_to_use")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.userId !== user._id) {
      throw new Error("You can only post versions to your own projects");
    }

    const now = Date.now();

    const versionId = await ctx.db.insert("projectVersions", {
      projectId: args.projectId,
      tag: args.tag,
      title: args.title,
      body: args.body,
      userId: user._id,
      createdAt: now,
    });

    // Update project: bump hot score, increment version count, optionally update readiness
    const patchFields: Record<string, unknown> = {
      versionCount: (project.versionCount ?? 0) + 1,
      lastVersionAt: now,
      hotScore: calculateHotScore(
        project.engagementScore ?? 0,
        project._creationTime,
        now,
        now
      ),
    };

    if (args.readinessStatus) {
      patchFields.readinessStatus = args.readinessStatus;
    }

    await ctx.db.patch(args.projectId, patchFields);

    // Notify adopters about the project update
    await ctx.scheduler.runAfter(0, internal.notifications.notifyProjectUpdate, {
      projectId: args.projectId,
      actorUserId: user._id,
    });

    return versionId;
  },
});

export const updateVersion = mutation({
  args: {
    versionId: v.id("projectVersions"),
    tag: v.string(),
    title: v.string(),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new Error("Version not found");
    }
    const project = await ctx.db.get(version.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("You can only edit your own project versions");
    }

    await ctx.db.patch(args.versionId, {
      tag: args.tag,
      title: args.title,
      body: args.body,
    });
  },
});

export const deleteVersion = mutation({
  args: {
    versionId: v.id("projectVersions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new Error("Version not found");
    }
    const project = await ctx.db.get(version.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("You can only delete your own project versions");
    }

    // Delete all associated files from storage and table
    const files = await ctx.db
      .query("versionFiles")
      .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
      .collect();
    for (const file of files) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    }

    await ctx.db.delete(args.versionId);

    // Decrement version count
    await ctx.db.patch(version.projectId, {
      versionCount: Math.max(0, (project.versionCount ?? 0) - 1),
    });
  },
});

export const addFileToVersion = mutation({
  args: {
    versionId: v.id("projectVersions"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new Error("Version not found");
    }
    const project = await ctx.db.get(version.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("You can only add files to your own project versions");
    }

    const existingFiles = await ctx.db
      .query("versionFiles")
      .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
      .collect();
    if (existingFiles.length >= 10) {
      throw new Error("Maximum of 10 files per version");
    }

    return await ctx.db.insert("versionFiles", {
      versionId: args.versionId,
      storageId: args.storageId,
      filename: args.filename,
      contentType: args.contentType,
      fileSize: args.fileSize,
      uploadedAt: Date.now(),
    });
  },
});

export const deleteFileFromVersion = mutation({
  args: {
    versionId: v.id("projectVersions"),
    fileId: v.id("versionFiles"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new Error("Version not found");
    }
    const project = await ctx.db.get(version.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("You can only delete files from your own project versions");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file || file.versionId !== args.versionId) {
      throw new Error("File not found");
    }
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
  },
});
