import { z } from "zod";

export const sendEmailFormSchema = z
  .object({
    clientId: z.string().optional(),
    to: z.string().optional(),
    subject: z.string().min(1, "Subject is required."),
    html: z.string().min(1, "Email body is required."),
    text: z.string().optional(),
    emailDomainId: z.string().optional(),
    fromName: z.string().optional(),
    replyTo: z.union([z.literal(""), z.string().email()]).optional(),
    purpose: z.enum(["MARKETING", "TRANSACTIONAL"]),
    variableName: z
      .string()
      .min(1, "Variable name is required.")
      .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
        message: "Use letters, numbers, underscores, or dollar signs.",
      }),
  })
  .refine((data) => Boolean(data.clientId?.trim() || data.to?.trim()), {
    path: ["to"],
    message: "Recipient email or client ID is required.",
  });

export type SendEmailFormValues = z.infer<typeof sendEmailFormSchema>;
