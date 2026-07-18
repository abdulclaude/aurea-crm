export function conservativeSmsSegmentUpperBound(body: string): number {
  const codeUnits = body.length;
  return codeUnits <= 70 ? 1 : Math.ceil(codeUnits / 67);
}

export function canonicalDecimal(value: string | number): string {
  const raw = String(value).trim();
  const sign = raw.startsWith("-") ? "-" : "";
  const unsigned = sign ? raw.slice(1) : raw;
  const [integer = "0", fraction = ""] = unsigned.split(".");
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = fraction.replace(/0+$/, "");
  return `${sign}${normalizedInteger}${normalizedFraction ? `.${normalizedFraction}` : ""}`;
}

export type ProjectedVoiceStatus =
  | "QUEUED"
  | "RINGING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BUSY"
  | "NO_ANSWER"
  | "CANCELED"
  | "FAILED";

const VOICE_STATUS_RANK: Record<ProjectedVoiceStatus, number> = {
  QUEUED: 0,
  RINGING: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  BUSY: 3,
  NO_ANSWER: 3,
  CANCELED: 3,
  FAILED: 3,
};

export function projectVoiceStatus(value: string): ProjectedVoiceStatus {
  switch (value.toLowerCase()) {
    case "ringing":
      return "RINGING";
    case "in-progress":
      return "IN_PROGRESS";
    case "completed":
      return "COMPLETED";
    case "busy":
      return "BUSY";
    case "no-answer":
      return "NO_ANSWER";
    case "canceled":
      return "CANCELED";
    case "failed":
      return "FAILED";
    default:
      return "QUEUED";
  }
}

export function shouldApplyVoiceStatus(
  current: ProjectedVoiceStatus,
  next: ProjectedVoiceStatus,
): boolean {
  const currentRank = VOICE_STATUS_RANK[current];
  const nextRank = VOICE_STATUS_RANK[next];
  if (nextRank < currentRank) return false;
  return currentRank < 3 || current === next;
}
