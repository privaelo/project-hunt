import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { rag } from "./rag";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const at = (offsetMs: number) => now + offsetMs;

    // 1. Focus Areas
    const focusAreaIds: Id<"focusAreas">[] = [];
    const focusAreas = [
      { name: "AI Infrastructure", group: "Technical", description: "Systems and tooling for AI." },
      { name: "Go-to-Market", group: "Business", description: "Launch and distribution strategy." },
      { name: "UX Research", group: "Design", description: "User discovery and research." },
      { name: "Data Privacy", group: "Compliance", description: "Privacy and governance." },
      { name: "Developer Productivity", group: "Technical", description: undefined },
    ];

    for (let i = 0; i < focusAreas.length; i += 1) {
      const focusArea = focusAreas[i];
      const id = await ctx.db.insert("focusAreas", {
        ...focusArea,
        isActive: i !== focusAreas.length - 1,
        createdAt: now + i * 10,
      });
      focusAreaIds.push(id);
    }

    // 2. Teams
    const teamIds: Id<"teams">[] = [];
    const teams = [
      { name: "Velocity Lab", description: "R&D skunkworks." },
      { name: "Product Studio", description: "Product design and launch." },
      { name: "Community Collective", description: undefined },
    ];

    for (let i = 0; i < teams.length; i += 1) {
      const team = teams[i];
      const id = await ctx.db.insert("teams", {
        ...team,
        createdAt: at(1000 + i * 10),
      });
      teamIds.push(id);
    }

    // 3. Users
    const userIds: Id<"users">[] = [];
    const users = [
      { name: "Alex Johnson", teamId: teamIds[0], userIntent: "sharing" as const },
      { name: "Riley Chen", teamId: teamIds[0], userIntent: "looking" as const },
      { name: "Jordan Lee", teamId: teamIds[1], userIntent: "both" as const },
      { name: "Casey Patel", teamId: undefined, userIntent: undefined },
      { name: "Morgan Brooks", teamId: teamIds[1], userIntent: "sharing" as const },
      { name: "Sam Rivera", teamId: teamIds[0], userIntent: "looking" as const },
      { name: "Taylor Nguyen", teamId: undefined, userIntent: "both" as const },
      { name: "Jamie Ortiz", teamId: teamIds[1], userIntent: "looking" as const },
      { name: "Devon Blake", teamId: teamIds[2], userIntent: undefined },
    ];

    for (let i = 0; i < users.length; i += 1) {
      const user = users[i];
      const id = await ctx.db.insert("users", {
        name: user.name,
        email: i === 3 ? undefined : `preview_user_${String(i + 1).padStart(2, "0")}@example.com`,
        workosUserId: `user_preview_${String(i + 1).padStart(2, "0")}`,
        avatarUrlId: i % 2 === 0 ? `avatar_${i + 1}` : undefined,
        onboardingCompleted: i !== 4,
        teamId: user.teamId,
        userIntent: user.userIntent,
        tokenIdentifier: i === 5 ? `token_preview_${i + 1}` : undefined,
      });
      userIds.push(id);
    }

    // 4. User Focus Areas
    const userFocusAreaMappings = [
      { userId: userIds[0], focusAreaIds: [focusAreaIds[0], focusAreaIds[2]] },
      { userId: userIds[1], focusAreaIds: [focusAreaIds[1]] },
      { userId: userIds[2], focusAreaIds: [focusAreaIds[3]] },
      { userId: userIds[3], focusAreaIds: [focusAreaIds[0]] },
      { userId: userIds[4], focusAreaIds: [focusAreaIds[1], focusAreaIds[3]] },
      { userId: userIds[5], focusAreaIds: [focusAreaIds[0]] },
      { userId: userIds[6], focusAreaIds: [focusAreaIds[2]] },
      { userId: userIds[7], focusAreaIds: [focusAreaIds[1], focusAreaIds[2]] },
      { userId: userIds[8], focusAreaIds: [focusAreaIds[4]] },
    ];

    let userFocusAreaCount = 0;
    for (const mapping of userFocusAreaMappings) {
      for (const focusAreaId of mapping.focusAreaIds) {
        await ctx.db.insert("userFocusAreas", {
          userId: mapping.userId,
          focusAreaId,
          createdAt: at(2000),
        });
        userFocusAreaCount += 1;
      }
    }

    // 5. Projects
    const projectIds: Id<"projects">[] = [];
    const projects = [
      {
        name: "Signal Atlas",
        summary: "Discover competitor signals across the web.",
        userId: userIds[0],
        teamId: teamIds[0],
        focusAreaId: focusAreaIds[0],
        status: "active" as const,
        readinessStatus: "ready_to_use" as const,
        upvotes: 2,
        links: [{ url: "https://example.com/signal-atlas", label: "Signal Atlas" }],
        pinned: true,
        engagementScore: 78,
        hotScore: 92,
      },
      {
        name: "Launch Compass",
        summary: "Plan and execute launch playbooks.",
        userId: userIds[1],
        teamId: teamIds[0],
        focusAreaId: focusAreaIds[1],
        status: "active" as const,
        readinessStatus: "early_prototype" as const,
        upvotes: 1,
        links: [{ url: "https://example.com/launch-compass", label: "Launch Compass" }],
        pinned: false,
        engagementScore: 52,
        hotScore: 40,
      },
      {
        name: "Insight Vault",
        summary: "Organize user research in one place.",
        userId: userIds[2],
        teamId: teamIds[1],
        focusAreaId: focusAreaIds[2],
        status: "pending" as const,
        readinessStatus: "mostly_working" as const,
        upvotes: 1,
        links: [{ url: "https://example.com/insight-vault", label: "Insight Vault" }],
        pinned: undefined,
        engagementScore: undefined,
        hotScore: undefined,
      },
      {
        name: "Privacy Pulse",
        summary: "Track privacy posture and compliance gaps.",
        userId: userIds[3],
        teamId: undefined,
        focusAreaId: focusAreaIds[3],
        status: "active" as const,
        readinessStatus: "ready_to_use" as const,
        upvotes: 3,
        links: [{ url: "https://example.com/privacy-pulse", label: "Privacy Pulse" }],
        pinned: true,
        engagementScore: 90,
        hotScore: 98,
      },
      {
        name: "Signal Forge",
        summary: undefined,
        userId: userIds[8],
        teamId: teamIds[2],
        focusAreaId: focusAreaIds[4],
        status: "pending" as const,
        readinessStatus: "ready_to_use" as const,
        upvotes: 0,
        links: undefined,
        pinned: false,
        engagementScore: 12,
        hotScore: 10,
      },
    ];

    for (const project of projects) {
      const allFields = [project.name, project.summary, project.links]
        .filter(Boolean)
        .join(" ");
      const id = await ctx.db.insert("projects", {
        name: project.name,
        summary: project.summary,
        userId: project.userId,
        teamId: project.teamId,
        focusAreaId: project.focusAreaId,
        status: project.status,
        readinessStatus: project.readinessStatus,
        upvotes: project.upvotes,
        viewCount: project.upvotes * 10,
        links: project.links,
        pinned: project.pinned,
        engagementScore: project.engagementScore,
        hotScore: project.hotScore,
        allFields,
      });
      projectIds.push(id);
    }

    // 6. Media Files
    // Note: ctx.storage.store() is not available in mutations.
    // Media files require client-side upload via generateUploadUrl().
    // Skipping media seeding - upload files manually if needed.
    const mediaFilesInserted = 0;

    // 7. Comments
    const commentIds: Id<"comments">[] = [];
    const comments = [
      { projectId: projectIds[0], userId: userIds[1], content: "Love the direction.", upvotes: 0 },
      { projectId: projectIds[0], userId: userIds[2], content: "Would like a demo.", upvotes: 1 },
      { projectId: projectIds[1], userId: userIds[0], content: "Great execution.", upvotes: undefined },
      { projectId: projectIds[2], userId: userIds[3], content: "Interesting idea.", upvotes: 2 },
    ];

    for (const comment of comments) {
      const id = await ctx.db.insert("comments", {
        projectId: comment.projectId,
        userId: comment.userId,
        content: comment.content,
        createdAt: at(4000),
        upvotes: comment.upvotes,
      });
      commentIds.push(id);
    }

    const replyId = await ctx.db.insert("comments", {
      projectId: projectIds[0],
      userId: userIds[0],
      content: "Thanks! Happy to share a walkthrough.",
      parentCommentId: commentIds[0],
      createdAt: at(4200),
      upvotes: 1,
    });

    await ctx.db.insert("comments", {
      projectId: projectIds[2],
      userId: userIds[2],
      content: "Removed due to duplication.",
      parentCommentId: undefined,
      createdAt: at(4300),
      isDeleted: true,
      upvotes: 0,
    });

    commentIds.push(replyId);

    // 8. Project Upvotes
    let projectUpvoteCount = 0;
    const projectUpvotes = [
      { projectId: projectIds[0], userIds: [userIds[1], userIds[2]] },
      { projectId: projectIds[1], userIds: [userIds[0]] },
      { projectId: projectIds[3], userIds: [userIds[0], userIds[1], userIds[2]] },
    ];

    for (const mapping of projectUpvotes) {
      for (const userId of mapping.userIds) {
        await ctx.db.insert("upvotes", {
          projectId: mapping.projectId,
          userId,
          createdAt: at(5000),
        });
        projectUpvoteCount += 1;
      }
    }

    // 9. Adoptions
    let adoptionCount = 0;
    const adoptionMappings = [
      {
        projectId: projectIds[0],
        userIds: [
          userIds[0],
          userIds[1],
          userIds[2],
          userIds[3],
          userIds[4],
          userIds[5],
          userIds[6],
          userIds[7],
        ],
      },
      {
        projectId: projectIds[1],
        userIds: [
          userIds[0],
          userIds[1],
          userIds[2],
          userIds[3],
          userIds[4],
          userIds[5],
          userIds[6],
          userIds[7],
        ],
      },
      { projectId: projectIds[2], userIds: [userIds[1], userIds[3]] },
      { projectId: projectIds[4], userIds: [userIds[8]] },
    ];

    for (const mapping of adoptionMappings) {
      for (const userId of mapping.userIds) {
        await ctx.db.insert("adoptions", {
          projectId: mapping.projectId,
          userId,
          createdAt: at(5200),
        });
        adoptionCount += 1;
      }
    }

    // 10. Comment Upvotes
    let commentUpvoteCount = 0;
    const commentUpvotes = [
      { commentId: commentIds[0], userIds: [userIds[0], userIds[3]] },
      { commentId: commentIds[1], userIds: [userIds[1]] },
      { commentId: commentIds[2], userIds: [userIds[2]] },
    ];

    for (const mapping of commentUpvotes) {
      for (const userId of mapping.userIds) {
        await ctx.db.insert("commentUpvotes", {
          commentId: mapping.commentId,
          userId,
          createdAt: at(5400),
        });
        commentUpvoteCount += 1;
      }
    }

    // 11. Project Views
    const projectViews = [
      { projectId: projectIds[0], viewerId: "anon_001" },
      { projectId: projectIds[0], viewerId: "anon_002" },
      { projectId: projectIds[1], viewerId: "anon_001" },
      { projectId: projectIds[3], viewerId: "anon_003" },
    ];
    for (const view of projectViews) {
      await ctx.db.insert("projectViews", {
        ...view,
        viewedAt: at(5600),
      });
    }

    // 12. Notifications
    const notifications = [
      {
        recipientUserId: userIds[0],
        actorUserId: userIds[1],
        projectId: projectIds[0],
        type: "comment" as const,
        commentId: commentIds[0],
        count: 1,
      },
      {
        recipientUserId: userIds[1],
        actorUserId: userIds[0],
        projectId: projectIds[1],
        type: "upvote" as const,
        commentId: undefined,
        count: undefined,
      },
      {
        recipientUserId: userIds[2],
        actorUserId: userIds[3],
        projectId: projectIds[2],
        type: "adoption" as const,
        commentId: undefined,
        count: 2,
      },
      {
        recipientUserId: userIds[3],
        actorUserId: userIds[0],
        projectId: projectIds[3],
        type: "project_update" as const,
        commentId: undefined,
        count: undefined,
      },
    ];
    for (let i = 0; i < notifications.length; i += 1) {
      const notification = notifications[i];
      await ctx.db.insert("notifications", {
        recipientUserId: notification.recipientUserId,
        actorUserId: notification.actorUserId,
        projectId: notification.projectId,
        type: notification.type,
        commentId: notification.commentId,
        count: notification.count,
        isRead: i % 2 === 0,
        createdAt: at(5800 + i * 10),
        lastActivityAt: at(5900 + i * 10),
      });
    }

    // 13. Allowed Domains
    const allowedDomains = [
      { domain: "example.com", organizationId: "org_example" },
      { domain: "projecthunt.dev", organizationId: "org_projecthunt" },
    ];
    for (const domain of allowedDomains) {
      await ctx.db.insert("allowedDomains", domain);
    }

    // Build project data for RAG indexing (to be done in seedAll action)
    const projectsForRag = projects.map((project, index) => ({
      projectId: projectIds[index],
      name: project.name,
      summary: project.summary,
    }));

    return {
      success: true,
      summary: {
        focusAreas: focusAreas.length,
        teams: teams.length,
        users: users.length,
        userFocusAreas: userFocusAreaCount,
        projects: projects.length,
        mediaFiles: mediaFilesInserted,
        comments: commentIds.length + 1, // includes deleted comment
        projectUpvotes: projectUpvoteCount,
        adoptions: adoptionCount,
        commentUpvotes: commentUpvoteCount,
        projectViews: projectViews.length,
        notifications: notifications.length,
        allowedDomains: allowedDomains.length,
      },
      projectsForRag,
    };
  },
});

