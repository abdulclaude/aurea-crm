import { z } from "zod";

import { ConversationChannel } from "@/db/enums";

const EMAIL_SUBJECT_MAX_LENGTH = 998;

export const createInboxConversationInputSchema = z
  .object({
    clientId: z.string().optional(),
    channel: z.nativeEnum(ConversationChannel),
    subject: z.string().trim().max(EMAIL_SUBJECT_MAX_LENGTH).optional(),
    senderAddressId: z.string().min(1).optional(),
    initialMessage: z.string().trim().min(1).max(4000),
  })
  .superRefine((input, context) => {
    if (input.channel !== ConversationChannel.EMAIL) return;
    if (!input.subject) {
      context.addIssue({
        code: "custom",
        path: ["subject"],
        message: "Enter a subject before sending an email.",
      });
    }
    if (!input.senderAddressId) {
      context.addIssue({
        code: "custom",
        path: ["senderAddressId"],
        message: "Select a sender address before sending an email.",
      });
    }
  });

export const sendInboxMessageInputSchema = z.object({
  conversationId: z.string(),
  content: z.string().trim().min(1).max(4000),
  senderAddressId: z.string().min(1).optional(),
});
