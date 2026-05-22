import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { updateClientChannel } from "@/inngest/channels/update-client";
import { decode } from "html-entities";
import type { AcquisitionStage, ClientType, LifecycleStage } from "@/db/enums";
import { and, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { client as clientTable, node as nodeTable, note as noteTable } from "@/db/schema";

type UpdateClientData = {
  variableName?: string;
  clientId: string;
  name?: string;
  email?: string;
  companyName?: string;
  phone?: string;
  position?: string;
  type?: ClientType;
  lifecycleStage?: LifecycleStage;
  acquisitionStage?: AcquisitionStage;
  source?: string;
  website?: string;
  linkedin?: string;
  country?: string;
  city?: string;
  tags?: string;
  birthMonth?: string;
  birthDay?: string;
  notes?: string;
};

export const updateClientExecutor: NodeExecutor<UpdateClientData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(updateClientChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.variableName) {
      await publish(updateClientChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Update Client Node error: No variable name has been set."
      );
    }

    if (!data.clientId) {
      await publish(updateClientChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Update Client Node error: Client ID is required."
      );
    }

    const workflow = await step.run("get-workflow-context", async () => {
      const node = await db.query.node.findFirst({
        where: eq(nodeTable.id, nodeId),
        with: {
          workflow: {
            columns: {
              locationId: true,
              organizationId: true,
            },
          },
        },
      });

      const organizationId = node?.workflow?.organizationId;

      if (!organizationId) {
        throw new NonRetriableError(
          "Update Client Node error: This workflow must be in an organization context."
        );
      }

      return {
        organizationId,
        locationId: node.workflow.locationId,
      };
    });

    const clientId = decode(Handlebars.compile(data.clientId)(context));

    const updateData: Partial<typeof clientTable.$inferInsert> = {};

    if (data.name) {
      updateData.name = decode(Handlebars.compile(data.name)(context));
    }
    if (data.email !== undefined) {
      updateData.email = data.email
        ? decode(Handlebars.compile(data.email)(context))
        : null;
    }
    if (data.companyName !== undefined) {
      updateData.companyName = data.companyName
        ? decode(Handlebars.compile(data.companyName)(context))
        : null;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone
        ? decode(Handlebars.compile(data.phone)(context))
        : null;
    }
    if (data.position !== undefined) {
      updateData.position = data.position
        ? decode(Handlebars.compile(data.position)(context))
        : null;
    }
    if (data.type) {
      updateData.type = data.type;
    }
    if (data.lifecycleStage !== undefined) {
      updateData.lifecycleStage = data.lifecycleStage || null;
    }
    if (data.acquisitionStage !== undefined) {
      updateData.acquisitionStage = data.acquisitionStage;

      if (data.acquisitionStage === "TRIAL") {
        updateData.trialStartedAt = new Date();
      }

      if (data.acquisitionStage === "ACTIVE") {
        updateData.acquiredAt = new Date();
      }
    }
    if (data.source !== undefined) {
      updateData.source = data.source
        ? decode(Handlebars.compile(data.source)(context))
        : null;
    }
    if (data.website !== undefined) {
      updateData.website = data.website
        ? decode(Handlebars.compile(data.website)(context))
        : null;
    }
    if (data.linkedin !== undefined) {
      updateData.linkedin = data.linkedin
        ? decode(Handlebars.compile(data.linkedin)(context))
        : null;
    }
    if (data.country !== undefined) {
      updateData.country = data.country
        ? decode(Handlebars.compile(data.country)(context))
        : null;
    }
    if (data.city !== undefined) {
      updateData.city = data.city
        ? decode(Handlebars.compile(data.city)(context))
        : null;
    }
    if (data.tags !== undefined) {
      updateData.tags = data.tags
        ? splitTags(decode(Handlebars.compile(data.tags)(context)))
        : [];
    }
    if (data.birthMonth !== undefined) {
      updateData.birthMonth = data.birthMonth
        ? parseRangedInt(decode(Handlebars.compile(data.birthMonth)(context)), 1, 12)
        : null;
    }
    if (data.birthDay !== undefined) {
      updateData.birthDay = data.birthDay
        ? parseRangedInt(decode(Handlebars.compile(data.birthDay)(context)), 1, 31)
        : null;
    }
    const noteContent = data.notes
      ? decode(Handlebars.compile(data.notes)(context)).trim()
      : "";

    const client = await step.run("update-client", async () => {
      return db.transaction(async (tx) => {
        const [updatedClient] = await tx
          .update(clientTable)
          .set({ ...updateData, updatedAt: new Date() })
          .where(
            and(
              eq(clientTable.id, clientId),
              eq(clientTable.organizationId, workflow.organizationId),
              ...(workflow.locationId ? [eq(clientTable.locationId, workflow.locationId)] : [])
            )
          )
          .returning();

        if (!updatedClient) {
          throw new NonRetriableError(
            `Update Client Node error: Client with ID ${clientId} not found.`
          );
        }

        if (noteContent) {
          await tx.insert(noteTable).values({
              id: createId(),
              organizationId: workflow.organizationId,
              locationId: workflow.locationId || null,
              clientId: updatedClient.id,
              authorId: userId ?? null,
              content: noteContent,
              pinned: false,
              createdAt: new Date(),
              updatedAt: new Date(),
          });
        }

        return updatedClient;
      });
    });

    await publish(updateClientChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: {
        id: client.id,
        name: client.name,
        email: client.email,
        companyName: client.companyName,
        phone: client.phone,
        type: client.type,
        lifecycleStage: client.lifecycleStage,
        acquisitionStage: client.acquisitionStage,
        tags: client.tags,
        birthMonth: client.birthMonth,
        birthDay: client.birthDay,
        attendanceCount: client.attendanceCount,
        currentStreak: client.currentStreak,
        updatedAt:
          typeof client.updatedAt === "string"
            ? client.updatedAt
            : (client.updatedAt as Date).toISOString(),
      },
    };
  } catch (error) {
    await publish(updateClientChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function splitTags(value: string): string[] {
  return value
    .split(/[,\n;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseRangedInt(
  value: string,
  minimum: number,
  maximum: number
): number | null {
  const parsed = Number.parseInt(value.trim(), 10);

  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }

  return parsed;
}
