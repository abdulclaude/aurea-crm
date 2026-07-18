import { z } from "zod";

export const resendReceivingEmailSchema = z.object({
  id: z.string().min(1),
  to: z.array(z.string().min(1)).min(1),
  from: z.string().min(1),
  created_at: z.string().datetime({ offset: true }),
  subject: z.string().default(""),
  html: z.string().nullable(),
  text: z.string().nullable(),
  headers: z.record(z.string(), z.string()).default({}),
  message_id: z.string().min(1),
  attachments: z
    .array(
      z.object({
        id: z.string().min(1),
        filename: z.string(),
        size: z.number().int().nonnegative(),
        content_type: z.string(),
      }),
    )
    .default([]),
});

export type ResendReceivingEmail = z.infer<typeof resendReceivingEmailSchema>;

function headerValue(
  headers: Readonly<Record<string, string>>,
  name: string,
): string {
  return (
    Object.entries(headers).find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    )?.[1] ?? ""
  ).toLowerCase();
}

export function hasTrustworthySenderAuthentication(
  headers: Readonly<Record<string, string>>,
): boolean {
  const authenticationResults = headerValue(headers, "authentication-results");
  const receivedSpf = headerValue(headers, "received-spf");
  const dmarcPassed = /(?:^|[;\s])dmarc=pass(?:[;\s]|$)/.test(
    authenticationResults,
  );
  const dkimPassed = /(?:^|[;\s])dkim=pass(?:[;\s]|$)/.test(
    authenticationResults,
  );
  const spfPassed =
    /(?:^|[;\s])spf=pass(?:[;\s]|$)/.test(authenticationResults) ||
    /^pass(?:\s|$)/.test(receivedSpf);
  return dmarcPassed || (dkimPassed && spfPassed);
}
