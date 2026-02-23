import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    summary: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    upvotes: v.number(),
    viewCount: v.optional(v.number()),
    entryId: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("active")),
    userId: v.id("users"),
    allFields: v.optional(v.string()),
    links: v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
    focusAreaId: v.optional(v.id("focusAreas")),
    readinessStatus: v.optional(v.union(
      v.literal("in_progress"),       // legacy — kept for migration compatibility
      v.literal("just_an_idea"),
      v.literal("early_prototype"),
      v.literal("mostly_working"),
      v.literal("ready_to_use"),
    )),
    pinned: v.optional(v.boolean()),
    engagementScore: v.optional(v.number()),
    hotScore: v.optional(v.number()),
  })
    .searchIndex("allFields", { searchField: "allFields" })
    .index("by_entryId", ["entryId"])
    .index("by_status", ["status"])
    .index("by_userId", ["userId"])
    .index("by_teamId", ["teamId"])
    .index("by_status_engagement", ["status", "engagementScore"])
    .index("by_status_hotScore", ["status", "hotScore"])
    .index("by_status_focusArea_hotScore", ["status", "focusAreaId", "hotScore"]),
  mediaFiles: defineTable({
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    type: v.string(),
    contentType: v.string(),
    order: v.number(),
    uploadedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_ordered", ["projectId", "order"]),
  projectFiles: defineTable({
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
    uploadedAt: v.number(),
  })
    .index("by_project", ["projectId"]),
  upvotes: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_user", ["projectId", "userId"]),
  adoptions: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_user", ["projectId", "userId"])
    .index("by_user", ["userId"]),
  projectViews: defineTable({
    projectId: v.id("projects"),
    viewerId: v.string(),
    viewedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_viewer", ["projectId", "viewerId"]),
  comments: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
    createdAt: v.number(),
    isDeleted: v.optional(v.boolean()),
    upvotes: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_parent", ["parentCommentId"])
    .index("by_user", ["userId"]),
  commentUpvotes: defineTable({
    commentId: v.id("comments"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_comment", ["commentId"])
    .index("by_comment_and_user", ["commentId", "userId"])
    .index("by_user", ["userId"]),
  notifications: defineTable({
    recipientUserId: v.id("users"),
    actorUserId: v.id("users"),
    projectId: v.id("projects"),
    type: v.union(
      v.literal("comment"),
      v.literal("upvote"),
      v.literal("adoption"),
      v.literal("project_update")
    ),
    commentId: v.optional(v.id("comments")),
    count: v.optional(v.number()),
    isRead: v.boolean(),
    createdAt: v.number(),
    lastActivityAt: v.number(),
  })
    .index("by_recipient", ["recipientUserId"])
    .index("by_recipient_and_read", ["recipientUserId", "isRead"])
    .index("by_recipient_last_activity", ["recipientUserId", "lastActivityAt"])
    .index("by_recipient_project_type", ["recipientUserId", "projectId", "type"]),
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    emailLower: v.optional(v.string()),
    avatarUrlId: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    externalUserId: v.optional(v.string()),
    workosUserId: v.optional(v.string()),
    onboardingCompleted: v.boolean(),
    userIntent: v.optional(v.union(v.literal("looking"), v.literal("sharing"), v.literal("both"))),
  })
    .index("by_teamId", ["teamId"])
    .index("by_userIntent", ["userIntent"])
    .index("by_externalUserId", ["externalUserId"])
    .index("by_email", ["email"])
    .index("by_email_lower", ["emailLower"]),
  userFocusAreas: defineTable({
    userId: v.id("users"),
    focusAreaId: v.id("focusAreas"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_focus_area", ["focusAreaId"])
    .index("by_user_and_focus", ["userId", "focusAreaId"]),
  teams: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }),
  focusAreas: defineTable({
    name: v.string(),
    group: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_isActive", ["isActive"])
    .index("by_group", ["group"]),
});
