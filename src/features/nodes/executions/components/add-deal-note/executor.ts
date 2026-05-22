import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { addDealNoteChannel } from "@/inngest/channels/add-deal-note";
import { decode } from "html-entities";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { deal as dealTable, note as noteTable } from "@/db/schema";

type AddDealNoteData = {
  dealId: string;
  note: string;
  variableName?: string;
};

export const addDealNoteExecutor: NodeExecutor<AddDealNoteData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(addDealNoteChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.dealId) {
      await publish(addDealNoteChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Add Deal Note Node error: Deal ID is required."
      );
    }

    if (!data.note) {
      await publish(addDealNoteChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Add Deal Note Node error: Note is required."
      );
    }

    // Compile fields with Handlebars
    const dealId = decode(Handlebars.compile(data.dealId)(context));
    const note = decode(Handlebars.compile(data.note)(context)).trim();

    if (!note) {
      await publish(addDealNoteChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Add Deal Note Node error: Note content is empty."
      );
    }

    const deal = await step.run("add-deal-note", async () => {
      const existingDeal = await db.query.deal.findFirst({
        where: eq(dealTable.id, dealId),
        columns: { id: true, name: true, organizationId: true, locationId: true },
      });

      if (!existingDeal) {
        throw new NonRetriableError(
          `Add Deal Note Node error: Deal with ID ${dealId} not found.`
        );
      }

      await db.insert(noteTable).values({
          id: createId(),
          organizationId: existingDeal.organizationId,
          locationId: existingDeal.locationId,
          dealId: existingDeal.id,
          authorId: userId ?? null,
          content: note,
          pinned: false,
          createdAt: new Date(),
          updatedAt: new Date(),
      });

      const [updatedDeal] = await db
        .update(dealTable)
        .set({
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dealTable.id, dealId))
        .returning();

      return updatedDeal;
    });

    await publish(addDealNoteChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: {
              id: deal.id,
              name: deal.name,
            },
          }
        : {}),
    };
  } catch (error) {
    await publish(addDealNoteChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
