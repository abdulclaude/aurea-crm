import { generateEmbeddings, entityToText } from "./openai";
import { storeVectors, deleteVectorsBySubaccount } from "@/lib/vector/store";
import type { VectorDocument, EntityType } from "@/lib/vector/types";
import prisma from "../db";

interface SyncResult {
  contacts: number;
  deals: number;
  pipelines: number;
  workflows: number;
  total: number;
}

/**
 * Sync all CRM entities for a subaccount to the vector store
 */
export async function syncSubaccountEmbeddings(
  subaccountId: string,
  options?: { onProgress?: (message: string) => void }
): Promise<SyncResult> {
  const log = options?.onProgress ?? console.log;

  log(`Starting embedding sync for subaccount: ${subaccountId}`);

  // Clear existing vectors for this subaccount
  const deleted = await deleteVectorsBySubaccount(subaccountId);
  log(`Deleted ${deleted} existing vectors`);

  const documents: {
    id: string;
    text: string;
    metadata: VectorDocument["metadata"];
  }[] = [];

  // Fetch contacts
  const contacts = await prisma.contact.findMany({
    where: { subaccountId },
    include: {
      contactAssignee: {
        include: {
          subaccountMember: {
            include: { user: true },
          },
        },
      },
    },
  });

  log(`Found ${contacts.length} contacts`);

  for (const contact of contacts) {
    const fields = {
      name: contact.name,
      email: contact.email,
      companyName: contact.companyName,
      phone: contact.phone,
      position: contact.position,
      type: contact.type,
      lifecycleStage: contact.lifecycleStage,
      source: contact.source,
      website: contact.website,
      linkedin: contact.linkedin,
      tags: contact.tags,
      score: contact.score,
      country: contact.country,
      city: contact.city,
      notes: contact.notes,
      assignees: contact.contactAssignee
        .map((a) => a.subaccountMember.user?.name)
        .filter(Boolean),
    };

    documents.push({
      id: `contact:${contact.id}`,
      text: entityToText("contact", fields),
      metadata: {
        entityType: "contact" as EntityType,
        entityId: contact.id,
        name: contact.name,
        subaccountId,
        fields,
        updatedAt: contact.updatedAt.toISOString(),
      },
    });
  }

  // Fetch deals
  const deals = await prisma.deal.findMany({
    where: { subaccountId },
    include: {
      pipeline: true,
      pipelineStage: true,
      dealMember: {
        include: {
          subaccountMember: {
            include: { user: true },
          },
        },
      },
      dealContact: {
        include: { contact: true },
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
      deadline: deal.deadline?.toISOString(),
      members: deal.dealMember
        .map((m) => m.subaccountMember.user?.name)
        .filter(Boolean),
      contacts: deal.dealContact.map((c) => c.contact.name),
    };

    documents.push({
      id: `deal:${deal.id}`,
      text: entityToText("deal", fields),
      metadata: {
        entityType: "deal" as EntityType,
        entityId: deal.id,
        name: deal.name,
        subaccountId,
        fields,
        updatedAt: deal.updatedAt.toISOString(),
      },
    });
  }

  // Fetch pipelines
  const pipelines = await prisma.pipeline.findMany({
    where: { subaccountId },
    include: {
      pipelineStage: {
        orderBy: { position: "asc" },
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
      stages: pipeline.pipelineStage.map((s) => ({
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
        subaccountId,
        fields,
        updatedAt: pipeline.updatedAt.toISOString(),
      },
    });
  }

  // Fetch workflows
  const workflows = await prisma.workflows.findMany({
    where: { subaccountId },
    include: {
      Node: true,
    },
  });

  log(`Found ${workflows.length} workflows`);

  for (const workflow of workflows) {
    const triggerNodes = workflow.Node.filter((n) =>
      n.type.includes("TRIGGER")
    );
    const executionNodes = workflow.Node.filter(
      (n) => !n.type.includes("TRIGGER")
    );

    const fields = {
      name: workflow.name,
      description: workflow.description,
      archived: workflow.archived,
      isTemplate: workflow.isTemplate,
      triggerTypes: triggerNodes.map((n) => n.type),
      executionTypes: executionNodes.map((n) => n.type),
      nodeCount: workflow.Node.length,
    };

    documents.push({
      id: `workflow:${workflow.id}`,
      text: entityToText("workflow", fields),
      metadata: {
        entityType: "workflow" as EntityType,
        entityId: workflow.id,
        name: workflow.name,
        subaccountId,
        fields,
        updatedAt: workflow.updatedAt.toISOString(),
      },
    });
  }

  if (documents.length === 0) {
    log("No documents to embed");
    return {
      contacts: contacts.length,
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
    contacts: contacts.length,
    deals: deals.length,
    pipelines: pipelines.length,
    workflows: workflows.length,
    total: vectorDocs.length,
  };
}

/**
 * Sync embeddings for all subaccounts
 */
export async function syncAllEmbeddings(options?: {
  onProgress?: (message: string) => void;
}): Promise<Map<string, SyncResult>> {
  const log = options?.onProgress ?? console.log;

  const subaccounts = await prisma.subaccount.findMany({
    select: { id: true, companyName: true },
  });

  log(`Found ${subaccounts.length} subaccounts to sync`);

  const results = new Map<string, SyncResult>();

  for (const subaccount of subaccounts) {
    log(`\nSyncing subaccount: ${subaccount.companyName} (${subaccount.id})`);
    const result = await syncSubaccountEmbeddings(subaccount.id, options);
    results.set(subaccount.id, result);
  }

  return results;
}
