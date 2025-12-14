import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { findContactsChannel } from "@/inngest/channels/find-contacts";
import prisma from "@/lib/db";
import { decode } from "html-entities";
import { ContactType, LifecycleStage } from "@prisma/client";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type FindContactsData = {
  variableName?: string;
  email?: string;
  name?: string;
  companyName?: string;
  type?: ContactType;
  lifecycleStage?: LifecycleStage;
  limit?: number;
};

export const findContactsExecutor: NodeExecutor<FindContactsData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(findContactsChannel().status({ nodeId, status: "loading" }));

  try {
    // Get workflow context
    const workflow = await step.run("get-workflow-context", async () => {
      const node = await prisma.node.findUnique({
        where: { id: nodeId },
        include: {
          Workflows: {
            select: {
              subaccountId: true,
              organizationId: true,
            },
          },
        },
      });

      if (!node?.Workflows?.organizationId) {
        throw new NonRetriableError(
          "Find Contacts: This workflow must be in an organization context."
        );
      }

      return node.Workflows;
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

    // Build where clause
    const where: any = {
      organizationId: workflow.organizationId,
      subaccountId: workflow.subaccountId || null,
    };

    if (email) {
      where.email = { contains: email, mode: "insensitive" };
    }
    if (name) {
      where.name = { contains: name, mode: "insensitive" };
    }
    if (companyName) {
      where.companyName = { contains: companyName, mode: "insensitive" };
    }
    if (data.type) {
      where.type = data.type;
    }
    if (data.lifecycleStage) {
      where.lifecycleStage = data.lifecycleStage;
    }

    // Find contacts
    const contacts = await step.run("find-contacts", async () => {
      return await prisma.contact.findMany({
        where,
        take: data.limit || 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          position: true,
          type: true,
          lifecycleStage: true,
          score: true,
          tags: true,
          website: true,
          linkedin: true,
          country: true,
          city: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    await publish(findContactsChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: contacts.map((c) => ({
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
    await publish(findContactsChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
