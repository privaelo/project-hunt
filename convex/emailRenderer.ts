import type { Id } from "./_generated/dataModel";

type OwnProjectActivity = {
  projectId: Id<"projects">;
  projectName: string;
  newUpvotes: number;
  newComments: number;
  newAdoptions: number;
  newViews: number;
};

type SpaceActivity = {
  focusAreaId: Id<"focusAreas">;
  focusAreaName: string;
  focusAreaIcon?: string;
  topProjects: {
    projectId: Id<"projects">;
    projectName: string;
    upvotes: number;
    creatorName: string;
  }[];
  newThreads: {
    threadId: Id<"threads">;
    threadTitle: string;
    creatorName: string;
  }[];
};

type PlatformHighlights = {
  topProjects: {
    projectId: Id<"projects">;
    projectName: string;
    upvotes: number;
    creatorName: string;
    spaceName: string | null;
    spaceIcon: string | null;
  }[];
  topThreads: {
    threadId: Id<"threads">;
    threadTitle: string;
    upvoteCount: number;
    commentCount: number;
    creatorName: string;
    spaceName: string | null;
    spaceIcon: string | null;
  }[];
};

export type SpaceActivityPayload = {
  focusAreaName: string;
  focusAreaIcon?: string;
  contentType: "project" | "thread";
  contentId: string;
  contentTitle: string;
  creatorName: string;
};

export type WeeklyDigestPayload = {
  ownProjectActivity: OwnProjectActivity[];
  ownProjectTotals: {
    totalNewUpvotes: number;
    totalNewComments: number;
    totalNewAdoptions: number;
    totalNewViews: number;
  };
  followedSpaceActivity: SpaceActivity[];
  platformHighlights: PlatformHighlights;
  periodStart: number;
  periodEnd: number;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateRange(periodStart: number, periodEnd: number): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${formatter.format(periodStart)} - ${formatter.format(periodEnd)}`;
}

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getTotalInteractions(payload: WeeklyDigestPayload): number {
  const totals = payload.ownProjectTotals;
  return (
    totals.totalNewUpvotes +
    totals.totalNewComments +
    totals.totalNewAdoptions +
    totals.totalNewViews
  );
}

function getSubject(payload: WeeklyDigestPayload): string {
  const totalInteractions = getTotalInteractions(payload);
  if (totalInteractions > 0) {
    return `Your Garden weekly digest: ${formatCount(totalInteractions, "new interaction")}`;
  }

  if (payload.followedSpaceActivity.length > 0) {
    return `Your Garden weekly digest: ${formatCount(payload.followedSpaceActivity.length, "space")} with new activity`;
  }

  return "Your Garden weekly digest: trending this week";
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBaseUrl}${path}`;
}

function renderOwnProjectSummary(payload: WeeklyDigestPayload): string {
  const totals = payload.ownProjectTotals;
  const summaryParts = [
    formatCount(totals.totalNewUpvotes, "upvote"),
    formatCount(totals.totalNewComments, "comment"),
    formatCount(totals.totalNewAdoptions, "adoption"),
    formatCount(totals.totalNewViews, "view"),
  ];
  return summaryParts.join(" | ");
}

