import { z } from "zod";

export const EMAIL_FONT_OPTIONS = [
  "Arial",
  "Georgia",
  "Helvetica Neue",
  "Lato",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
] as const;

const emailAddressSchema = z.string().trim().toLowerCase().email();
const optionalUrlSchema = z.string().trim().url().nullable();
const colorSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/);

export const emailSocialLinksSchema = z.object({
  instagram: optionalUrlSchema.default(null),
  facebook: optionalUrlSchema.default(null),
  x: optionalUrlSchema.default(null),
  pinterest: optionalUrlSchema.default(null),
  youtube: optionalUrlSchema.default(null),
  linkedin: optionalUrlSchema.default(null),
});

export const emailDesignSettingsSchema = z
  .object({
    logoMode: z.enum(["WORKSPACE", "CUSTOM", "NONE"]),
    customLogoUrl: optionalUrlSchema,
    colorMode: z.enum(["WORKSPACE", "CUSTOM"]),
    headerTextColor: colorSchema,
    bodyTextColor: colorSchema,
    buttonColor: colorSchema,
    backgroundColor: colorSchema,
    primaryFont: z.enum(EMAIL_FONT_OPTIONS),
    secondaryFont: z.enum(EMAIL_FONT_OPTIONS),
    socialLinks: emailSocialLinksSchema,
  })
  .superRefine((value, ctx) => {
    if (value.logoMode === "CUSTOM" && !value.customLogoUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["customLogoUrl"],
        message: "Upload a custom email logo before saving.",
      });
    }
  });

export const createEmailSenderAddressSchema = z.object({
  emailDomainId: z.string().min(1),
  email: emailAddressSchema,
  displayName: z.string().trim().min(1).max(120),
  replyTo: emailAddressSchema.nullable().default(null),
  isDefault: z.boolean().default(false),
});

export const updateEmailSenderAddressSchema =
  createEmailSenderAddressSchema.extend({
    id: z.string().min(1),
    isDisabled: z.boolean(),
  });

export const emailTestSendSchema = z
  .object({
    senderAddressId: z.string().min(1),
    scenario: z.enum([
      "DELIVERED",
      "BOUNCED",
      "COMPLAINED",
      "SUPPRESSED",
      "CUSTOM",
    ]),
    recipient: emailAddressSchema.nullable().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.scenario === "CUSTOM" && !value.recipient) {
      ctx.addIssue({
        code: "custom",
        path: ["recipient"],
        message: "Enter the recipient for this test.",
      });
    }
  });

export type EmailDesignSettings = z.infer<typeof emailDesignSettingsSchema>;
export type EmailSocialLinks = z.infer<typeof emailSocialLinksSchema>;

export type ResolvedEmailDesign = {
  logoUrl?: string;
  headerTextColor: string;
  bodyTextColor: string;
  buttonColor: string;
  backgroundColor: string;
  headingFontFamily: string;
  bodyFontFamily: string;
  companyName: string;
  companyAddress?: string;
  website?: string;
  socialLinks: Partial<
    Record<
      "instagram" | "facebook" | "twitter" | "pinterest" | "youtube" | "linkedin",
      string
    >
  >;
};
