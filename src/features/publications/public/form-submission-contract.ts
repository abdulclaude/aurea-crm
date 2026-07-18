import { z } from "zod";

export const MAX_PUBLIC_FORM_BODY_BYTES = 64 * 1_024;
export const MAX_PUBLIC_FORM_FIELDS = 250;

const publicFormSubmissionValueSchema = z.union([
  z.string().max(10_000),
  z.boolean(),
  z.array(z.string().max(200)).max(100),
]);

export const publicFormSubmissionBodySchema = z
  .object({
    token: z.string().min(1).max(2_048),
    versionId: z.string().min(1).max(128),
    values: z.record(z.string().min(1).max(128), publicFormSubmissionValueSchema),
    responseConsent: z.literal(true),
    website: z.string().max(300).default(""),
  })
  .strict()
  .refine(
    (body) => Object.keys(body.values).length <= MAX_PUBLIC_FORM_FIELDS,
    "The form contains too many fields.",
  );

export const publicFormIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);

export type PublicFormSubmissionBody = z.infer<
  typeof publicFormSubmissionBodySchema
>;

export function requestIsSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
