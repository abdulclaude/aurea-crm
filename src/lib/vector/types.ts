export type EntityType =
  | "contact"
  | "deal"
  | "pipeline"
  | "workflow";

export interface VectorMetadata {
  entityType: EntityType;
  entityId: string;
  name: string;
  subaccountId: string;
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