// Seed everything: WorkOS data (real users/domains) + test data
export const seedAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    workos: unknown;
    testData: unknown;
    ragIndexed: number;
  }> => {
    console.log("Running full seed: WorkOS + test data...");

    // First, seed real users and domains from WorkOS
    const workosResult = await ctx.runAction(internal.admin.seedFromWorkOS, {});
    console.log("WorkOS seeding complete:", workosResult);

    // Then, seed test data (fake users, projects, comments, etc.)
    const testDataResult = await ctx.runMutation(internal.seed.seed, {});
    console.log("Test data seeding complete:", testDataResult);

    // Index projects in RAG component
    console.log("Indexing projects in RAG...");
    let ragIndexed = 0;
    for (const project of testDataResult.projectsForRag) {
      const text = project.summary
        ? `${project.name}\n\n${project.summary}`
        : project.name;

      const { entryId } = await rag.add(ctx, {
        namespace: "projects",
        text,
        key: project.projectId,
      });

      // Update project with entryId
      await ctx.runMutation(internal.projects.updateEntryId, {
        projectId: project.projectId,
        entryId,
      });

      ragIndexed++;
    }
    console.log(`RAG indexing complete: ${ragIndexed} projects indexed`);

    return {
      success: true,
      workos: workosResult,
      testData: testDataResult,
      ragIndexed,
    };
  },
});
