export function matchesAmbiguousSmsCandidate(input: {
  destination: string;
  body: string;
  requestedAt: Date;
  providerDestination: string;
  providerBody: string;
  providerCreatedAt: Date | null;
}): boolean {
  const providerTime = input.providerCreatedAt?.getTime();
  return (
    input.providerDestination === input.destination &&
    input.providerBody === input.body &&
    providerTime !== undefined &&
    providerTime >= input.requestedAt.getTime() - 60_000 &&
    providerTime <= input.requestedAt.getTime() + 10 * 60_000
  );
}
