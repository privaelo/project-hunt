import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
    ];

    for (const focusArea of focusAreas) {
      const id = await ctx.db.insert("focusAreas", {
        ...focusArea,
        isActive: true,
        createdAt: now,
      });
      focusAreaIds.push(id);
    }

    // 2. Teams
    const teamIds: Id<"teams">[] = [];
    const teams = [
      { name: "Velocity Lab", description: "R&D skunkworks." },
      { name: "Product Studio", description: "Product design and launch." },
    ];

    for (const team of teams) {
      const id = await ctx.db.insert("teams", {
        ...team,
        createdAt: at(1000),
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
    ];

    for (let i = 0; i < users.length; i += 1) {
      const user = users[i];
      const id = await ctx.db.insert("users", {
        name: user.name,
        tokenIdentifier: `https://preview-workos.com/oauth/user_${String(i + 1).padStart(2, "0")}`,
        workosUserId: `user_preview_${String(i + 1).padStart(2, "0")}`,
        avatarUrlId: i % 2 === 0 ? `avatar_${i + 1}` : undefined,
        onboardingCompleted: true,
        teamId: user.teamId,
        userIntent: user.userIntent,
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
        focusAreaIds: [focusAreaIds[0], focusAreaIds[1]],
        status: "active" as const,
        readinessStatus: "ready_to_use" as const,
        upvotes: 4,
        entryId: "entry_signal_atlas",
        link: "https://example.com/signal-atlas",
        pinned: true,
        engagementScore: 78,
      },
      {
        name: "Launch Compass",
        summary: "Plan and execute launch playbooks.",
        userId: userIds[1],
        teamId: teamIds[0],
        focusAreaIds: [focusAreaIds[1]],
        status: "active" as const,
        readinessStatus: "in_progress" as const,
        upvotes: 2,
        entryId: "entry_launch_compass",
        link: "https://example.com/launch-compass",
        pinned: false,
        engagementScore: 52,
      },
      {
        name: "Insight Vault",
        summary: "Organize user research in one place.",
        userId: userIds[2],
        teamId: teamIds[1],
        focusAreaIds: [focusAreaIds[2]],
        status: "pending" as const,
        readinessStatus: "in_progress" as const,
        upvotes: 1,
        entryId: "entry_insight_vault",
        link: "https://example.com/insight-vault",
        pinned: undefined,
        engagementScore: undefined,
      },
      {
        name: "Privacy Pulse",
        summary: "Track privacy posture and compliance gaps.",
        userId: userIds[3],
        teamId: undefined,
        focusAreaIds: [focusAreaIds[3], focusAreaIds[0]],
        status: "active" as const,
        readinessStatus: "ready_to_use" as const,
        upvotes: 5,
        entryId: "entry_privacy_pulse",
        link: "https://example.com/privacy-pulse",
        pinned: true,
        engagementScore: 90,
      },
    ];

    for (const project of projects) {
      const allFields = [project.name, project.summary, project.entryId, project.link]
        .filter(Boolean)
        .join(" ");
      const id = await ctx.db.insert("projects", {
        name: project.name,
        summary: project.summary,
        userId: project.userId,
        teamId: project.teamId,
        focusAreaIds: project.focusAreaIds,
        status: project.status,
        readinessStatus: project.readinessStatus,
        upvotes: project.upvotes,
        entryId: project.entryId,
        link: project.link,
        pinned: project.pinned,
        engagementScore: project.engagementScore,
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
      { projectId: projectIds[0], userId: userIds[1], content: "Love the direction." },
      { projectId: projectIds[0], userId: userIds[2], content: "Would like a demo." },
      { projectId: projectIds[1], userId: userIds[0], content: "Great execution." },
      { projectId: projectIds[2], userId: userIds[3], content: "Interesting idea." },
    ];

    for (const comment of comments) {
      const id = await ctx.db.insert("comments", {
        ...comment,
        createdAt: at(4000),
        upvotes: 0,
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
      },
    };
  },
});
