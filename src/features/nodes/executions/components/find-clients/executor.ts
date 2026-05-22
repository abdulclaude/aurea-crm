import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import {
  and,
  arrayOverlaps,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { client, introOffer, introOfferRedemption, node as nodeTable } from "@/db/schema";
import type { NodeExecutor } from "@/features/executions/types";
import { findClientsChannel } from "@/inngest/channels/find-clients";
import { decode } from "html-entities";
import type { AcquisitionStage, ClientType, IntroOfferRedemptionStatus, LifecycleStage } from "@/db/enums";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type FindClientsData = {
  variableName?: string;
  email?: string;
  name?: string;
  companyName?: string;
  type?: ClientType;
  lifecycleStage?: LifecycleStage;
  acquisitionStage?: AcquisitionStage;
  tags?: string;
  minAttendanceCount?: number;
  maxAttendanceCount?: number;
  introOfferStatus?: IntroOfferRedemptionStatus;
  introOfferCompleted?: boolean;
  limit?: number;
};

export const findClientsExecutor: NodeExecutor<FindClientsData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(findClientsChannel().status({ nodeId, status: "loading" }));

  try {
    // Get workflow context
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
          "Find Clients: This workflow must be in an organization context."
        );
      }

      return {
        organizationId,
        locationId: node.workflow.locationId,
      };
    });

    // Compile search parameters
    const email = data.email
      ? decode(Handlebars.compile(data.email)(context))
      : undefined;
    const name = data.name
      ? decode(Handlebars.compile(data.name)(context))
      : undefined;
    const companyName = data.companyName
      ? decode(Handlebars.compile(data.companyName)(context))
      : undefined;
    const tags = data.tags
      ? splitTags(decode(Handlebars.compile(data.tags)(context)))
      : [];

    const where: SQL[] = [
      eq(client.organizationId, workflow.organizationId),
      workflow.locationId
        ? eq(client.locationId, workflow.locationId)
        : isNull(client.locationId),
    ];

    if (email) {
      where.push(ilike(client.email, `%${email}%`));
    }
    if (name) {
      where.push(ilike(client.name, `%${name}%`));
    }
    if (companyName) {
      where.push(ilike(client.companyName, `%${companyName}%`));
    }
    if (data.type) {
      where.push(eq(client.type, data.type));
    }
    if (data.lifecycleStage) {
      where.push(eq(client.lifecycleStage, data.lifecycleStage));
    }
    if (data.acquisitionStage) {
      where.push(eq(client.acquisitionStage, data.acquisitionStage));
    }
    if (tags.length > 0) {
      where.push(arrayOverlaps(client.tags, tags));
    }
    if (data.minAttendanceCount !== undefined) {
      where.push(gte(client.attendanceCount, data.minAttendanceCount));
    }
    if (data.maxAttendanceCount !== undefined) {
      where.push(lte(client.attendanceCount, data.maxAttendanceCount));
    }

    if (
      data.introOfferStatus !== undefined ||
      data.introOfferCompleted !== undefined
    ) {
      const clientIds = await step.run("find-intro-offer-client-ids", async () => {
        const redemptionWhere = [
          eq(introOffer.organizationId, workflow.organizationId),
          workflow.locationId
            ? eq(introOffer.locationId, workflow.locationId)
            : isNull(introOffer.locationId),
          ...(data.introOfferStatus
            ? [eq(introOfferRedemption.status, data.introOfferStatus)]
            : []),
        ];

        const redemptions = await db
          .select({
            clientId: introOfferRedemption.clientId,
            classesUsed: introOfferRedemption.classesUsed,
            classCredits: introOffer.classCredits,
          })
          .from(introOfferRedemption)
          .innerJoin(introOffer, eq(introOffer.id, introOfferRedemption.offerId))
          .where(and(...redemptionWhere));

        return redemptions
          .filter((redemption) => {
            if (data.introOfferCompleted === undefined) {
              return true;
            }

            const classCredits = redemption.classCredits;
            const completed =
              classCredits !== null &&
              classCredits !== undefined &&
              redemption.classesUsed >= classCredits;

            return completed === data.introOfferCompleted;
          })
          .map((redemption) => redemption.clientId);
      });

      if (clientIds.length === 0) {
        await publish(findClientsChannel().status({ nodeId, status: "success" }));
        return {
          ...context,
          ...(data.variableName ? { [data.variableName]: [] } : {}),
        };
      }

      where.push(inArray(client.id, clientIds));
    }

    // Find clients
    const clients = await step.run("find-clients", async () => {
      return await db
        .select({
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          companyName: client.companyName,
          position: client.position,
          type: client.type,
          lifecycleStage: client.lifecycleStage,
          score: client.score,
          tags: client.tags,
          birthMonth: client.birthMonth,
          birthDay: client.birthDay,
          acquisitionStage: client.acquisitionStage,
          acquiredAt: client.acquiredAt,
          trialStartedAt: client.trialStartedAt,
          attendanceCount: client.attendanceCount,
          currentStreak: client.currentStreak,
          website: client.website,
          linkedin: client.linkedin,
          country: client.country,
          city: client.city,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
        })
        .from(client)
        .where(and(...where))
        .orderBy(desc(client.createdAt))
        .limit(data.limit || 10);
    });

    await publish(findClientsChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: clients.map((c) => ({
              ...c,
              createdAt:
                typeof c.createdAt === "string"
                  ? c.createdAt
                  : (c.createdAt as Date).toISOString(),
              updatedAt:
                typeof c.updatedAt === "string"
                  ? c.updatedAt
                  : (c.updatedAt as Date).toISOString(),
            })),
          }
        : {}),
    };
  } catch (error) {
    await publish(findClientsChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function splitTags(value: string): string[] {
  return value
    .split(/[,\n;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}
