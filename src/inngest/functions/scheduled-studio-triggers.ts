import {
  evaluateBirthdayTriggers,
  evaluateMembershipExpiringTriggers,
  evaluateUpcomingClassTriggers,
} from "@/features/workflows/server/scheduled-studio-trigger-service";
import { inngest } from "@/inngest/client";

export const evaluateScheduledStudioTriggers = inngest.createFunction(
  {
    id: "evaluate-scheduled-studio-triggers",
    retries: 2,
  },
  { cron: "*/5 * * * *" },
  async () => {
    const [
      birthdayWorkflowsTriggered,
      expiryWorkflowsTriggered,
      upcomingClassWorkflowsTriggered,
    ] =
      await Promise.all([
        evaluateBirthdayTriggers(),
        evaluateMembershipExpiringTriggers(),
        evaluateUpcomingClassTriggers(),
      ]);
    return {
      birthdayWorkflowsTriggered,
      expiryWorkflowsTriggered,
      upcomingClassWorkflowsTriggered,
    };
  },
);
