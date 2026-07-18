import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { PublishedFormSubmissionState } from "@/features/publications/public/use-published-form-runtime";

export function PublishedFormAlerts({
  formErrors,
  state,
}: {
  formErrors: string[];
  state: PublishedFormSubmissionState;
}): React.JSX.Element {
  const stateError =
    state.status === "RETRYABLE_ERROR" || state.status === "TERMINAL_ERROR"
      ? state.message
      : null;
  return (
    <>
      {formErrors.length ? (
        <Alert variant="destructive" className="mt-6" role="alert">
          <AlertTitle>Check this response</AlertTitle>
          <AlertDescription>{formErrors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}
      {stateError ? (
        <Alert variant="destructive" className="mt-6" role="alert">
          <AlertTitle>Response not confirmed</AlertTitle>
          <AlertDescription>{stateError}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
