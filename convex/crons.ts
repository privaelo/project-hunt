import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Refresh hot scores every hour to handle time decay
crons.interval(
  "refresh hot scores",
  { hours: 1 },
  internal.projects.refreshHotScores
);

// Generate weekly digests every Monday at 9:00 AM UTC
crons.weekly(
  "generate weekly digests",
  { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
  internal.digests.generateWeeklyDigests
);

// Drain pending emails from the queue every 5 minutes
crons.interval(
  "drain email queue",
  { minutes: 5 },
  internal.emails.drainEmailQueue
);

export default crons;
