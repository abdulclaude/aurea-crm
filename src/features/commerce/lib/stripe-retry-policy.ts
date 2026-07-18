export function stripeRetryDelayMs(seed: string, attempt: number): number {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new Error("Stripe retry attempt must be a positive integer");
  }
  const last = seed.charCodeAt(seed.length - 1) || 1;
  const base = Math.min(
    6 * 60 * 60 * 1_000,
    30_000 * 2 ** Math.max(0, attempt - 1),
  );
  const jitter = 0.8 + (last % 41) / 100;
  return Math.round(base * jitter);
}
