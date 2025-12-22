import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Refresh hot scores every hour to handle time decay
crons.interval(
  "refresh hot scores",
  { hours: 1 },
  internal.projects.refreshHotScores
);

export default crons;
