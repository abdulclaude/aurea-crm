const DAY_MS = 24 * 60 * 60 * 1_000;

export type ChurnRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type ChurnScoreMember = {
  attendanceCount: number;
  currentStreak: number;
  lastInteractionAt: Date | null;
  createdAt: Date;
  studioMembership: Array<{
    status: string;
    usedClasses: number | null;
    totalClasses: number | null;
  }>;
};

export function calculateChurnScore(
  member: ChurnScoreMember,
  now = new Date(),
): {
  score: number;
  riskLevel: ChurnRiskLevel;
  factors: Record<string, unknown>;
} {
  let score = 0;
  const factors: Record<string, unknown> = {};
  const daysSinceLastVisit = member.lastInteractionAt
    ? Math.floor((now.getTime() - member.lastInteractionAt.getTime()) / DAY_MS)
    : 999;

  if (daysSinceLastVisit > 30) {
    score += 40;
    factors.inactiveDays = daysSinceLastVisit;
  } else if (daysSinceLastVisit > 14) {
    score += 25;
    factors.inactiveDays = daysSinceLastVisit;
  } else if (daysSinceLastVisit > 7) {
    score += 10;
    factors.inactiveDays = daysSinceLastVisit;
  }

  if (member.currentStreak === 0 && member.attendanceCount > 5) {
    score += 15;
    factors.streakBroken = true;
  }

  const activeMembership = member.studioMembership.find(
    ({ status }) => status === "ACTIVE",
  );
  if (!activeMembership) {
    score += 20;
    factors.noActiveMembership = true;
  } else if (
    activeMembership.totalClasses &&
    (activeMembership.usedClasses ?? 0) > 0
  ) {
    const usageRate =
      (activeMembership.usedClasses ?? 0) / activeMembership.totalClasses;
    if (usageRate < 0.3) {
      score += 15;
      factors.lowUsageRate = usageRate;
    }
  }

  const memberAgeDays = Math.floor(
    (now.getTime() - member.createdAt.getTime()) / DAY_MS,
  );
  if (memberAgeDays < 30 && member.attendanceCount < 3) {
    score += 10;
    factors.newMemberLowEngagement = true;
  }

  score = Math.min(score, 100);
  const riskLevel =
    score >= 75
      ? "CRITICAL"
      : score >= 50
        ? "HIGH"
        : score >= 25
          ? "MEDIUM"
          : "LOW";

  return { score, riskLevel, factors };
}

export function getSuggestedChurnActions(
  riskLevel: ChurnRiskLevel,
  factors: Record<string, unknown>,
): string[] {
  const actions: string[] = [];

  if (factors.inactiveDays && Number(factors.inactiveDays) > 14) {
    actions.push(
      "Send a personalized 'We miss you' message with a class recommendation",
    );
  }
  if (factors.streakBroken) {
    actions.push(
      "Encourage them to restart their streak with a motivational message",
    );
  }
  if (factors.noActiveMembership) {
    actions.push("Offer a special re-enrollment discount or intro offer");
  }
  if (factors.lowUsageRate) {
    actions.push(
      "Suggest different class types that might better fit their schedule",
    );
  }
  if (factors.newMemberLowEngagement) {
    actions.push("Schedule a personal check-in call to ensure they feel welcome");
  }
  if (riskLevel === "CRITICAL") {
    actions.push("Assign a staff member for personal outreach within 24 hours");
  } else if (riskLevel === "HIGH") {
    actions.push("Create a follow-up task for the team to reach out this week");
  }

  return actions;
}
