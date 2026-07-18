import { cancellationCharge } from "@/db/schema";

export type CancellationChargeStatus =
  typeof cancellationCharge.$inferSelect.status;

export type CancellationCollectionTerminal = {
  chargeId: string;
  terminalStatus: CancellationChargeStatus;
};

export type CancellationCollectionDetails = {
  chargeId: string;
  operationId: string;
  attempt: number;
  amountMinor: number;
  currency: string;
  currencyExponent: number;
  stripeCustomerId: string | null;
  stripeConnectionId: string;
  providerAccountId: string;
  applicationFeePercent: string | null;
  applicationFeeFixed: string | null;
  organizationId: string;
  locationId: string | null;
  clientId: string;
  bookingId: string;
};

export type CancellationCollectionReservation =
  | CancellationCollectionTerminal
  | CancellationCollectionDetails;

export type CancellationCollectionResult = {
  chargeId: string;
  status: CancellationChargeStatus;
  paymentIntentId: string | null;
};
