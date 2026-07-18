export const AD_CONVERSION_CLAIM_LEASE_MS = 5 * 60 * 1_000;

export function isAdConversionDeliveryClaimable(input: {
  status: "PROCESSING" | "SUCCEEDED" | "FAILED";
  lastAttemptAt: Date;
  now: Date;
}): boolean {
  if (input.status === "SUCCEEDED") return false;
  if (input.status === "FAILED") return true;
  return (
    input.now.getTime() - input.lastAttemptAt.getTime() >=
    AD_CONVERSION_CLAIM_LEASE_MS
  );
}
