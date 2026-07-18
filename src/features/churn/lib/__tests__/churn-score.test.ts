import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  calculateChurnScore,
  getSuggestedChurnActions,
} from "../churn-score";

const now = new Date("2026-07-15T12:00:00.000Z");

describe("churn scoring", () => {
  it("keeps a recently active, engaged member at low risk", () => {
    assert.deepEqual(
      calculateChurnScore(
        {
          attendanceCount: 20,
          currentStreak: 4,
          lastInteractionAt: new Date("2026-07-14T12:00:00.000Z"),
          createdAt: new Date("2025-07-15T12:00:00.000Z"),
          studioMembership: [
            { status: "ACTIVE", usedClasses: 8, totalClasses: 10 },
          ],
        },
        now,
      ),
      { score: 0, riskLevel: "LOW", factors: {} },
    );
  });

  it("classifies sustained inactivity and membership loss as critical", () => {
    const result = calculateChurnScore(
      {
        attendanceCount: 30,
        currentStreak: 0,
        lastInteractionAt: new Date("2026-05-01T12:00:00.000Z"),
        createdAt: new Date("2025-07-15T12:00:00.000Z"),
        studioMembership: [],
      },
      now,
    );

    assert.equal(result.score, 75);
    assert.equal(result.riskLevel, "CRITICAL");
    assert.deepEqual(Object.keys(result.factors).sort(), [
      "inactiveDays",
      "noActiveMembership",
      "streakBroken",
    ]);
    assert.match(
      getSuggestedChurnActions(result.riskLevel, result.factors).at(-1) ?? "",
      /within 24 hours/,
    );
  });

  it("persists and reads scores in one exact location scope", () => {
    const router = readFileSync(
      path.join(process.cwd(), "src/features/churn/server/router.ts"),
      "utf8",
    );
    const migration = readFileSync(
      path.join(process.cwd(), "drizzle/0053_churn_score_scope.sql"),
      "utf8",
    );

    assert.match(router, /exactLocation\(churnRiskScore\.locationId, ctx\.locationId\)/);
    assert.match(router, /requireChurnAccess\(ctx, "customer\.manage"\)/);
    assert.match(router, /\.values\(rows\)/);
    assert.doesNotMatch(router, /for \(const member of members\)/);
    assert.match(migration, /ChurnRiskScore_exact_scope_guard/);
    assert.match(migration, /ChurnRiskScore_organizationId_clientId_fkey/);
  });
});
