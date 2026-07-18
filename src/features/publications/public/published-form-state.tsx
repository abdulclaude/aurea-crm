import { CheckCircle2, ChevronRight } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function PublishedFormSuccess({
  message,
  redirectUrl,
}: {
  message: string;
  redirectUrl: string | null;
}): React.JSX.Element {
  return (
    <section className="py-8 text-center" aria-live="polite">
      <CheckCircle2
        className="mx-auto size-10 text-emerald-600"
        aria-hidden="true"
      />
      <h2 className="mt-4 text-lg font-semibold">Response received</h2>
      <p className="mx-auto mt-2 max-w-lg break-words text-sm opacity-75">
        {message}
      </p>
      {redirectUrl ? (
        <Button
          asChild
          className="mt-6 bg-[var(--publication-primary,#2563eb)] text-[var(--publication-button-text,#fff)] hover:opacity-90"
        >
          <a href={redirectUrl} rel="noreferrer">
            Continue
            <ChevronRight aria-hidden="true" />
          </a>
        </Button>
      ) : null}
    </section>
  );
}

export function UnavailablePublishedForm(): React.JSX.Element {
  return (
    <Alert className="border-amber-500/30 bg-amber-50 text-amber-950">
      <AlertTitle>Responses are unavailable</AlertTitle>
      <AlertDescription className="text-amber-900/80">
        This form cannot accept responses right now. Refresh the page or try
        again later.
      </AlertDescription>
    </Alert>
  );
}
