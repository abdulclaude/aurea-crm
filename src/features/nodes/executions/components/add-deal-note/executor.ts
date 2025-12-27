import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { addDealNoteChannel } from "@/inngest/channels/add-deal-note";
import prisma from "@/lib/db";
import { decode } from "html-entities";

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
    const note = decode(Handlebars.compile(data.note)(context));

    const deal = await step.run("add-deal-note", async () => {
      // Verify deal exists
      const existingDeal = await prisma.deal.findUnique({
        where: { id: dealId },
      });

      if (!existingDeal) {
        throw new NonRetriableError(
          `Add Deal Note Node error: Deal with ID ${dealId} not found.`
        );
      }

      // Append note to description
      const currentDescription = existingDeal.description || "";
      const timestamp = new Date().toISOString();
      const newNote = `\n\n---\n**${timestamp}**\n${note}`;
      const updatedDescription = currentDescription + newNote;

      return await prisma.deal.update({
        where: { id: dealId },
        data: {
          description: updatedDescription,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });

    await publish(addDealNoteChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: {
              id: deal.id,
              name: deal.name,
              description: deal.description,
            },
          }
        : {}),
    };
  } catch (error) {
    await publish(addDealNoteChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
