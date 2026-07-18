import Handlebars from "handlebars";
import {
  and,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  outboundDelivery,
  studioBooking,
  studioPayment,
} from "@/db/schema";
import type { NodeExecutor } from "@/features/executions/types";

import { evaluateIfElseConfig } from "./condition-utils";
import { normalizeIfElseConfig } from "./schema";

export const ifElseExecutor: NodeExecutor = async ({
  data,
  context,
  nodeId,
  scope,
  step,
}) => {
  const config = normalizeIfElseConfig(data);
  const systemContext = config.clientId
    ? await step.run(`condition-live-client-${nodeId}`, async () => {
        const clientId = Handlebars.compile(config.clientId || "", {
          noEscape: true,
        })(context).trim();
        return clientId
          ? loadLiveClientContext({
              clientId,
              organizationId: scope.organizationId,
              locationId: scope.locationId,
            })
          : null;
      })
    : null;
  const evaluationContext = systemContext
    ? { ...context, system: systemContext }
    : context;
  const evaluation = evaluateIfElseConfig(config, evaluationContext);
  const firstResult = evaluation.conditionResults[0];

  return {
    ...context,
    variables: {
      ...readVariables(context.variables),
      [config.variableName]: {
        result: evaluation.result,
        conditionResults: evaluation.conditionResults,
        leftValue: firstResult?.leftValue,
        rightValue: firstResult?.rightValue,
        operator: config.conditions[0]?.operator,
        branchToFollow: evaluation.result ? "true" : "false",
      },
    },
  };
};

async function loadLiveClientContext(input: {
  clientId: string;
  organizationId: string;
  locationId: string | null;
}): Promise<Record<string, unknown> | null> {
  const clientScope = and(
    eq(client.id, input.clientId),
    eq(client.organizationId, input.organizationId),
    input.locationId
      ? eq(client.locationId, input.locationId)
      : isNull(client.locationId),
  );
  const paymentScope = and(
    eq(studioPayment.clientId, input.clientId),
    eq(studioPayment.organizationId, input.organizationId),
    input.locationId
      ? eq(studioPayment.locationId, input.locationId)
      : isNull(studioPayment.locationId),
  );
  const deliveryScope = and(
    eq(outboundDelivery.clientId, input.clientId),
    eq(outboundDelivery.organizationId, input.organizationId),
    input.locationId
      ? eq(outboundDelivery.locationId, input.locationId)
      : isNull(outboundDelivery.locationId),
    eq(outboundDelivery.channel, "EMAIL"),
  );
  const pricingOptionId =
    sql<string>`${studioPayment.metadata} ->> 'pricingOptionId'`;

  const [
    clientRow,
    bookedRows,
    cancelledRows,
    attendedRows,
    purchaseRows,
    pricingOptionRows,
    deliveredRows,
    openedRows,
    clickedRows,
    bouncedRows,
  ] = await Promise.all([
    db.query.client.findFirst({ where: clientScope }),
    countRows(
      and(
        eq(studioBooking.clientId, input.clientId),
        inArray(studioBooking.status, ["BOOKED", "ATTENDED"]),
      ),
      studioBooking,
    ),
    countRows(
      and(
        eq(studioBooking.clientId, input.clientId),
        eq(studioBooking.status, "CANCELLED"),
      ),
      studioBooking,
    ),
    countRows(
      and(
        eq(studioBooking.clientId, input.clientId),
        eq(studioBooking.status, "ATTENDED"),
      ),
      studioBooking,
    ),
    countRows(
      and(paymentScope, eq(studioPayment.status, "SUCCEEDED")),
      studioPayment,
    ),
    db
      .select({ id: pricingOptionId, value: count() })
      .from(studioPayment)
      .where(
        and(
          paymentScope,
          eq(studioPayment.status, "SUCCEEDED"),
          sql`${pricingOptionId} is not null`,
        ),
      )
      .groupBy(pricingOptionId),
    countRows(
      and(deliveryScope, isNotNull(outboundDelivery.deliveredAt)),
      outboundDelivery,
    ),
    countRows(
      and(deliveryScope, isNotNull(outboundDelivery.openedAt)),
      outboundDelivery,
    ),
    countRows(
      and(deliveryScope, isNotNull(outboundDelivery.clickedAt)),
      outboundDelivery,
    ),
    countRows(
      and(deliveryScope, isNotNull(outboundDelivery.bouncedAt)),
      outboundDelivery,
    ),
  ]);

  if (!clientRow) return null;

  return {
    client: {
      id: clientRow.id,
      name: clientRow.name,
      email: clientRow.email,
      phone: clientRow.phone,
      type: clientRow.type,
      lifecycleStage: clientRow.lifecycleStage,
      acquisitionStage: clientRow.acquisitionStage,
      tags: clientRow.tags ?? [],
      attendanceCount: clientRow.attendanceCount,
      currentStreak: clientRow.currentStreak,
      customFields: clientRow.metadata ?? {},
    },
    reservations: {
      booked: bookedRows,
      cancelled: cancelledRows,
      attended: attendedRows,
    },
    purchases: {
      successful: purchaseRows,
      byPricingOption: Object.fromEntries(
        pricingOptionRows.map((row) => [row.id, row.value]),
      ),
    },
    email: {
      delivered: deliveredRows,
      opened: openedRows,
      clicked: clickedRows,
      bounced: bouncedRows,
    },
  };
}

type CountableTable =
  | typeof studioBooking
  | typeof studioPayment
  | typeof outboundDelivery;

async function countRows(
  where: ReturnType<typeof and>,
  table: CountableTable,
): Promise<number> {
  const [row] = await db.select({ value: count() }).from(table).where(where);
  return row?.value ?? 0;
}

function readVariables(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
