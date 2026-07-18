export type ReconciliationIssueStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "RESOLVED"
  | "IGNORED";

export function canAcknowledgeIssue(
  status: ReconciliationIssueStatus,
): boolean {
  return status === "OPEN" || status === "ACKNOWLEDGED";
}

export function canResolveIssue(status: ReconciliationIssueStatus): boolean {
  return status === "OPEN" || status === "ACKNOWLEDGED" || status === "RESOLVED";
}
