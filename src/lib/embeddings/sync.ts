import { generateEmbeddings, entityToText } from "./openai";
import { storeVectors, deleteVectorsByLocation } from "@/lib/vector/store";
import type { VectorDocument, EntityType } from "@/lib/vector/types";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { client as clientTable, deal as dealTable, location as locationTable, pipeline as pipelineTable, pipelineStage, workflows as workflowTable } from "@/db/schema";

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
  options?: { onProgress?: (message: string) => void }
): Promise<SyncResult> {
  const log = options?.onProgress ?? console.log;

  log(`Starting embedding sync for location: ${locationId}`);

  // Clear existing vectors for this location
  const deleted = await deleteVectorsByLocation(locationId);
  log(`Deleted ${deleted} existing vectors`);

  const documents: {
    id: string;
    text: string;
    metadata: VectorDocument["metadata"];
  }[] = [];

  // Fetch clients
  const clients = await db.query.client.findMany({
    where: eq(clientTable.locationId, locationId),
    with: {
      clientAssignees: {
        with: {
          locationMember: {
            with: { user: true },
          },
        },
      },
      notes: {
        columns: {
          content: true,
        },
      },
    },
  });

  log(`Found ${clients.length} clients`);

  for (const client of clients) {
    const fields = {
      name: client.name,
      email: client.email,
      companyName: client.companyName,
      phone: client.phone,
      position: client.position,
      type: client.type,
      lifecycleStage: client.lifecycleStage,
      source: client.source,
      website: client.website,
      linkedin: client.linkedin,
      tags: client.tags,
      score: client.score,
      country: client.country,
      city: client.city,
      notes: client.notes.map((note) => note.content),
      assignees: client.clientAssignees
        .map((a) => a.locationMember.user?.name)
        .filter(Boolean),
    };

    documents.push({
      id: `client:${client.id}`,
      text: entityToText("client", fields),
      metadata: {
        entityType: "client" as EntityType,
        entityId: client.id,
        name: client.name,
        locationId,
        fields,
        updatedAt: client.updatedAt.toISOString(),
      },
    });
  }

  // Fetch deals
  const deals = await db.query.deal.findMany({
    where: eq(dealTable.locationId, locationId),
    with: {
      pipeline: true,
      pipelineStage: true,
      dealAssignees: {
        with: {
          locationMember: {
            with: { user: true },
          },
        },
      },
      dealClients: {
        with: { client: true },
      },
      notes: {
        columns: {
          content: true,
        },
      },
    },
  });

  log(`Found ${deals.length} deals`);

  for (const deal of deals) {
    const fields = {
      name: deal.name,
      value: deal.value?.toString(),
      currency: deal.currency,
      pipeline: deal.pipeline?.name,
      stage: deal.pipelineStage?.name,
      source: deal.source,
      tags: deal.tags,
      description: deal.description,
      notes: deal.notes.map((note) => note.content),
      deadline: deal.deadline?.toISOString(),
      members: deal.dealAssignees
        .map((m) => m.locationMember.user?.name)
        .filter(Boolean),
      clients: deal.dealClients.map((c) => c.client.name),
    };

    documents.push({
      id: `deal:${deal.id}`,
      text: entityToText("deal", fields),
      metadata: {
        entityType: "deal" as EntityType,
        entityId: deal.id,
        name: deal.name,
        locationId,
        fields,
        updatedAt: deal.updatedAt.toISOString(),
      },
    });
  }

  // Fetch pipelines
  const pipelines = await db.query.pipeline.findMany({
    where: eq(pipelineTable.locationId, locationId),
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
      id: `pipeline:${pipeline.id}`,
      text: entityToText("pipeline", fields),
      metadata: {
        entityType: "pipeline" as EntityType,
        entityId: pipeline.id,
        name: pipeline.name,
        locationId,
        fields,
        updatedAt: pipeline.updatedAt.toISOString(),
      },
    });
  }

  // Fetch workflows
  const workflows = await db.query.workflows.findMany({
    where: eq(workflowTable.locationId, locationId),
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
      id: `workflow:${workflow.id}`,
      text: entityToText("workflow", fields),
      metadata: {
        entityType: "workflow" as EntityType,
        entityId: workflow.id,
        name: workflow.name,
        locationId,
        fields,
        updatedAt: workflow.updatedAt.toISOString(),
      },
    });
  }

  if (documents.length === 0) {
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

    const embeddings = await generateEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      vectorDocs.push({
        id: batch[j].id,
        embedding: embeddings[j],
        metadata: batch[j].metadata,
      });
    }
  }

  // Store all vectors
  log(`Storing ${vectorDocs.length} vectors`);
  await storeVectors(vectorDocs);

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
