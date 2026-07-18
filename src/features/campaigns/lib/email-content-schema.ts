import { z } from "zod";

import type { EmailContent, EmailSection } from "@/features/campaigns/types";

const emailSectionSchema: z.ZodType<EmailSection> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("header"),
      id: z.string().min(1),
      logoUrl: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      backgroundColor: z.string().optional(),
    }),
    z.object({
      type: z.literal("text"),
      id: z.string().min(1),
      content: z.string(),
      align: z.enum(["left", "center", "right"]).optional(),
    }),
    z.object({
      type: z.literal("image"),
      id: z.string().min(1),
      src: z.string(),
      alt: z.string().optional(),
      width: z.number().optional(),
      link: z.string().optional(),
    }),
    z.object({
      type: z.literal("button"),
      id: z.string().min(1),
      text: z.string(),
      url: z.string(),
      variant: z.enum(["primary", "secondary", "outline"]).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
    }),
    z.object({ type: z.literal("divider"), id: z.string().min(1) }),
    z.object({
      type: z.literal("spacer"),
      id: z.string().min(1),
      height: z.number().optional(),
    }),
    z.object({
      type: z.literal("columns"),
      id: z.string().min(1),
      columns: z.array(
        z.object({
          width: z.number().optional(),
          sections: z.array(emailSectionSchema),
        }),
      ),
    }),
  ]),
);

export const campaignEmailContentSchema: z.ZodType<EmailContent> = z.object({
  subject: z.string(),
  preheader: z.string().optional(),
  sections: z.array(emailSectionSchema),
});
