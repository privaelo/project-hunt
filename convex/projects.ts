/**
 * Projects API facade — re-exports from convex/projects/* for stable api.projects.* and internal.projects.*
 */
export { calculateHotScore } from "./projects/helpers";

export {
  generateUploadUrl,
  getMediaUrl,
  addFileToProject,
  deleteFileFromProject,
  getProjectFiles,
  addMediaToProject,
  deleteMediaFromProject,
  getProjectMedia,
  reorderProjectMedia,
} from "./projects/media";

export {
  getCurrentUserInternal,
  getProject,
  getProjectsByEntryIds,
  populateProjectDetails,
  createProject,
  updateEntryId,
  deleteProject,
  updateProjectFields,
  confirmProject,
  create,
  updateProject,
  cancelProject,
  backfillProject,
  backfillEngagementScores,
} from "./projects/lifecycle";

export {
  list,
  listPaginated,
  listPaginatedBySpace,
  getUserProjects,
  getByUserId,
  getAdoptedByUser,
  getNewestProjects,
  getTopProjectsBySpace,
  getById,
  getProjectsByEntryIdsPublic,
} from "./projects/listing";

export {
  trackView,
  toggleUpvote,
  toggleAdoption,
  hasUserUpvoted,
  getUpvoteCount,
  getAdopters,
  refreshHotScores,
} from "./projects/engagement";

export {
  fullTextSearchProjects,
  searchProjects,
  getSimilarProjects,
  searchSimilarProjectsByText,
} from "./projects/search";

export {
  syncProjectSpaceMemberships,
  deleteProjectMemberships,
  propagateHotScoreToMemberships,
  listPaginatedBySpaceMembership,
} from "./projects/spaces";

export {
  backfillProjectSpacesAction,
  backfillProjectSpaces,
  migrateClearFocusAreasAction,
  migrateClearFocusAreas,
  migrateReadinessStatusAction,
  migrateReadinessStatus,
} from "./projects/migrations";

export {
  listByProject as listVersionsByProject,
  getVersionById,
  getVersionFiles,
  createVersion,
  updateVersion,
  deleteVersion,
  addFileToVersion,
  deleteFileFromVersion,
} from "./projects/versions";
