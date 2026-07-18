import { assertMinorUnits } from "@/features/commerce/lib/money";

export type RefundLedgerReservation = {
  providerRefundId: string;
  amountMinor: number;
};

export type RefundOperationReservation = {
  providerRefundId: string | null;
  amountMinor: number;
};

export type RefundAvailability = {
  reservedMinor: number;
  remainingMinor: number;
};

export function calculateRefundAvailability(input: {
  originalAmountMinor: number;
  ledgerReservations: RefundLedgerReservation[];
  operationReservations: RefundOperationReservation[];
}): RefundAvailability {
  assertMinorUnits(input.originalAmountMinor);
  const recordedRefundIds = new Set(
    input.ledgerReservations.map((reservation) => reservation.providerRefundId),
  );

  let reservedMinor = 0;
  for (const reservation of input.ledgerReservations) {
    reservedMinor = addMinorUnits(reservedMinor, reservation.amountMinor);
  }
  for (const reservation of input.operationReservations) {
    if (
      reservation.providerRefundId &&
      recordedRefundIds.has(reservation.providerRefundId)
    ) {
      continue;
    }
    reservedMinor = addMinorUnits(reservedMinor, reservation.amountMinor);
  }

  if (reservedMinor > input.originalAmountMinor) {
    throw new Error("Reserved refunds exceed the original payment");
  }

  return {
    reservedMinor,
    remainingMinor: input.originalAmountMinor - reservedMinor,
  };
}

export function assertRefundAmountAvailable(
  amountMinor: number,
  availability: RefundAvailability,
): void {
  assertMinorUnits(amountMinor);
  if (amountMinor === 0) {
    throw new Error("Refund amount must be greater than zero");
  }
  if (amountMinor > availability.remainingMinor) {
    throw new Error("Refund amount exceeds the remaining payment balance");
  }
}

function addMinorUnits(total: number, amountMinor: number): number {
  assertMinorUnits(amountMinor);
  const next = total + amountMinor;
  if (!Number.isSafeInteger(next)) {
    throw new Error("Refund total exceeds the supported range");
  }
  return next;
}
