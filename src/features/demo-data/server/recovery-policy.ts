export const DEMO_RUN_STALE_AFTER_MS = 30 * 60 * 1_000;

type RecoverableRunStatus = "RUNNING" | "CLEARING";

export type DemoRunRecoveryDecision =
  | { kind: "TOO_RECENT"; recoverableAt: Date }
  | { kind: "MARK_FAILED" }
  | { kind: "MARK_CLEARED" };

export function decideDemoRunRecovery(input: {
  status: RecoverableRunStatus;
  updatedAt: Date;
  now: Date;
  registryCount: number;
}): DemoRunRecoveryDecision {
  const recoverableAt = new Date(
    input.updatedAt.getTime() + DEMO_RUN_STALE_AFTER_MS,
  );
  if (input.now < recoverableAt) {
    return { kind: "TOO_RECENT", recoverableAt };
  }
  if (input.status === "CLEARING" && input.registryCount === 0) {
    return { kind: "MARK_CLEARED" };
  }
  return { kind: "MARK_FAILED" };
}
