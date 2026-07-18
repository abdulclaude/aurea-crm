import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { client, stripeConnection } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";
import { getStripePlatformClient } from "@/lib/stripe";

const paymentMethodSchema = z.object({
  id: z.string(),
  brand: z.string(),
  last4: z.string(),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int(),
  funding: z.string().nullable(),
  cardholderName: z.string().nullable(),
  billingEmail: z.string().nullable(),
  country: z.string().nullable(),
  wallet: z.string().nullable(),
  processor: z.literal("Stripe"),
  transactionCount: z.number().int().nonnegative(),
  lastUsedAt: z.date().nullable(),
  isDefault: z.boolean(),
});

export const clientPaymentMethodsOutputSchema = z.object({
  availability: z.enum(["AVAILABLE", "NO_CUSTOMER", "NO_CONNECTION"]),
  methods: z.array(paymentMethodSchema),
});

type ClientPaymentMethodsOutput = z.infer<
  typeof clientPaymentMethodsOutputSchema
>;

type PaymentMethodContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export async function listClientPaymentMethods(input: {
  clientId: string;
  ctx: PaymentMethodContext;
}): Promise<ClientPaymentMethodsOutput> {
  if (!input.ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization context required",
    });
  }

  const targetClient = await db.query.client.findFirst({
    where: and(
      eq(client.id, input.clientId),
      eq(client.organizationId, input.ctx.orgId),
      input.ctx.locationId
        ? eq(client.locationId, input.ctx.locationId)
        : undefined,
    ),
    columns: {
      id: true,
      locationId: true,
      stripeCustomerId: true,
    },
  });
  if (!targetClient) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
  }

  await requireCapability({
    actor: {
      userId: input.ctx.auth.user.id,
      organizationId: input.ctx.orgId,
      locationId: input.ctx.locationId,
    },
    capability: "commerce.view",
    resource: {
      organizationId: input.ctx.orgId,
      locationId: targetClient.locationId,
    },
  });

  if (!targetClient.stripeCustomerId) {
    return { availability: "NO_CUSTOMER", methods: [] };
  }

  const connection = await db.query.stripeConnection.findFirst({
    where: and(
      eq(stripeConnection.organizationId, input.ctx.orgId),
      targetClient.locationId
        ? eq(stripeConnection.locationId, targetClient.locationId)
        : isNull(stripeConnection.locationId),
      eq(stripeConnection.isActive, true),
    ),
    columns: {
      stripeAccountId: true,
      accountType: true,
    },
  });
  if (!connection) {
    return { availability: "NO_CONNECTION", methods: [] };
  }
  if (connection.accountType !== "express") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The client payment account must be a Stripe Express account",
    });
  }

  try {
    const stripe = getStripePlatformClient();
    const account = await stripe.accounts.retrieve(connection.stripeAccountId);
    if (account.type !== "express") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "The client payment account must be a Stripe Express account",
      });
    }

    const customer = await stripe.customers.retrieve(
      targetClient.stripeCustomerId,
      { expand: ["invoice_settings.default_payment_method"] },
    );
    if (customer.deleted) {
      return { availability: "NO_CUSTOMER", methods: [] };
    }
    if (
      (customer.metadata.clientId &&
        customer.metadata.clientId !== targetClient.id) ||
      (customer.metadata.organizationId &&
        customer.metadata.organizationId !== input.ctx.orgId)
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "The Stripe customer binding does not match this client",
      });
    }

    const [paymentMethods, paymentIntents] = await Promise.all([
      stripe.paymentMethods.list({
        customer: targetClient.stripeCustomerId,
        type: "card",
        limit: 100,
      }),
      stripe.paymentIntents
        .list({ customer: targetClient.stripeCustomerId, limit: 100 })
        .autoPagingToArray({ limit: 1000 }),
    ]);
    const usage = new Map<string, { count: number; lastUsedAt: Date }>();
    for (const intent of paymentIntents) {
      if (
        intent.status !== "succeeded" ||
        intent.transfer_data?.destination !== connection.stripeAccountId
      ) {
        continue;
      }
      const paymentMethodId = stripeResourceId(intent.payment_method);
      if (!paymentMethodId) continue;
      const usedAt = new Date(intent.created * 1000);
      const current = usage.get(paymentMethodId);
      usage.set(paymentMethodId, {
        count: (current?.count ?? 0) + 1,
        lastUsedAt:
          !current || usedAt > current.lastUsedAt ? usedAt : current.lastUsedAt,
      });
    }

    const defaultPaymentMethodId = stripeResourceId(
      customer.invoice_settings.default_payment_method,
    );
    const methods = paymentMethods.data.flatMap((method) => {
      if (!method.card) return [];
      const methodUsage = usage.get(method.id);
      return [
        {
          id: method.id,
          brand: method.card.display_brand ?? method.card.brand,
          last4: method.card.last4,
          expMonth: method.card.exp_month,
          expYear: method.card.exp_year,
          funding: method.card.funding ?? null,
          cardholderName: method.billing_details.name ?? null,
          billingEmail: method.billing_details.email ?? null,
          country: method.card.country ?? null,
          wallet: method.card.wallet?.type ?? null,
          processor: "Stripe" as const,
          transactionCount: methodUsage?.count ?? 0,
          lastUsedAt: methodUsage?.lastUsedAt ?? null,
          isDefault: method.id === defaultPaymentMethodId,
        },
      ];
    });
    methods.sort(
      (left, right) =>
        Number(right.isDefault) - Number(left.isDefault) ||
        (right.lastUsedAt?.getTime() ?? 0) -
          (left.lastUsedAt?.getTime() ?? 0),
    );
    return { availability: "AVAILABLE", methods };
  } catch (error: unknown) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unable to load client payment methods",
      cause: error,
    });
  }
}

function stripeResourceId(
  resource: string | { id: string } | null,
): string | null {
  if (!resource) return null;
  return typeof resource === "string" ? resource : resource.id;
}
