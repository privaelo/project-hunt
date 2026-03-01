import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "../users";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const getMediaUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const addFileToProject = mutation({
  args: {
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.userId !== user._id) {
      throw new Error("You can only edit your own projects");
    }
    const existingFiles = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    if (existingFiles.length >= 10) {
      throw new Error("Maximum of 10 files per project");
    }
    return await ctx.db.insert("projectFiles", {
      projectId: args.projectId,
      storageId: args.storageId,
      filename: args.filename,
      contentType: args.contentType,
      fileSize: args.fileSize,
      uploadedAt: Date.now(),
    });
  },
});

export const deleteFileFromProject = mutation({
  args: {
    projectId: v.id("projects"),
    fileId: v.id("projectFiles"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.userId !== user._id) {
      throw new Error("You can only edit your own projects");
    }
    const file = await ctx.db.get(args.fileId);
    if (!file || file.projectId !== args.projectId) {
      throw new Error("File not found");
    }
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
  },
});

export const getProjectFiles = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return await Promise.all(
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

export const addMediaToProject = mutation({
  args: {
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    type: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.userId !== user._id) {
      throw new Error("You can only edit your own projects");
    }
    const existingMedia = await ctx.db
      .query("mediaFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const maxOrder = existingMedia.length > 0
      ? Math.max(...existingMedia.map(m => m.order))
      : -1;
    return await ctx.db.insert("mediaFiles", {
      projectId: args.projectId,
      storageId: args.storageId,
      type: args.type,
      contentType: args.contentType,
      order: maxOrder + 1,
      uploadedAt: Date.now(),
    });
  },
});

export const deleteMediaFromProject = mutation({
  args: {
    projectId: v.id("projects"),
    mediaId: v.id("mediaFiles"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.userId !== user._id) {
      throw new Error("You can only edit your own projects");
    }
    const media = await ctx.db.get(args.mediaId);
    if (!media) {
      throw new Error("Media not found");
    }
    await ctx.storage.delete(media.storageId);
    await ctx.db.delete(args.mediaId);
  },
});

export const getProjectMedia = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const mediaFiles = await ctx.db
      .query("mediaFiles")
      .withIndex("by_project_ordered", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .collect();
    return await Promise.all(
      mediaFiles.map(async (media) => ({
        _id: media._id,
        storageId: media.storageId,
        type: media.type,
        url: await ctx.storage.getUrl(media.storageId),
      }))
    );
  },
});

export const reorderProjectMedia = mutation({
  args: {
    projectId: v.id("projects"),
    orderedMediaIds: v.array(v.id("mediaFiles")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.userId !== user._id) {
      throw new Error("You can only edit your own projects");
    }
    const mediaFiles = await ctx.db
      .query("mediaFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    if (mediaFiles.length !== args.orderedMediaIds.length) {
      throw new Error("Ordered media list does not match existing media count");
    }
    const mediaIds = new Set(mediaFiles.map((media) => media._id));
    for (const mediaId of args.orderedMediaIds) {
      if (!mediaIds.has(mediaId)) {
        throw new Error("Invalid media id in order list");
      }
    }
    await Promise.all(
      args.orderedMediaIds.map((mediaId, index) =>
        ctx.db.patch(mediaId, { order: index })
      )
    );
  },
});
