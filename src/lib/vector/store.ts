import { redis } from "@/lib/redis/client";
import { cosineSimilarity } from "./similarity";
import type { VectorDocument, VectorMetadata, SearchResult } from "./types";

const VECTOR_PREFIX = "vector:";
const VECTOR_INDEX_KEY = "vector:index";
const VECTOR_RETENTION_SECONDS = 30 * 24 * 60 * 60;

/**
 * Store a vector document in Redis
 */
export async function storeVector(doc: VectorDocument): Promise<void> {
  const key = `${VECTOR_PREFIX}${doc.id}`;

  await redis.set(
    key,
    JSON.stringify({
      embedding: doc.embedding,
      metadata: doc.metadata,
    }),
    { ex: VECTOR_RETENTION_SECONDS },
  );

  // Add to index for retrieval
  await redis.sadd(VECTOR_INDEX_KEY, doc.id);
}

/**
 * Store multiple vector documents in batch
 */
export async function storeVectors(docs: VectorDocument[]): Promise<void> {
  const pipeline = redis.pipeline();

  for (const doc of docs) {
    const key = `${VECTOR_PREFIX}${doc.id}`;
    pipeline.set(
      key,
      JSON.stringify({
        embedding: doc.embedding,
        metadata: doc.metadata,
      }),
      { ex: VECTOR_RETENTION_SECONDS },
    );
    pipeline.sadd(VECTOR_INDEX_KEY, doc.id);
  }

  await pipeline.exec();
}

/**
 * Get a vector document by ID
 */
export async function getVector(id: string): Promise<VectorDocument | null> {
  const key = `${VECTOR_PREFIX}${id}`;
  const data = await redis.get<string>(key);

  if (!data) {
    return null;
  }

  const parsed = typeof data === "string" ? JSON.parse(data) : data;
  return {
    id,
    embedding: parsed.embedding,
    metadata: parsed.metadata,
  };
}

/**
 * Delete a vector document
 */
export async function deleteVector(id: string): Promise<void> {
  const key = `${VECTOR_PREFIX}${id}`;
  await redis.del(key);
  await redis.srem(VECTOR_INDEX_KEY, id);
}

/**
 * Delete all vectors for a location
 */
export async function deleteVectorsByLocation(locationId: string): Promise<number> {
  const allIds = await redis.smembers(VECTOR_INDEX_KEY);
  let deleted = 0;

  for (const id of allIds) {
    const doc = await getVector(id);
    if (doc?.metadata.locationId === locationId) {
      await deleteVector(id);
      deleted++;
    }
  }

  return deleted;
}

/**
 * Replace one tenant location's vector set without deleting the last good set
 * before all new documents have been stored successfully.
 */
export async function replaceVectorsForLocation(input: {
  organizationId: string;
  locationId: string;
  documents: VectorDocument[];
}): Promise<{ removed: number; stored: number }> {
  const allIds = await redis.smembers(VECTOR_INDEX_KEY);
  const existingIds: string[] = [];
  for (const id of allIds) {
    const document = await getVector(id);
    if (
      document?.metadata.locationId === input.locationId &&
      (!document.metadata.organizationId ||
        document.metadata.organizationId === input.organizationId)
    ) {
      existingIds.push(id);
    }
  }

  if (input.documents.length > 0) {
    await storeVectors(input.documents);
  }

  const replacementIds = new Set(input.documents.map((document) => document.id));
  const staleIds = existingIds.filter((id) => !replacementIds.has(id));
  if (staleIds.length > 0) {
    const pipeline = redis.pipeline();
    for (const id of staleIds) {
      pipeline.del(`${VECTOR_PREFIX}${id}`);
      pipeline.srem(VECTOR_INDEX_KEY, id);
    }
    await pipeline.exec();
  }

  return { removed: staleIds.length, stored: input.documents.length };
}

/**
 * Search vectors by similarity
 */
export async function searchVectors(
  queryEmbedding: number[],
  options: {
    locationId: string;
    topK?: number;
    threshold?: number;
    entityTypes?: string[];
  }
): Promise<SearchResult[]> {
  const { locationId, topK = 10, threshold = 0.5, entityTypes } = options;

  // Get all vector IDs
  const allIds = await redis.smembers(VECTOR_INDEX_KEY);

  if (allIds.length === 0) {
    return [];
  }

  // Fetch all vectors and compute similarities
  const results: SearchResult[] = [];

  for (const id of allIds) {
    const doc = await getVector(id);

    if (!doc) continue;

    // Filter by location
    if (doc.metadata.locationId !== locationId) continue;

    // Filter by entity type if specified
    if (entityTypes && !entityTypes.includes(doc.metadata.entityType)) continue;

    const score = cosineSimilarity(queryEmbedding, doc.embedding);

    if (score >= threshold) {
      results.push({
        id: doc.id,
        score,
        metadata: doc.metadata,
      });
    }
  }

  // Sort by score descending and take top K
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, topK);
}

/**
 * Get all vectors for a location
 */
export async function getVectorsByLocation(locationId: string): Promise<VectorDocument[]> {
  const allIds = await redis.smembers(VECTOR_INDEX_KEY);
  const vectors: VectorDocument[] = [];

  for (const id of allIds) {
    const doc = await getVector(id);
    if (doc?.metadata.locationId === locationId) {
      vectors.push(doc);
    }
  }

  return vectors;
}

/**
 * Get vector count for a location
 */
export async function getVectorCount(locationId: string): Promise<number> {
  const allIds = await redis.smembers(VECTOR_INDEX_KEY);
  let count = 0;

  for (const id of allIds) {
    const doc = await getVector(id);
    if (doc?.metadata.locationId === locationId) {
      count++;
    }
  }

  return count;
}
