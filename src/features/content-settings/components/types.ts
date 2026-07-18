import type {
  ContentLibraryKind,
  ContentLibraryPayload,
} from "@/features/content-settings/contracts";

export type ContentItem = {
  id: string;
  kind: ContentLibraryKind;
  key: string;
  name: string;
  description: string | null;
  currentVersion: number;
  publishedVersion: number | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  hasUnpublishedChanges: boolean;
  current: {
    version: number;
    payload: ContentLibraryPayload;
    changeNote: string | null;
    sourceVersion: number | null;
    createdAt: Date;
  };
};

export type ContentFormValues = {
  name: string;
  key: string;
  description: string;
  changeNote: string;
  payload: ContentLibraryPayload;
};

export const KIND_LABELS: Record<ContentLibraryKind, string> = {
  TERMINOLOGY_PACK: "Terminology",
  FAQ_COLLECTION: "FAQs",
  MESSAGE_MACRO: "Message macros",
  PUBLIC_PROFILE: "Public profiles",
};
