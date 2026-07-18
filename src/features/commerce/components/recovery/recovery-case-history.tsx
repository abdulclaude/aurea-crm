import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { formatRecoveryDate } from "./recovery-formatters";
import type { RecoveryCaseDetail } from "./recovery-ui-types";

export function RecoveryCaseHistory({
  detail,
}: {
  detail: RecoveryCaseDetail;
}) {
  return (
    <div className="divide-y">
      <section className="space-y-3 p-5">
        <h3 className="text-sm font-medium">Actions</h3>
        {detail.actions.map((action) => (
          <div
            key={action.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {action.type.replaceAll("_", " ").toLowerCase()}
              </p>
              <p className="mt-1 text-muted-foreground">
                {formatRecoveryDate(action.availableAt)} · {action.attemptCount}
                /{action.maxAttempts} attempts
              </p>
              {action.lastErrorMessage && (
                <p className="mt-1 whitespace-normal text-rose-600">
                  {action.lastErrorMessage}
                </p>
              )}
              {action.deliveryStatus && (
                <p className="mt-1 text-muted-foreground">
                  Delivery: {action.deliveryStatus.toLowerCase()}
                  {action.deliveryProvider
                    ? ` via ${action.deliveryProvider.toLowerCase()}`
                    : ""}
                </p>
              )}
              {action.deliveryErrorMessage && (
                <p className="mt-1 whitespace-normal text-rose-600">
                  {action.deliveryErrorMessage}
                </p>
              )}
            </div>
            <Badge variant="outline" className="self-start">
              {action.status.toLowerCase()}
            </Badge>
          </div>
        ))}
        {detail.actions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No recovery actions were scheduled.
          </p>
        )}
      </section>
      <Separator />
      <section className="space-y-3 p-5">
        <h3 className="text-sm font-medium">Attempts</h3>
        {detail.attempts.map((attempt) => (
          <div
            key={attempt.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {attempt.type.replaceAll("_", " ").toLowerCase()}
              </p>
              <p className="mt-1 text-muted-foreground">
                {formatRecoveryDate(attempt.occurredAt)}
              </p>
              {attempt.errorMessage && (
                <p className="mt-1 whitespace-normal text-rose-600">
                  {attempt.errorMessage}
                </p>
              )}
            </div>
            <Badge variant="outline" className="self-start">
              {attempt.status.toLowerCase()}
            </Badge>
          </div>
        ))}
        {detail.attempts.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No attempts have been recorded.
          </p>
        )}
      </section>
    </div>
  );
}
