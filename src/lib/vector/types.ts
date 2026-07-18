export type EntityType =
  | "client"
  | "deal"
  | "pipeline"
  | "workflow";

export interface VectorMetadata {
  entityType: EntityType;
  entityId: string;
  name: string;
  organizationId: string;
  locationId: string;
  fields: Record<string, unknown>;
  updatedAt: string;
}

export interface VectorDocument {
  id: string;
  embedding: number[];
  metadata: VectorMetadata;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}
