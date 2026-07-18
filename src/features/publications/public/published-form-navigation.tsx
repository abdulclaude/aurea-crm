import { ChevronLeft, ChevronRight, Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PublishedFormSubmissionState } from "@/features/publications/public/use-published-form-runtime";

export function PublishedFormNavigation({
  finalStep,
  isMultiStep,
  stepIndex,
  state,
  onBack,
  onRetry,
}: {
  finalStep: boolean;
  isMultiStep: boolean;
  stepIndex: number;
  state: PublishedFormSubmissionState["status"];
  onBack: () => void;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      {isMultiStep && stepIndex > 0 && state !== "RETRYABLE_ERROR" ? (
        <Button
          type="button"
          variant="outline"
          disabled={state === "SUBMITTING"}
          onClick={onBack}
        >
          <ChevronLeft aria-hidden="true" />
          Back
        </Button>
      ) : null}
      {state === "RETRYABLE_ERROR" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCcw aria-hidden="true" />
            Reload form
          </Button>
          <Button
            type="button"
            onClick={onRetry}
            className="bg-[var(--publication-primary,#2563eb)] text-[var(--publication-button-text,#fff)] hover:opacity-90"
          >
            Retry response
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : state === "TERMINAL_ERROR" ? (
        <Button type="button" onClick={() => window.location.reload()}>
          <RefreshCcw aria-hidden="true" />
          Reload form
        </Button>
      ) : finalStep ? (
        <Button
          type="submit"
          disabled={state === "SUBMITTING"}
          className="bg-[var(--publication-primary,#2563eb)] text-[var(--publication-button-text,#fff)] hover:opacity-90"
        >
          {state === "SUBMITTING" ? (
            <Loader2
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : null}
          {state === "SUBMITTING" ? "Submitting" : "Submit response"}
        </Button>
      ) : (
        <Button
          type="submit"
          className="bg-[var(--publication-primary,#2563eb)] text-[var(--publication-button-text,#fff)] hover:opacity-90"
        >
          Continue
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
