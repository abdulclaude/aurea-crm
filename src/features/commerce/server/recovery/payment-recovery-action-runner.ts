import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  booking,
  calComCredential,
  client,
  invoice,
  locationMember,
  member,
  outboundDelivery,
  paymentRecoveryAction,
  paymentRecoveryAttempt,
  paymentRecoveryCase,
  studioBooking,
  studioClass,
  studioMembership,
  studioPayment,
  task,
} from "@/db/schema";
import { enqueueSmsMessages } from "@/features/sms/server/services/enqueue-sms";
import { triggerStudioPaymentWorkflows } from "@/features/studio/server/payment-workflow-triggers";
import { CalComApiError, getCalComClient } from "@/lib/calcom";
import { sendEmail } from "@/lib/email";

import { issuePaymentRecoveryLink } from "./payment-recovery-link-service";

const ACTION_BATCH_SIZE = 25;
const ACTION_LEASE_MS = 5 * 60 * 1000;

type ClaimedAction = { id: string; claimToken: string };

export async function claimDuePaymentRecoveryActions(
  now = new Date(),
): Promise<ClaimedAction[]> {
  const claimToken = createId();
  const leaseExpiresAt = new Date(now.getTime() + ACTION_LEASE_MS);
  return db.transaction(async (tx) => {
    const dueWhere = and(
      eq(paymentRecoveryAction.status, "SCHEDULED"),
      lte(paymentRecoveryAction.availableAt, now),
    );
    const candidates = await tx
      .select({ id: paymentRecoveryAction.id })
      .from(paymentRecoveryAction)
      .where(dueWhere)
      .orderBy(
        asc(paymentRecoveryAction.availableAt),
        asc(paymentRecoveryAction.createdAt),
      )
      .limit(ACTION_BATCH_SIZE);
    if (candidates.length === 0) return [];

    const claimed = await tx
      .update(paymentRecoveryAction)
      .set({
        status: "PROCESSING",
        claimToken,
        leaseExpiresAt,
        startedAt: now,
        attemptCount: sql`${paymentRecoveryAction.attemptCount} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          inArray(
            paymentRecoveryAction.id,
            candidates.map((candidate) => candidate.id),
          ),
          dueWhere,
        ),
      )
      .returning({
        id: paymentRecoveryAction.id,
        claimToken: paymentRecoveryAction.claimToken,
      });
    return claimed.flatMap((action) =>
      action.claimToken
        ? [{ id: action.id, claimToken: action.claimToken }]
        : [],
    );
  });
}

export async function processDuePaymentRecoveryActions(): Promise<{
  claimed: number;
  succeeded: number;
  failed: number;
}> {
  const claimed = await claimDuePaymentRecoveryActions();
  const results = await Promise.allSettled(
    claimed.map((action) =>
      dispatchPaymentRecoveryAction(action.id, action.claimToken),
    ),
  );
  return {
    claimed: claimed.length,
    succeeded: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}

export async function recoverExpiredPaymentRecoveryLeases(
  now = new Date(),
): Promise<{ requeued: number; ambiguous: number }> {
  return db.transaction(async (tx) => {
    const requeued = await tx
      .update(paymentRecoveryAction)
      .set({
        status: "SCHEDULED",
        availableAt: now,
        claimToken: null,
        leaseExpiresAt: null,
        lastErrorCode: "ACTION_LEASE_EXPIRED",
        lastErrorMessage: "Recovery action lease expired before completion",
        updatedAt: now,
      })
      .where(
        and(
          eq(paymentRecoveryAction.status, "PROCESSING"),
          lte(paymentRecoveryAction.leaseExpiresAt, now),
          inArray(paymentRecoveryAction.type, [
            "SEND_EMAIL",
            "SEND_SMS",
            "DISPATCH_WORKFLOW",
            "RETRY_PAYMENT",
            "CREATE_TASK",
            "ESCALATE",
            "GRACE_PERIOD_END",
            "EXPIRE_BOOKING",
            "RELEASE_BOOKING",
          ]),
        ),
      )
      .returning({ id: paymentRecoveryAction.id });
    return { requeued: requeued.length, ambiguous: 0 };
  });
}

export async function dispatchPaymentRecoveryAction(
  actionId: string,
  claimToken: string,
): Promise<void> {
  const context = await loadActionContext(actionId, claimToken);
  if (!context) return;

  try {
    const binding = await executeAction(context);
    await db.transaction(async (tx) => {
      await tx.insert(paymentRecoveryAttempt).values({
        id: createId(),
        organizationId: context.organizationId,
        locationId: context.locationId,
        caseId: context.caseId,
        actionId: context.id,
        type: context.type === "DISPATCH_WORKFLOW" ? "OPERATOR" : "DELIVERY",
        status: "SUCCEEDED",
        idempotencyKey: `${context.idempotencyKey}:attempt:${context.attemptCount}`,
        provider: binding?.provider,
        providerAccountId: binding?.providerAccountId,
        providerAccountRef: binding?.providerAccountRef,
        providerObjectId: binding?.providerObjectId,
        occurredAt: new Date(),
      });
      await tx
        .update(paymentRecoveryAction)
        .set({
          status: "SUCCEEDED",
          providerAccountId: binding?.providerAccountId,
          providerAccountRef: binding?.providerAccountRef,
          outboundDeliveryId: binding?.outboundDeliveryId,
          providerObjectId: binding?.providerObjectId,
          completedAt: new Date(),
          claimToken: null,
          leaseExpiresAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(paymentRecoveryAction.id, context.id),
            eq(paymentRecoveryAction.claimToken, claimToken),
          ),
        );
      await updateCaseSchedule(tx, context.caseId);
    });
  } catch (error) {
    await recordActionFailure(context, claimToken, error);
    throw error;
  }
}

type ActionContext = {
  id: string;
  caseId: string;
  organizationId: string;
  locationId: string | null;
  type: typeof paymentRecoveryAction.$inferSelect.type;
  attemptCount: number;
  maxAttempts: number;
  idempotencyKey: string;
  target: typeof paymentRecoveryCase.$inferSelect.target;
  clientId: string | null;
  invoiceId: string | null;
  membershipId: string | null;
  bookingId: string | null;
  studioBookingId: string | null;
  studioPaymentId: string | null;
  ownerUserId: string | null;
  caseStatus: typeof paymentRecoveryCase.$inferSelect.status;
};

async function loadActionContext(
  actionId: string,
  claimToken: string,
): Promise<ActionContext | null> {
  const rows = await db
    .select({
      id: paymentRecoveryAction.id,
      caseId: paymentRecoveryAction.caseId,
      organizationId: paymentRecoveryAction.organizationId,
      locationId: paymentRecoveryAction.locationId,
      type: paymentRecoveryAction.type,
      attemptCount: paymentRecoveryAction.attemptCount,
      maxAttempts: paymentRecoveryAction.maxAttempts,
      idempotencyKey: paymentRecoveryAction.idempotencyKey,
      target: paymentRecoveryCase.target,
      clientId: paymentRecoveryCase.clientId,
      invoiceId: paymentRecoveryCase.invoiceId,
      membershipId: paymentRecoveryCase.membershipId,
      bookingId: paymentRecoveryCase.bookingId,
      studioBookingId: paymentRecoveryCase.studioBookingId,
      studioPaymentId: paymentRecoveryCase.studioPaymentId,
      ownerUserId: paymentRecoveryCase.ownerUserId,
      caseStatus: paymentRecoveryCase.status,
    })
    .from(paymentRecoveryAction)
    .innerJoin(
      paymentRecoveryCase,
      eq(paymentRecoveryCase.id, paymentRecoveryAction.caseId),
    )
    .where(
      and(
        eq(paymentRecoveryAction.id, actionId),
        eq(paymentRecoveryAction.claimToken, claimToken),
        eq(paymentRecoveryAction.status, "PROCESSING"),
      ),
    )
    .limit(1);
  const context = rows[0];
  if (!context) return null;
  const operationalCleanup =
    context.type === "RELEASE_BOOKING" || context.type === "EXPIRE_BOOKING";
  if (
    context.caseStatus === "RECOVERED" ||
    (context.caseStatus === "CANCELLED" && !operationalCleanup)
  ) {
    await db
      .update(paymentRecoveryAction)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        claimToken: null,
        leaseExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(paymentRecoveryAction.id, context.id));
    return null;
  }
  return context;
}

type ProviderBinding = {
  provider?: string;
  providerAccountId?: string | null;
  providerAccountRef?: string | null;
  providerObjectId?: string | null;
  outboundDeliveryId?: string | null;
};

async function executeAction(
  context: ActionContext,
): Promise<ProviderBinding | null> {
  if (context.type === "SEND_EMAIL" || context.type === "RETRY_PAYMENT") {
    return sendRecoveryEmail(context);
  }
  if (context.type === "SEND_SMS") return sendRecoverySms(context);
  if (context.type === "DISPATCH_WORKFLOW") {
    return dispatchRecoveryWorkflow(context);
  }
  if (context.type === "CREATE_TASK" || context.type === "ESCALATE") {
    await createRecoveryTask(context);
    return null;
  }
  if (context.type === "GRACE_PERIOD_END") {
    await endMembershipGracePeriod(context);
    return null;
  }
  if (context.type === "EXPIRE_BOOKING" || context.type === "RELEASE_BOOKING") {
    await releaseBookingHold(context);
    return null;
  }
  return null;
}

async function sendRecoveryEmail(
  context: ActionContext,
): Promise<ProviderBinding> {
  const recipient = await recoveryRecipient(context);
  if (!recipient.email)
    throw new Error("Recovery recipient has no email address");
  const link = await issuePaymentRecoveryLink({
    actionId: context.id,
    caseId: context.caseId,
    organizationId: context.organizationId,
    locationId: context.locationId,
    purpose: context.target === "BOOKING" ? "RETRY_CHECKOUT" : "UPDATE_PAYMENT",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const url = `${publicAppUrl()}/recover-payment/${encodeURIComponent(link.token)}`;
  const subject = recoverySubject(context.target);
  const result = await sendEmail({
    organizationId: context.organizationId,
    locationId: context.locationId,
    clientId: context.clientId,
    sourceType: "PAYMENT_RECOVERY_ACTION",
    sourceId: context.id,
    idempotencyKey: `${context.idempotencyKey}:email`,
    to: recipient.email,
    subject,
    text: `${subject}\n\nReview your payment securely: ${url}`,
    html: `<p>${escapeHtml(subject)}</p><p><a href="${escapeHtml(url)}">Review payment</a></p>`,
  });
  if (!result.success) throw new Error(result.error);
  return deliveryBinding(result.deliveryId, context);
}

async function sendRecoverySms(
  context: ActionContext,
): Promise<ProviderBinding> {
  const recipient = await recoveryRecipient(context);
  if (!recipient.phone)
    throw new Error("Recovery recipient has no phone number");
  const link = await issuePaymentRecoveryLink({
    actionId: context.id,
    caseId: context.caseId,
    organizationId: context.organizationId,
    locationId: context.locationId,
    purpose: context.target === "BOOKING" ? "RETRY_CHECKOUT" : "UPDATE_PAYMENT",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const result = await enqueueSmsMessages({
    organizationId: context.organizationId,
    locationId: context.locationId,
    recipients: [
      { to: recipient.phone, clientId: context.clientId ?? undefined },
    ],
    body: `Payment needs attention: ${publicAppUrl()}/recover-payment/${encodeURIComponent(link.token)}`,
    purpose: "ONE_TO_ONE",
    idempotencyKey: `${context.idempotencyKey}:sms`,
  });
  const messageId = result.messageIds[0];
  if (!messageId || result.queued !== 1) {
    throw new Error("Payment recovery SMS could not be queued");
  }
  const delivery = await db.query.outboundDelivery.findFirst({
    where: and(
      eq(outboundDelivery.organizationId, context.organizationId),
      context.locationId
        ? eq(outboundDelivery.locationId, context.locationId)
        : isNull(outboundDelivery.locationId),
      eq(outboundDelivery.sourceType, "SMS_MESSAGE"),
      eq(outboundDelivery.sourceId, messageId),
    ),
  });
  if (!delivery) throw new Error("Payment recovery SMS delivery is missing");
  return {
    provider: delivery.provider,
    providerAccountId: delivery.providerAccountId,
    providerAccountRef: delivery.providerAccountRef,
    providerObjectId: messageId,
    outboundDeliveryId: delivery.id,
  };
}

async function deliveryBinding(
  deliveryId: string,
  context: ActionContext,
): Promise<ProviderBinding> {
  const delivery = await db.query.outboundDelivery.findFirst({
    where: and(
      eq(outboundDelivery.id, deliveryId),
      eq(outboundDelivery.organizationId, context.organizationId),
      context.locationId
        ? eq(outboundDelivery.locationId, context.locationId)
        : isNull(outboundDelivery.locationId),
    ),
  });
  if (!delivery) throw new Error("Payment recovery delivery is missing");
  return {
    provider: delivery.provider,
    providerAccountId: delivery.providerAccountId,
    providerAccountRef: delivery.providerAccountRef,
    providerObjectId: delivery.providerMessageId,
    outboundDeliveryId: delivery.id,
  };
}

async function dispatchRecoveryWorkflow(
  context: ActionContext,
): Promise<ProviderBinding | null> {
  if (!context.studioPaymentId) return null;
  const payment = await db.query.studioPayment.findFirst({
    where: and(
      eq(studioPayment.id, context.studioPaymentId),
      eq(studioPayment.organizationId, context.organizationId),
      context.locationId
        ? eq(studioPayment.locationId, context.locationId)
        : isNull(studioPayment.locationId),
    ),
  });
  if (!payment) throw new Error("Recovery payment projection is missing");
  await triggerStudioPaymentWorkflows({
    payment,
    idempotencyKey: `${context.idempotencyKey}:workflow`,
  });
  return null;
}

async function createRecoveryTask(context: ActionContext): Promise<void> {
  const userId = await resolveRecoveryTaskOwner(context);
  if (!userId) throw new Error("Recovery task owner is unavailable");
  await db
    .insert(task)
    .values({
      id: context.id,
      organizationId: context.organizationId,
      locationId: context.locationId,
      title: `Review ${context.target.toLowerCase()} payment recovery`,
      description: `Recovery case ${context.caseId} requires operator review.`,
      status: "TODO",
      priority: context.type === "ESCALATE" ? "HIGH" : "MEDIUM",
      dueDate: new Date(),
      clientId: context.clientId,
      createdById: userId,
      assigneeId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: task.id });
}

async function resolveRecoveryTaskOwner(
  context: ActionContext,
): Promise<string | null> {
  if (context.locationId) {
    const scopedOwner = await db.query.locationMember.findFirst({
      where: and(
        eq(locationMember.locationId, context.locationId),
        context.ownerUserId
          ? eq(locationMember.userId, context.ownerUserId)
          : undefined,
      ),
      columns: { userId: true },
    });
    return scopedOwner?.userId ?? null;
  }
  const scopedOwner = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, context.organizationId),
      context.ownerUserId ? eq(member.userId, context.ownerUserId) : undefined,
    ),
    columns: { userId: true },
  });
  return scopedOwner?.userId ?? null;
}

async function endMembershipGracePeriod(context: ActionContext): Promise<void> {
  if (!context.membershipId) return;
  await db
    .update(studioMembership)
    .set({ status: "INACTIVE", updatedAt: new Date() })
    .where(
      and(
        eq(studioMembership.id, context.membershipId),
        eq(studioMembership.organizationId, context.organizationId),
        context.locationId
          ? eq(studioMembership.locationId, context.locationId)
          : isNull(studioMembership.locationId),
        eq(studioMembership.status, "PAST_DUE"),
        or(
          isNull(studioMembership.paymentGraceEndsAt),
          lte(studioMembership.paymentGraceEndsAt, new Date()),
        ),
      ),
    );
}

async function releaseBookingHold(context: ActionContext): Promise<void> {
  const studioBookingId = context.studioBookingId;
  if (studioBookingId) {
    await db.transaction(async (tx) => {
      const [selectedClassBooking] = await tx
        .select({ id: studioBooking.id })
        .from(studioBooking)
        .innerJoin(studioClass, eq(studioBooking.classId, studioClass.id))
        .where(
          and(
            eq(studioBooking.id, studioBookingId),
            eq(studioClass.organizationId, context.organizationId),
            context.locationId
              ? eq(studioClass.locationId, context.locationId)
              : isNull(studioClass.locationId),
          ),
        )
        .limit(1)
        .for("update", { of: studioBooking });
      if (!selectedClassBooking) return;

      const now = new Date();
      await tx
        .update(studioBooking)
        .set({
          status: "CANCELLED",
          paymentStatus: "EXPIRED",
          paymentFailureAt: now,
          cancelledAt: now,
          cancellationReason: "Payment hold expired",
          releasedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(studioBooking.id, selectedClassBooking.id),
            inArray(studioBooking.status, ["BOOKED", "CANCELLED"]),
            inArray(studioBooking.paymentStatus, [
              "REQUIRES_PAYMENT",
              "PROCESSING",
              "FAILED",
              "EXPIRED",
            ]),
          ),
        );
    });
    return;
  }
  const bookingId = context.bookingId;
  if (!bookingId) return;
  const selected = await db.transaction(async (tx) => {
    const [selectedBooking] = await tx
      .select({
        id: booking.id,
        calBookingUid: booking.calBookingUid,
        calComCredentialId: booking.calComCredentialId,
      })
      .from(booking)
      .where(
        and(
          eq(booking.id, bookingId),
          eq(booking.organizationId, context.organizationId),
          context.locationId
            ? eq(booking.locationId, context.locationId)
            : isNull(booking.locationId),
        ),
      )
      .limit(1)
      .for("update");
    if (!selectedBooking) return null;

    const now = new Date();
    const [released] = await tx
      .update(booking)
      .set({
        status: "CANCELLED",
        paymentStatus: "EXPIRED",
        paymentFailureAt: now,
        cancelledAt: now,
        cancellationReason: "Payment hold expired",
        releasedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(booking.id, selectedBooking.id),
          eq(booking.paid, false),
          inArray(booking.status, ["PENDING", "CANCELLED"]),
          inArray(booking.paymentStatus, [
            "REQUIRES_PAYMENT",
            "PROCESSING",
            "FAILED",
            "EXPIRED",
          ]),
        ),
      )
      .returning({ id: booking.id });
    return released ? selectedBooking : null;
  });
  if (!selected) return;

  if (!selected.calBookingUid || !selected.calComCredentialId) return;
  const credential = await db.query.calComCredential.findFirst({
    where: and(
      eq(calComCredential.id, selected.calComCredentialId),
      eq(calComCredential.organizationId, context.organizationId),
      context.locationId
        ? eq(calComCredential.locationId, context.locationId)
        : isNull(calComCredential.locationId),
      eq(calComCredential.isActive, true),
    ),
    columns: { apiKey: true },
  });
  if (!credential?.apiKey) {
    throw new Error("Cal.com connection is unavailable for hold release");
  }
  const calClient = await getCalComClient(credential.apiKey);
  try {
    const providerBooking = await calClient.getBooking(selected.calBookingUid);
    if (providerBooking.data.status.toUpperCase() !== "CANCELLED") {
      await calClient.cancelBooking(
        selected.calBookingUid,
        "Aurea payment hold expired",
      );
    }
  } catch (error: unknown) {
    if (error instanceof CalComApiError && error.statusCode === 404) return;
    throw error;
  }
}

async function recoveryRecipient(context: ActionContext): Promise<{
  email: string | null;
  phone: string | null;
}> {
  if (context.clientId) {
    const selectedClient = await db.query.client.findFirst({
      where: and(
        eq(client.id, context.clientId),
        eq(client.organizationId, context.organizationId),
        context.locationId
          ? eq(client.locationId, context.locationId)
          : isNull(client.locationId),
      ),
      columns: { email: true, phone: true },
    });
    if (selectedClient) return selectedClient;
  }
  if (context.bookingId) {
    const selectedBooking = await db.query.booking.findFirst({
      where: and(
        eq(booking.id, context.bookingId),
        eq(booking.organizationId, context.organizationId),
        context.locationId
          ? eq(booking.locationId, context.locationId)
          : isNull(booking.locationId),
      ),
      columns: { attendeeEmail: true, attendeePhone: true },
    });
    return {
      email: selectedBooking?.attendeeEmail ?? null,
      phone: selectedBooking?.attendeePhone ?? null,
    };
  }
  if (context.invoiceId) {
    const selectedInvoice = await db.query.invoice.findFirst({
      where: and(
        eq(invoice.id, context.invoiceId),
        eq(invoice.organizationId, context.organizationId),
        context.locationId
          ? eq(invoice.locationId, context.locationId)
          : isNull(invoice.locationId),
      ),
      columns: { clientEmail: true },
    });
    return { email: selectedInvoice?.clientEmail ?? null, phone: null };
  }
  return { email: null, phone: null };
}

async function recordActionFailure(
  context: ActionContext,
  claimToken: string,
  error: unknown,
): Promise<void> {
  const message =
    error instanceof Error ? error.message : "Recovery action failed";
  const exhausted = context.attemptCount >= context.maxAttempts;
  const retryAt = new Date(
    Date.now() +
      Math.min(60, 2 ** Math.max(0, context.attemptCount - 1)) * 60_000,
  );
  await db.transaction(async (tx) => {
    await tx
      .insert(paymentRecoveryAttempt)
      .values({
        id: createId(),
        organizationId: context.organizationId,
        locationId: context.locationId,
        caseId: context.caseId,
        actionId: context.id,
        type: "DELIVERY",
        status: "FAILED",
        idempotencyKey: `${context.idempotencyKey}:attempt:${context.attemptCount}`,
        errorCode: "ACTION_EXECUTION_FAILED",
        errorMessage: message.slice(0, 500),
        occurredAt: new Date(),
      })
      .onConflictDoNothing({ target: paymentRecoveryAttempt.idempotencyKey });
    await tx
      .update(paymentRecoveryAction)
      .set({
        status: exhausted ? "FAILED" : "SCHEDULED",
        availableAt: exhausted ? new Date() : retryAt,
        claimToken: null,
        leaseExpiresAt: null,
        completedAt: exhausted ? new Date() : null,
        lastErrorCode: "ACTION_EXECUTION_FAILED",
        lastErrorMessage: message.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paymentRecoveryAction.id, context.id),
          eq(paymentRecoveryAction.claimToken, claimToken),
        ),
      );
    if (exhausted) await updateCaseSchedule(tx, context.caseId);
  });
}

type RecoveryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function updateCaseSchedule(
  tx: RecoveryTransaction,
  caseId: string,
): Promise<void> {
  const pending = await tx.query.paymentRecoveryAction.findFirst({
    where: and(
      eq(paymentRecoveryAction.caseId, caseId),
      eq(paymentRecoveryAction.status, "SCHEDULED"),
    ),
    columns: { availableAt: true },
    orderBy: asc(paymentRecoveryAction.availableAt),
  });
  const failed = await tx.query.paymentRecoveryAction.findFirst({
    where: and(
      eq(paymentRecoveryAction.caseId, caseId),
      eq(paymentRecoveryAction.status, "FAILED"),
    ),
    columns: { id: true },
  });
  await tx
    .update(paymentRecoveryCase)
    .set({
      status: pending ? "IN_PROGRESS" : failed ? "EXHAUSTED" : "IN_PROGRESS",
      nextActionAt: pending?.availableAt ?? null,
      exhaustedAt: !pending && failed ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(paymentRecoveryCase.id, caseId),
        inArray(paymentRecoveryCase.status, ["OPEN", "IN_PROGRESS"]),
      ),
    );
}

function recoverySubject(target: ActionContext["target"]): string {
  if (target === "BOOKING") return "Complete your booking payment";
  if (target === "MEMBERSHIP") return "Update your membership payment";
  return "Your invoice payment needs attention";
}

function publicAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
