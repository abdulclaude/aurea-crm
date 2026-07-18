import type { PublicationKind } from "@/features/publications/contracts";

export type PublicationSource = {
  kind: PublicationKind;
  sourceKey: string;
  sourceId: string;
  name: string;
  locationId: string | null;
  publishable: boolean;
  unavailableReason: string | null;
  updatedAt: string | null;
  targetId: string | null;
};

export type PublicationSourceScope = {
  organizationId: string;
  locationId: string | null;
};
