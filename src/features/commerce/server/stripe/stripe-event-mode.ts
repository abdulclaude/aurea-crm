export function expectedStripeEventLivemode(
  secretKey: string | undefined,
): boolean | null {
  const normalized = secretKey?.trim();
  if (!normalized) return null;

  if (normalized.startsWith("sk_test_") || normalized.startsWith("rk_test_")) {
    return false;
  }
  if (normalized.startsWith("sk_live_") || normalized.startsWith("rk_live_")) {
    return true;
  }
  return null;
}
