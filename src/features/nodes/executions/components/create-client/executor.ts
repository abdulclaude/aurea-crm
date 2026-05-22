import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { createClientChannel } from "@/inngest/channels/create-client";
import { decode } from "html-entities";
import type { AcquisitionStage, ClientType, LifecycleStage } from "@/db/enums";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { client as clientTable, node as nodeTable, note as noteTable } from "@/db/schema";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type CreateClientData = {
  variableName?: string;
  name: string;
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

export const createClientExecutor: NodeExecutor<CreateClientData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(createClientChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.name) {
      await publish(createClientChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Create Client Node error: Name is required."
      );
    }

    // Get organization/location from workflow
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
          "Create Client Node error: This workflow must be in an organization context to create clients."
        );
      }

      return {
        organizationId,
        locationId: node.workflow.locationId,
      };
    });

    // Compile all fields with Handlebars
    const name = decode(Handlebars.compile(data.name)(context));

    const email = data.email
      ? decode(Handlebars.compile(data.email)(context))
      : undefined;
    const companyName = data.companyName
      ? decode(Handlebars.compile(data.companyName)(context))
      : undefined;
    const phone = data.phone
      ? decode(Handlebars.compile(data.phone)(context))
      : undefined;
    const position = data.position
      ? decode(Handlebars.compile(data.position)(context))
      : undefined;
    const source = data.source
      ? decode(Handlebars.compile(data.source)(context))
      : undefined;
    const website = data.website
      ? decode(Handlebars.compile(data.website)(context))
      : undefined;
    const linkedin = data.linkedin
      ? decode(Handlebars.compile(data.linkedin)(context))
      : undefined;
    const country = data.country
      ? decode(Handlebars.compile(data.country)(context))
      : undefined;
    const city = data.city
      ? decode(Handlebars.compile(data.city)(context))
      : undefined;
    const tags = data.tags
      ? splitTags(decode(Handlebars.compile(data.tags)(context)))
      : [];
    const birthMonth = data.birthMonth
      ? parseRangedInt(decode(Handlebars.compile(data.birthMonth)(context)), 1, 12)
      : undefined;
    const birthDay = data.birthDay
      ? parseRangedInt(decode(Handlebars.compile(data.birthDay)(context)), 1, 31)
      : undefined;
    const notes = data.notes
      ? decode(Handlebars.compile(data.notes)(context))
      : undefined;

    const client = await step.run("create-client", async () => {
      return db.transaction(async (tx) => {
        const [createdClient] = await tx
          .insert(clientTable)
          .values({
            id: createId(),
            locationId: workflow.locationId || null,
            organizationId: workflow.organizationId,
            name,
            email: email || null,
            companyName: companyName || null,
            phone: phone || null,
            position: position || null,
            type: data.type || "LEAD",
            lifecycleStage: data.lifecycleStage || null,
            acquisitionStage: data.acquisitionStage || "INQUIRY",
            ...(data.acquisitionStage === "TRIAL" && {
              trialStartedAt: new Date(),
            }),
            ...(data.acquisitionStage === "ACTIVE" && {
              acquiredAt: new Date(),
            }),
            source: source || null,
            website: website || null,
            linkedin: linkedin || null,
            country: country || null,
            city: city || null,
            score: 0,
            tags,
            birthMonth,
            birthDay,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        if (notes?.trim()) {
          await tx.insert(noteTable).values({
              id: createId(),
              organizationId: workflow.organizationId,
              locationId: workflow.locationId || null,
              clientId: createdClient.id,
              authorId: userId ?? null,
              content: notes.trim(),
              pinned: false,
              createdAt: new Date(),
              updatedAt: new Date(),
          });
        }

        return createdClient;
      });
    });

    await publish(createClientChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: {
              id: client.id,
              name: client.name,
              email: client.email,
              companyName: client.companyName,
              phone: client.phone,
              position: client.position,
              type: client.type,
              lifecycleStage: client.lifecycleStage,
              acquisitionStage: client.acquisitionStage,
              source: client.source,
              website: client.website,
              linkedin: client.linkedin,
              country: client.country,
              city: client.city,
              tags: client.tags,
              birthMonth: client.birthMonth,
              birthDay: client.birthDay,
              attendanceCount: client.attendanceCount,
              currentStreak: client.currentStreak,
              createdAt:
                typeof client.createdAt === "string"
                  ? client.createdAt
                  : (client.createdAt as Date).toISOString(),
            },
          }
        : {}),
    };
  } catch (error) {
    await publish(createClientChannel().status({ nodeId, status: "error" }));
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
): number | undefined {
  const parsed = Number.parseInt(value.trim(), 10);

  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return undefined;
  }

  return parsed;
}
