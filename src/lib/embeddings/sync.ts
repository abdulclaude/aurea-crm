import { generateEmbeddings, entityToText } from "./openai";
import { replaceVectorsForLocation } from "@/lib/vector/store";
import type { VectorDocument, EntityType } from "@/lib/vector/types";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { CredentialType } from "@/db/enums";
import { client as clientTable, deal as dealTable, location as locationTable, pipeline as pipelineTable, pipelineStage, workflows as workflowTable } from "@/db/schema";
import { resolveScopedAiCredential } from "@/features/ai/server/scoped-credential";

interface SyncResult {
  clients: number;
  deals: number;
  pipelines: number;
  workflows: number;
  total: number;
}

/**
 * Sync all CRM entities for a location to the vector store
 */
export async function syncLocationEmbeddings(
  locationId: string,
  options?: {
    credentialId?: string;
    onProgress?: (message: string) => void;
  },
): Promise<SyncResult> {
  const log = options?.onProgress ?? console.log;

  log(`Starting embedding sync for location: ${locationId}`);

  const [targetLocation] = await db
    .select({
      id: locationTable.id,
      organizationId: locationTable.organizationId,
    })
    .from(locationTable)
    .where(eq(locationTable.id, locationId))
    .limit(1);
  if (!targetLocation) {
    throw new Error("Cannot sync embeddings for an unknown location.");
  }

  const scopedCredential = await resolveScopedAiCredential({
    organizationId: targetLocation.organizationId,
    locationId: targetLocation.id,
    type: CredentialType.OPENAI,
    credentialId: options?.credentialId,
  });

  const documents: {
    id: string;
    text: string;
    metadata: VectorDocument["metadata"];
  }[] = [];

  // Fetch clients
  const clients = await db.query.client.findMany({
    where: and(
      eq(clientTable.organizationId, targetLocation.organizationId),
      eq(clientTable.locationId, locationId),
    ),
    columns: {
      id: true,
      name: true,
      companyName: true,
      position: true,
      type: true,
      lifecycleStage: true,
      source: true,
      tags: true,
      score: true,
      country: true,
      city: true,
      updatedAt: true,
    },
  });

  log(`Found ${clients.length} clients`);

  for (const client of clients) {
    const fields = {
      name: client.name,
      companyName: client.companyName,
      position: client.position,
      type: client.type,
      lifecycleStage: client.lifecycleStage,
      source: client.source,
      tags: client.tags,
      score: client.score,
      country: client.country,
      city: client.city,
    };

    documents.push({
      id: `${targetLocation.organizationId}:${locationId}:client:${client.id}`,
      text: entityToText("client", fields),
      metadata: {
        entityType: "client" as EntityType,
        entityId: client.id,
        name: client.name,
        organizationId: targetLocation.organizationId,
        locationId,
        fields,
        updatedAt: client.updatedAt.toISOString(),
      },
    });
  }

  // Fetch deals
  const deals = await db.query.deal.findMany({
    where: and(
      eq(dealTable.organizationId, targetLocation.organizationId),
      eq(dealTable.locationId, locationId),
    ),
    columns: {
      id: true,
      name: true,
      value: true,
      currency: true,
      pipelineId: true,
      pipelineStageId: true,
      source: true,
      tags: true,
      description: true,
      deadline: true,
      updatedAt: true,
    },
  });

  log(`Found ${deals.length} deals`);

  for (const deal of deals) {
    const fields = {
      name: deal.name,
      value: deal.value?.toString(),
      currency: deal.currency,
      pipelineId: deal.pipelineId,
      pipelineStageId: deal.pipelineStageId,
      source: deal.source,
      tags: deal.tags,
      description: deal.description,
      deadline: deal.deadline?.toISOString(),
    };

    documents.push({
      id: `${targetLocation.organizationId}:${locationId}:deal:${deal.id}`,
      text: entityToText("deal", fields),
      metadata: {
        entityType: "deal" as EntityType,
        entityId: deal.id,
        name: deal.name,
        organizationId: targetLocation.organizationId,
        locationId,
        fields,
        updatedAt: deal.updatedAt.toISOString(),
      },
    });
  }

  // Fetch pipelines
  const pipelines = await db.query.pipeline.findMany({
    where: and(
      eq(pipelineTable.organizationId, targetLocation.organizationId),
      eq(pipelineTable.locationId, locationId),
    ),
    with: {
      pipelineStages: {
        orderBy: asc(pipelineStage.position),
      },
    },
  });

  log(`Found ${pipelines.length} pipelines`);

  for (const pipeline of pipelines) {
    const fields = {
      name: pipeline.name,
      description: pipeline.description,
      isActive: pipeline.isActive,
      isDefault: pipeline.isDefault,
      stages: pipeline.pipelineStages.map((s) => ({
        name: s.name,
        probability: s.probability,
        rottingDays: s.rottingDays,
      })),
    };

    documents.push({
      id: `${targetLocation.organizationId}:${locationId}:pipeline:${pipeline.id}`,
      text: entityToText("pipeline", fields),
      metadata: {
        entityType: "pipeline" as EntityType,
        entityId: pipeline.id,
        name: pipeline.name,
        organizationId: targetLocation.organizationId,
        locationId,
        fields,
        updatedAt: pipeline.updatedAt.toISOString(),
      },
    });
  }

  // Fetch workflows
  const workflows = await db.query.workflows.findMany({
    where: and(
      eq(workflowTable.organizationId, targetLocation.organizationId),
      eq(workflowTable.locationId, locationId),
    ),
    with: {
      nodes: true,
    },
  });

  log(`Found ${workflows.length} workflows`);

  for (const workflow of workflows) {
    const triggerNodes = workflow.nodes.filter((n) =>
      n.type.includes("TRIGGER")
    );
    const executionNodes = workflow.nodes.filter(
      (n) => !n.type.includes("TRIGGER")
    );

    const fields = {
      name: workflow.name,
      description: workflow.description,
      archived: workflow.archived,
      isTemplate: workflow.isTemplate,
      triggerTypes: triggerNodes.map((n) => n.type),
      executionTypes: executionNodes.map((n) => n.type),
      nodeCount: workflow.nodes.length,
    };

    documents.push({
      id: `${targetLocation.organizationId}:${locationId}:workflow:${workflow.id}`,
      text: entityToText("workflow", fields),
      metadata: {
        entityType: "workflow" as EntityType,
        entityId: workflow.id,
        name: workflow.name,
        organizationId: targetLocation.organizationId,
        locationId,
        fields,
        updatedAt: workflow.updatedAt.toISOString(),
      },
    });
  }

  if (documents.length === 0) {
    const replacement = await replaceVectorsForLocation({
      organizationId: targetLocation.organizationId,
      locationId,
      documents: [],
    });
    log(`Removed ${replacement.removed} stale vectors`);
    log("No documents to embed");
    return {
      clients: clients.length,
      deals: deals.length,
      pipelines: pipelines.length,
      workflows: workflows.length,
      total: 0,
    };
  }

  // Generate embeddings in batches
  const BATCH_SIZE = 100;
  const vectorDocs: VectorDocument[] = [];

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const texts = batch.map((d) => d.text);

    log(
      `Generating embeddings for batch ${
        Math.floor(i / BATCH_SIZE) + 1
      }/${Math.ceil(documents.length / BATCH_SIZE)}`
    );

    const embeddings = await generateEmbeddings(
      texts,
      scopedCredential.apiKey,
    );

    for (let j = 0; j < batch.length; j++) {
      vectorDocs.push({
        id: batch[j].id,
        embedding: embeddings[j],
        metadata: batch[j].metadata,
      });
    }
  }

  const replacement = await replaceVectorsForLocation({
    organizationId: targetLocation.organizationId,
    locationId,
    documents: vectorDocs,
  });
  log(
    `Stored ${replacement.stored} vectors and removed ${replacement.removed} stale vectors`,
  );

  log("Embedding sync complete");

  return {
    clients: clients.length,
    deals: deals.length,
    pipelines: pipelines.length,
    workflows: workflows.length,
    total: vectorDocs.length,
  };
}

/**
 * Sync embeddings for all locations
 */
export async function syncAllEmbeddings(options?: {
  onProgress?: (message: string) => void;
}): Promise<Map<string, SyncResult>> {
  const log = options?.onProgress ?? console.log;

  const locations = await db.query.location.findMany({
    columns: { id: true, companyName: true },
  });

  log(`Found ${locations.length} locations to sync`);

  const results = new Map<string, SyncResult>();

  for (const location of locations) {
    log(`\nSyncing location: ${location.companyName} (${location.id})`);
    const result = await syncLocationEmbeddings(location.id, options);
    results.set(location.id, result);
  }

  return results;
}
