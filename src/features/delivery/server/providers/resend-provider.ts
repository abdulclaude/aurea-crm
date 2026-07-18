import "server-only";

import { Resend } from "resend";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { emailDomain } from "@/db/schema";
import { requireCommunicationEntitlement } from "@/features/communications/server/profile-service";
import type {
  DeliveryDispatchResult,
  DeliveryProviderAdapter,
} from "@/features/delivery/server/providers/provider";
import {
  EmailAttachmentResolutionError,
  resolveEmailAttachments,
} from "@/features/delivery/server/email-attachments";
import { materializeEmailContent } from "@/features/delivery/server/protected-email-content";
import { resolveProviderAccount } from "@/features/provider-accounts/server/resolver";

const resendErrorSchema = z.object({
  message: z.string(),
  name: z.string().optional(),
});

const RETRYABLE_RESEND_ERRORS = new Set([
  "rate_limit_exceeded",
  "application_error",
  "internal_server_error",
]);

export const resendProviderAdapter: DeliveryProviderAdapter = {
  provider: "RESEND",
  channels: ["EMAIL"],
  async send(request, signal): Promise<DeliveryDispatchResult> {
    if (request.payload.channel !== "EMAIL") {
      return {
        kind: "terminal",
        code: "INVALID_PAYLOAD",
        message: "Resend requires an email payload",
      };
    }
    let payload: ReturnType<typeof materializeEmailContent>;
    try {
      payload = materializeEmailContent(request.payload);
    } catch {
      return {
        kind: "terminal",
        code: "PROTECTED_CONTENT_INVALID",
        message: "Protected email content could not be decrypted",
      };
    }
    if (request.sender.kind !== "EMAIL_DOMAIN") {
      return {
        kind: "terminal",
        code: "INVALID_SENDER",
        message: "Resend requires an email-domain sender reference",
      };
    }
    const fromEmail = request.sender.fromEmail;
    if (!request.providerAccountId || !fromEmail) {
      return {
        kind: "terminal",
        code: "RESEND_NOT_CONFIGURED",
        message: "A scoped Resend account and sender address are required",
      };
    }

    if (signal.aborted) {
      return {
        kind: "retryable",
        code: "DISPATCH_CANCELLED",
        message: "Delivery dispatch was cancelled before the provider request",
      };
    }

    let attachments:
      | Awaited<ReturnType<typeof resolveEmailAttachments>>
      | undefined;
    try {
      attachments = payload.attachments?.length
        ? await resolveEmailAttachments({
            organizationId: request.organizationId,
            locationId: request.locationId,
            attachments: payload.attachments,
          })
        : undefined;
    } catch (error) {
      if (error instanceof EmailAttachmentResolutionError) {
        return {
          kind: error.failureClass,
          code: error.code,
          message: error.message,
        };
      }
      return {
        kind: "retryable",
        code: "ATTACHMENT_RESOLUTION_FAILED",
        message: "Email attachments could not be prepared",
      };
    }

    if (signal.aborted) {
      return {
        kind: "retryable",
        code: "DISPATCH_CANCELLED",
        message: "Delivery dispatch was cancelled before the provider request",
      };
    }

    let apiKey: string;
    try {
      const account = await resolveProviderAccount({
        providerAccountId: request.providerAccountId,
        provider: "RESEND",
        scope: {
          organizationId: request.organizationId,
          locationId: request.locationId,
        },
      });
      const [domain] = await db
        .select()
        .from(emailDomain)
        .where(
          and(
            eq(emailDomain.id, request.sender.id),
            eq(emailDomain.organizationId, request.organizationId),
          ),
        )
        .limit(1);
      if (domain) {
        if (
          domain.providerAccountId !== account.id ||
          domain.status !== "VERIFIED" ||
          domain.lifecycleState !== "ACTIVE" ||
          domain.isDisabled ||
          domain.verificationStaleAt ||
          domain.removedAt ||
          !fromEmail.toLowerCase().endsWith(`@${domain.domain.toLowerCase()}`)
        ) {
          return {
            kind: "terminal",
            code: "EMAIL_DOMAIN_NO_LONGER_SENDABLE",
            message:
              "The selected sender domain is no longer active for this workspace",
          };
        }
        await requireCommunicationEntitlement({
          organizationId: request.organizationId,
          channel: "EMAIL",
        });
      } else if (
        account.ownershipMode !== "PLATFORM_MANAGED" ||
        (request.purpose !== "TRANSACTIONAL" && request.purpose !== "SYSTEM")
      ) {
        return {
          kind: "terminal",
          code: "MANAGED_FALLBACK_NOT_ALLOWED",
          message:
            "Managed fallback email is limited to transactional and system delivery",
        };
      }
      apiKey = account.secret;
    } catch (error) {
      return {
        kind: "terminal",
        code: "RESEND_ACCOUNT_SCOPE_INVALID",
        message:
          error instanceof Error
            ? error.message
            : "The Resend account is not available in this workspace",
      };
    }

    const from = request.sender.fromName
      ? `${request.sender.fromName} <${fromEmail}>`
      : fromEmail;
    if (!payload.html && !payload.text) {
      return {
        kind: "terminal",
        code: "INVALID_PAYLOAD",
        message: "Resend requires HTML or text email content",
      };
    }
    if (request.purpose === "MARKETING" && !payload.unsubscribeUrl) {
      return {
        kind: "terminal",
        code: "MARKETING_UNSUBSCRIBE_MISSING",
        message: "Marketing email requires a one-click unsubscribe URL",
      };
    }

    const commonEmailOptions = {
      from,
      to: [request.destination],
      subject: payload.subject,
      cc: payload.cc,
      bcc: payload.bcc,
      replyTo: payload.replyTo ?? request.sender.replyTo,
      attachments,
      headers: payload.unsubscribeUrl
        ? {
            "List-Unsubscribe": `<${payload.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : undefined,
    };
    try {
      const resend = new Resend(apiKey);
      const response = payload.html
        ? await resend.emails.send(
            { ...commonEmailOptions, html: payload.html },
            { idempotencyKey: request.idempotencyKey },
          )
        : payload.text
          ? await resend.emails.send(
              { ...commonEmailOptions, text: payload.text },
              { idempotencyKey: request.idempotencyKey },
            )
          : null;
      if (!response) {
        return {
          kind: "terminal",
          code: "INVALID_PAYLOAD",
          message: "Resend requires HTML or text email content",
        };
      }

      if (response.error) {
        const parsedError = resendErrorSchema.safeParse(response.error);
        const code = parsedError.success
          ? (parsedError.data.name ?? "RESEND_REJECTED")
          : "RESEND_REJECTED";
        const message = parsedError.success
          ? parsedError.data.message
          : "Resend rejected the delivery request";

        return RETRYABLE_RESEND_ERRORS.has(code)
          ? { kind: "retryable", code, message }
          : { kind: "terminal", code, message };
      }

      if (!response.data?.id) {
        return {
          kind: "ambiguous",
          code: "MISSING_PROVIDER_MESSAGE_ID",
          message: "Resend accepted the request without returning a message ID",
        };
      }

      return {
        kind: "accepted",
        providerMessageId: response.data.id,
        acceptedAt: new Date(),
      };
    } catch (error) {
      return {
        kind: "ambiguous",
        code: "RESEND_REQUEST_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Resend request failed with an unknown error",
      };
    }
  },
};