function renderOwnProjectRows(payload: WeeklyDigestPayload, baseUrl: string): string {
  return payload.ownProjectActivity
    .map((project) => {
      const projectUrl = joinUrl(baseUrl, `/project/${project.projectId}`);
      return `
        <tr>
          <td style="padding: 0 0 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border: 1px solid #d4d4d8; border-radius: 12px;">
              <tr>
                <td style="padding: 16px 18px;">
                  <div style="font-size: 16px; font-weight: 600; color: #18181b; margin: 0 0 8px;">
                    ${escapeHtml(project.projectName)}
                  </div>
                  <div style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 12px;">
                    ${formatCount(project.newUpvotes, "upvote")} | ${formatCount(project.newComments, "comment")} | ${formatCount(project.newAdoptions, "adoption")} | ${formatCount(project.newViews, "view")}
                  </div>
                  <a href="${escapeHtml(projectUrl)}" style="color: #166534; font-size: 14px; font-weight: 600; text-decoration: none;">View project</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderFollowedSpaces(payload: WeeklyDigestPayload, baseUrl: string): string {
  return payload.followedSpaceActivity
    .map((space) => {
      const spaceUrl = joinUrl(baseUrl, `/space/${space.focusAreaId}`);
      const projectsHtml = space.topProjects
        .map((project) => {
          const projectUrl = joinUrl(baseUrl, `/project/${project.projectId}`);
          return `
            <li style="margin: 0 0 8px;">
              <a href="${escapeHtml(projectUrl)}" style="color: #166534; text-decoration: none; font-weight: 600;">${escapeHtml(project.projectName)}</a>
              <span style="color: #71717a;"> by ${escapeHtml(project.creatorName)} (${formatCount(project.upvotes, "upvote")})</span>
            </li>
          `;
        })
        .join("");

      const threadsHtml = space.newThreads
        .map((thread) => {
          const threadUrl = joinUrl(baseUrl, `/thread/${thread.threadId}`);
          return `
            <li style="margin: 0 0 8px;">
              <a href="${escapeHtml(threadUrl)}" style="color: #166534; text-decoration: none; font-weight: 600;">${escapeHtml(thread.threadTitle)}</a>
              <span style="color: #71717a;"> by ${escapeHtml(thread.creatorName)}</span>
            </li>
          `;
        })
        .join("");

      return `
        <tr>
          <td style="padding: 0 0 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border: 1px solid #d4d4d8; border-radius: 12px;">
              <tr>
                <td style="padding: 16px 18px;">
                  <div style="margin: 0 0 12px;">
                    <a href="${escapeHtml(spaceUrl)}" style="font-size: 16px; font-weight: 600; color: #18181b; text-decoration: none;">
                      ${escapeHtml(space.focusAreaIcon ? `${space.focusAreaIcon} ${space.focusAreaName}` : space.focusAreaName)}
                    </a>
                  </div>
                  ${
                    projectsHtml
                      ? `
                        <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #71717a; margin: 0 0 8px;">
                          Top projects
                        </div>
                        <ul style="padding-left: 18px; margin: 0 0 14px;">
                          ${projectsHtml}
                        </ul>
                      `
                      : ""
                  }
                  ${
                    threadsHtml
                      ? `
                        <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #71717a; margin: 0 0 8px;">
                          New threads
                        </div>
                        <ul style="padding-left: 18px; margin: 0;">
                          ${threadsHtml}
                        </ul>
                      `
                      : ""
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderPlatformHighlights(payload: WeeklyDigestPayload, baseUrl: string): string {
  const projectItems = payload.platformHighlights.topProjects
    .map((project) => {
      const projectUrl = joinUrl(baseUrl, `/project/${project.projectId}`);
      const location = project.spaceName
        ? ` - ${project.spaceIcon ? `${project.spaceIcon} ` : ""}${project.spaceName}`
        : "";
      return `
        <li style="margin: 0 0 8px;">
          <a href="${escapeHtml(projectUrl)}" style="color: #166534; text-decoration: none; font-weight: 600;">${escapeHtml(project.projectName)}</a>
          <span style="color: #71717a;"> by ${escapeHtml(project.creatorName)} (${formatCount(project.upvotes, "upvote")})${escapeHtml(location)}</span>
        </li>
      `;
    })
    .join("");

  const threadItems = payload.platformHighlights.topThreads
    .map((thread) => {
      const threadUrl = joinUrl(baseUrl, `/thread/${thread.threadId}`);
      const location = thread.spaceName
        ? ` - ${thread.spaceIcon ? `${thread.spaceIcon} ` : ""}${thread.spaceName}`
        : "";
      return `
        <li style="margin: 0 0 8px;">
          <a href="${escapeHtml(threadUrl)}" style="color: #166534; text-decoration: none; font-weight: 600;">${escapeHtml(thread.threadTitle)}</a>
          <span style="color: #71717a;"> by ${escapeHtml(thread.creatorName)} (${formatCount(thread.upvoteCount, "upvote")}, ${formatCount(thread.commentCount, "comment")})${escapeHtml(location)}</span>
        </li>
      `;
    })
    .join("");

  return `
    ${
      projectItems
        ? `
          <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #71717a; margin: 0 0 8px;">
            Top projects
          </div>
          <ul style="padding-left: 18px; margin: 0 0 14px;">
            ${projectItems}
          </ul>
        `
        : ""
    }
    ${
      threadItems
        ? `
          <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #71717a; margin: 0 0 8px;">
            Top threads
          </div>
          <ul style="padding-left: 18px; margin: 0;">
            ${threadItems}
          </ul>
        `
        : ""
    }
  `;
}

function renderTextVersion(
  recipientName: string,
  payload: WeeklyDigestPayload,
  baseUrl: string,
  profileUrl: string
): string {
  const sections: string[] = [];
  const dateRange = formatDateRange(payload.periodStart, payload.periodEnd);

  sections.push(`Garden weekly digest (${dateRange})`);
  sections.push(`Hi ${recipientName},`);
  sections.push(`Here's what happened in Garden this week.`);

  if (payload.ownProjectActivity.length > 0) {
    sections.push("");
    sections.push("Your projects this week");
    sections.push(renderOwnProjectSummary(payload));

    for (const project of payload.ownProjectActivity) {
      sections.push(
        `- ${project.projectName}: ${formatCount(project.newUpvotes, "upvote")}, ${formatCount(project.newComments, "comment")}, ${formatCount(project.newAdoptions, "adoption")}, ${formatCount(project.newViews, "view")}`
      );
      sections.push(`  ${joinUrl(baseUrl, `/project/${project.projectId}`)}`);
    }
  }

  if (payload.followedSpaceActivity.length > 0) {
    sections.push("");
    sections.push("From spaces you follow");

    for (const space of payload.followedSpaceActivity) {
      sections.push(`- ${space.focusAreaIcon ? `${space.focusAreaIcon} ` : ""}${space.focusAreaName}`);
      if (space.topProjects.length > 0) {
        sections.push("  Top projects:");
        for (const project of space.topProjects) {
          sections.push(
            `  - ${project.projectName} by ${project.creatorName} (${formatCount(project.upvotes, "upvote")})`
          );
          sections.push(`    ${joinUrl(baseUrl, `/project/${project.projectId}`)}`);
        }
      }
      if (space.newThreads.length > 0) {
        sections.push("  New threads:");
        for (const thread of space.newThreads) {
          sections.push(`  - ${thread.threadTitle} by ${thread.creatorName}`);
          sections.push(`    ${joinUrl(baseUrl, `/thread/${thread.threadId}`)}`);
        }
      }
    }
  }

  const hasHighlights =
    payload.platformHighlights.topProjects.length > 0 ||
    payload.platformHighlights.topThreads.length > 0;

  if (hasHighlights) {
    sections.push("");
    sections.push("Trending across Garden");

    if (payload.platformHighlights.topProjects.length > 0) {
      sections.push("Top projects:");
      for (const project of payload.platformHighlights.topProjects) {
        const location = project.spaceName
          ? ` - ${project.spaceIcon ? `${project.spaceIcon} ` : ""}${project.spaceName}`
          : "";
        sections.push(
          `- ${project.projectName} by ${project.creatorName} (${formatCount(project.upvotes, "upvote")})${location}`
        );
        sections.push(`  ${joinUrl(baseUrl, `/project/${project.projectId}`)}`);
      }
    }

    if (payload.platformHighlights.topThreads.length > 0) {
      sections.push("Top threads:");
      for (const thread of payload.platformHighlights.topThreads) {
        const location = thread.spaceName
          ? ` - ${thread.spaceIcon ? `${thread.spaceIcon} ` : ""}${thread.spaceName}`
          : "";
        sections.push(
          `- ${thread.threadTitle} by ${thread.creatorName} (${formatCount(thread.upvoteCount, "upvote")}, ${formatCount(thread.commentCount, "comment")})${location}`
        );
        sections.push(`  ${joinUrl(baseUrl, `/thread/${thread.threadId}`)}`);
      }
    }
  }

  sections.push("");
  sections.push(`Open Garden: ${joinUrl(baseUrl, "/")}`);
  sections.push("You're receiving this weekly digest from Garden. This is an automated email.");
  sections.push(`Manage your email preferences: ${profileUrl}`);

  return sections.join("\n");
}

export function renderWeeklyDigestEmail(args: {
  recipientName: string;
  payload: WeeklyDigestPayload;
  baseUrl: string;
  profileUrl: string;
}): RenderedEmail {
  const { recipientName, payload, baseUrl, profileUrl } = args;
  const dateRange = formatDateRange(payload.periodStart, payload.periodEnd);
  const subject = getSubject(payload);
  const preheader =
    "Project activity, spaces you follow, and what is trending across Garden.";
  const homeUrl = joinUrl(baseUrl, "/");
  const introSummary = renderOwnProjectSummary(payload);

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; color: #18181b; font-family: Arial, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${escapeHtml(preheader)}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; background-color: #f4f4f5;">
          <tr>
            <td align="center" style="padding: 24px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 640px; border-collapse: collapse; background-color: #ffffff; border-radius: 18px;">
                <tr>
                  <td style="padding: 28px 28px 24px; border-bottom: 1px solid #e4e4e7;">
                    <div style="font-size: 28px; font-weight: 700; color: #166534; margin: 0 0 8px;">Garden</div>
                    <div style="font-size: 14px; color: #71717a; margin: 0 0 12px;">Your week in Garden: ${escapeHtml(dateRange)}</div>
                    <div style="font-size: 24px; font-weight: 700; line-height: 1.3; color: #18181b; margin: 0 0 10px;">Hi ${escapeHtml(recipientName)},</div>
                    <div style="font-size: 15px; line-height: 1.6; color: #3f3f46; margin: 0 0 16px;">
                      Here's a quick summary of what happened in Garden this week.
                    </div>
                    ${
                      getTotalInteractions(payload) > 0
                        ? `
                          <div style="font-size: 14px; line-height: 1.6; color: #52525b; background-color: #f9fafb; border: 1px solid #e4e4e7; border-radius: 12px; padding: 14px 16px;">
                            ${escapeHtml(introSummary)}
                          </div>
                        `
                        : ""
                    }
                  </td>
                </tr>
                ${
                  payload.ownProjectActivity.length > 0
                    ? `
                      <tr>
                        <td style="padding: 24px 28px 8px;">
                          <div style="font-size: 20px; font-weight: 700; color: #18181b; margin: 0 0 8px;">Your projects this week</div>
                          <div style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 16px;">${escapeHtml(introSummary)}</div>
                          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse;">
                            ${renderOwnProjectRows(payload, baseUrl)}
                          </table>
                        </td>
                      </tr>
                    `
                    : ""
                }
                ${
                  payload.followedSpaceActivity.length > 0
                    ? `
                      <tr>
                        <td style="padding: 16px 28px 8px;">
                          <div style="font-size: 20px; font-weight: 700; color: #18181b; margin: 0 0 16px;">From spaces you follow</div>
                          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse;">
                            ${renderFollowedSpaces(payload, baseUrl)}
                          </table>
                        </td>
                      </tr>
                    `
                    : ""
                }
                ${
                  payload.platformHighlights.topProjects.length > 0 ||
                  payload.platformHighlights.topThreads.length > 0
                    ? `
                      <tr>
                        <td style="padding: 16px 28px 28px;">
                          <div style="font-size: 20px; font-weight: 700; color: #18181b; margin: 0 0 16px;">Trending across Garden</div>
                          <div style="font-size: 14px; line-height: 1.6; color: #52525b; border: 1px solid #d4d4d8; border-radius: 12px; padding: 16px 18px;">
                            ${renderPlatformHighlights(payload, baseUrl)}
                          </div>
                        </td>
                      </tr>
                    `
                    : ""
                }
                <tr>
                  <td style="padding: 0 28px 28px;">
                    <a href="${escapeHtml(homeUrl)}" style="display: inline-block; background-color: #166534; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 18px; border-radius: 999px;">Open Garden</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 28px 28px; font-size: 12px; line-height: 1.6; color: #71717a;">
                    This is an automated email from Garden.
                    <a href="${escapeHtml(profileUrl)}" style="color: #71717a;">Manage your email preferences</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();

  const text = renderTextVersion(recipientName, payload, baseUrl, profileUrl);

  return {
    subject,
    html,
    text,
  };
}

// ─── Space Activity Email ────────────────────────────────────────────────────

export function renderSpaceActivityEmail(args: {
  recipientName: string;
  payload: SpaceActivityPayload;
  baseUrl: string;
  profileUrl: string;
}): RenderedEmail {
  const { recipientName, payload, baseUrl, profileUrl } = args;
  const contentLabel = payload.contentType === "project" ? "project" : "thread";
  const spaceName = payload.focusAreaIcon
    ? `${payload.focusAreaIcon} ${payload.focusAreaName}`
    : payload.focusAreaName;

  const truncatedTitle =
    payload.contentTitle.length > 60
      ? `${payload.contentTitle.slice(0, 57)}...`
      : payload.contentTitle;

  const subject = `New ${contentLabel} in g/${payload.focusAreaName}: "${truncatedTitle}"`;

  const contentPath =
    payload.contentType === "project"
      ? `/project/${payload.contentId}`
      : `/thread/${payload.contentId}`;
  const contentUrl = joinUrl(baseUrl, contentPath);
  const preheader = `${escapeHtml(payload.creatorName)} posted a new ${contentLabel} in ${payload.focusAreaName}`;

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; color: #18181b; font-family: Arial, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${preheader}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; background-color: #f4f4f5;">
          <tr>
            <td align="center" style="padding: 24px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 640px; border-collapse: collapse; background-color: #ffffff; border-radius: 18px;">
                <tr>
                  <td style="padding: 28px 28px 24px; border-bottom: 1px solid #e4e4e7;">
                    <div style="font-size: 28px; font-weight: 700; color: #166534; margin: 0 0 16px;">Garden</div>
                    <div style="font-size: 14px; color: #71717a; margin: 0 0 6px;">New ${escapeHtml(contentLabel)} in</div>
                    <div style="font-size: 20px; font-weight: 700; color: #18181b; margin: 0 0 16px;">
                      g/${escapeHtml(spaceName)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border: 1px solid #d4d4d8; border-radius: 12px;">
                      <tr>
                        <td style="padding: 18px;">
                          <div style="font-size: 18px; font-weight: 600; color: #18181b; margin: 0 0 8px;">
                            <a href="${escapeHtml(contentUrl)}" style="color: #18181b; text-decoration: none;">${escapeHtml(payload.contentTitle)}</a>
                          </div>
                          <div style="font-size: 14px; color: #71717a; margin: 0 0 16px;">
                            Posted by ${escapeHtml(payload.creatorName)}
                          </div>
                          <a href="${escapeHtml(contentUrl)}" style="display: inline-block; background-color: #166534; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 10px 18px; border-radius: 999px;">View ${escapeHtml(contentLabel)}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 28px 28px; font-size: 12px; line-height: 1.6; color: #71717a;">
                    You're receiving this because you follow g/${escapeHtml(payload.focusAreaName)}. This is an automated email.
                    <a href="${escapeHtml(profileUrl)}" style="color: #71717a;">Manage your email preferences</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();

  const text = [
    `Garden — New ${contentLabel} in g/${payload.focusAreaName}`,
    "",
    `Hi ${recipientName},`,
    "",
    `"${payload.contentTitle}" by ${payload.creatorName}`,
    "",
    `View it here: ${contentUrl}`,
    "",
    `You're receiving this because you follow g/${payload.focusAreaName}. This is an automated email.`,
    `Manage your email preferences: ${profileUrl}`,
  ].join("\n");

  return { subject, html, text };
}
