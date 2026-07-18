import type {
  CommunicationSuppressionScope,
  DeliveryChannel,
  DeliveryPurpose,
} from "@/features/delivery/contracts";

export type SuppressionCandidate = {
  id: string;
  channel: DeliveryChannel;
  destinationNormalized: string;
  scope: CommunicationSuppressionScope;
  activeAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

export function isSuppressionActive(
  suppression: Pick<
    SuppressionCandidate,
    "activeAt" | "expiresAt" | "revokedAt"
  >,
  at: Date = new Date(),
): boolean {
  return (
    suppression.activeAt.getTime() <= at.getTime() &&
    suppression.revokedAt === null &&
    (suppression.expiresAt === null ||
      suppression.expiresAt.getTime() > at.getTime())
  );
}

export function doesSuppressionBlockPurpose(
  scope: CommunicationSuppressionScope,
  purpose: DeliveryPurpose,
): boolean {
  return scope === "ALL" || purpose === "MARKETING";
}

type FindBlockingSuppressionInput = {
  channel: DeliveryChannel;
  destinationNormalized: string;
  purpose: DeliveryPurpose;
  suppressions: readonly SuppressionCandidate[];
  at?: Date;
};

export function findBlockingSuppression({
  channel,
  destinationNormalized,
  purpose,
  suppressions,
  at = new Date(),
}: FindBlockingSuppressionInput): SuppressionCandidate | null {
  return (
    suppressions.find(
      (suppression) =>
        suppression.channel === channel &&
        suppression.destinationNormalized === destinationNormalized &&
        isSuppressionActive(suppression, at) &&
        doesSuppressionBlockPurpose(suppression.scope, purpose),
    ) ?? null
  );
}
