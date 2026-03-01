import { Id } from "@/convex/_generated/dataModel";

// --- Readiness ---

export type ReadinessStatus =
  | "in_progress"
  | "just_an_idea"
  | "early_prototype"
  | "mostly_working"
  | "ready_to_use";

// --- Users ---

export type UserRef = {
  _id: Id<"users">;
  name: string;
  avatarUrl: string;
};

// --- Focus Areas ---

export type FocusArea = {
  _id: Id<"focusAreas">;
  name: string;
  group: string | undefined;
  icon: string | undefined;
};

// --- Projects ---

export type ProjectRowData = {
  _id: Id<"projects">;
  _creationTime: number;
  name: string;
  summary?: string;
  team?: string;
  upvotes: number;
  viewCount: number;
  commentCount: number;
  hasUpvoted: boolean;
  userId: Id<"users">;
  creatorName: string;
  creatorAvatar: string;
  focusArea: FocusArea | null;
  readinessStatus?: ReadinessStatus;
  previewMedia: Array<{
    _id: string;
    storageId: string;
    type: string;
    url: string | null;
  }>;
  adoptionCount: number;
  adopters: UserRef[];
  hasAdopted: boolean;
};

// --- Chat ---

export type OptimisticMessage = {
  id: string;
  role: "user";
  content: string;
  timestamp: number;
};

// --- Links ---

export type LinkItem = {
  url: string;
  label: string;
};

// --- Files ---

export type ExistingFileItem = {
  _id: Id<"projectFiles">;
  filename: string;
  fileSize: number;
};

export type NewProjectFileItem = {
  file: File;
  id: string;
};

// --- Media ---

export type ExistingMediaItem = {
  _id: Id<"mediaFiles">;
  storageId: Id<"_storage">;
  type: string;
};

export type NewFileItem = {
  file: File;
  id: string;
};
