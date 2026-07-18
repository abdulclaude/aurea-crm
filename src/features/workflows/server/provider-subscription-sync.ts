import {
  syncGmailWorkflowSubscriptions,
} from "@/features/gmail/server/subscriptions";
import {
  removeGoogleCalendarWorkflowSubscriptions,
  syncGoogleCalendarWorkflowSubscriptions,
} from "@/features/google-calendar/server/subscriptions";
import {
  syncOneDriveWorkflowSubscriptions,
} from "@/features/onedrive/server/subscriptions";
import {
  syncOutlookWorkflowSubscriptions,
} from "@/features/outlook/server/subscriptions";

export type WorkflowProviderSubscriptionScope = {
  actorUserId: string;
  organizationId: string;
  locationId: string | null;
};

export async function syncWorkflowProviderSubscriptions(
  input: WorkflowProviderSubscriptionScope & { workflowId: string },
): Promise<void> {
  await runProviderTasks([
    {
      provider: "google-calendar",
      run: () => syncGoogleCalendarWorkflowSubscriptions(input),
    },
    ...scopeSyncTasks(input),
  ], true);
}

export async function removeWorkflowCalendarSubscription(
  input: WorkflowProviderSubscriptionScope & { workflowId: string },
): Promise<void> {
  await runProviderTasks([
    {
      provider: "google-calendar",
      run: () => removeGoogleCalendarWorkflowSubscriptions(input),
    },
  ]);
}

export async function syncScopeProviderSubscriptions(
  input: WorkflowProviderSubscriptionScope,
): Promise<void> {
  await runProviderTasks(scopeSyncTasks(input));
}

function scopeSyncTasks(input: WorkflowProviderSubscriptionScope) {
  const scope = {
    organizationId: input.organizationId,
    locationId: input.locationId,
  };
  return [
    {
      provider: "gmail",
      run: () =>
        syncGmailWorkflowSubscriptions({
          actorUserId: input.actorUserId,
          scope,
        }),
    },
    {
      provider: "outlook",
      run: () =>
        syncOutlookWorkflowSubscriptions({
          ...scope,
          userId: input.actorUserId,
        }),
    },
    {
      provider: "onedrive",
      run: () =>
        syncOneDriveWorkflowSubscriptions({
          ...scope,
          userId: input.actorUserId,
        }),
    },
  ];
}

async function runProviderTasks(
  tasks: Array<{ provider: string; run: () => Promise<void> }>,
  strict = false,
): Promise<void> {
  const results = await Promise.allSettled(tasks.map((task) => task.run()));
  const failures = results.flatMap((result, index) =>
    result.status === "rejected" ? [tasks[index]?.provider ?? "unknown"] : [],
  );
  if (failures.length > 0) {
    console.error("[Workflows] Provider subscription synchronization failed.", {
      providers: failures,
    });
    if (strict) {
      throw new Error(
        `Provider subscription setup failed: ${failures.join(", ")}.`,
      );
    }
  }
}
