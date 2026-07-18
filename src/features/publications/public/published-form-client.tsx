"use client";

import type { PublishedFormSource } from "@/features/forms-builder/lib/public-form-contract";
import { PublishedFormAlerts } from "@/features/publications/public/published-form-alerts";
import { PublishedFormField } from "@/features/publications/public/published-form-field";
import { PublishedFormHoneypot } from "@/features/publications/public/published-form-honeypot";
import { PublishedFormNavigation } from "@/features/publications/public/published-form-navigation";
import { PublishedFormProgress } from "@/features/publications/public/published-form-progress";
import { PublishedFormResponseConsent } from "@/features/publications/public/published-form-response-consent";
import {
  PublishedFormSuccess,
  UnavailablePublishedForm,
} from "@/features/publications/public/published-form-state";
import {
  type AvailablePublishedFormSource,
  usePublishedFormRuntime,
} from "@/features/publications/public/use-published-form-runtime";

export function PublishedFormClient(props: {
  source: PublishedFormSource;
  targetId: string;
  versionId: string;
  token: string | null;
  responseConsentLabel: string;
  privacyPolicyUrl: string;
}): React.JSX.Element {
  if (!props.source.form || !props.token) return <UnavailablePublishedForm />;
  return (
    <PublishedFormRuntime
      {...props}
      source={props.source as AvailablePublishedFormSource}
      token={props.token}
    />
  );
}

function PublishedFormRuntime({
  source,
  targetId,
  versionId,
  token,
  responseConsentLabel,
  privacyPolicyUrl,
}: {
  source: AvailablePublishedFormSource;
  targetId: string;
  versionId: string;
  token: string;
  responseConsentLabel: string;
  privacyPolicyUrl: string;
}): React.JSX.Element {
  const runtime = usePublishedFormRuntime({ source, targetId, versionId, token });
  const { form, steps } = source;
  const isMultiStep = form.isMultiStep && steps.length > 1;
  const activeStep = steps[Math.min(runtime.stepIndex, steps.length - 1)];
  const displayedSteps = isMultiStep ? (activeStep ? [activeStep] : []) : steps;
  const finalStep = !isMultiStep || runtime.stepIndex === steps.length - 1;
  const formLocked =
    runtime.state.status === "SUBMITTING" ||
    runtime.state.status === "RETRYABLE_ERROR";

  if (runtime.state.status === "SUCCESS") {
    return (
      <PublishedFormSuccess
        message={form.successMessage}
        redirectUrl={form.redirectUrl}
      />
    );
  }

  return (
    <form
      aria-label={form.name}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (finalStep) void runtime.submit();
        else runtime.advanceStep();
      }}
    >
      {isMultiStep && form.showProgress ? (
        <PublishedFormProgress
          current={runtime.stepIndex + 1}
          total={steps.length}
          variant={form.progressDisplay}
        />
      ) : null}
      <div className="space-y-8">
        {displayedSteps.map((step) => (
          <section
            key={step.id}
            aria-labelledby={`publication-form-step-${step.id}`}
            className="space-y-5"
          >
            <h2
              id={`publication-form-step-${step.id}`}
              className="break-words text-base font-semibold"
            >
              {form.isMultiStep ? step.name : "Your details"}
            </h2>
            <div className="space-y-5">
              {step.fields.map((field) => (
                <PublishedFormField
                  key={field.id}
                  field={field}
                  value={runtime.values[field.id]}
                  error={runtime.fieldErrors[field.id]}
                  disabled={formLocked}
                  onValueChange={(value) =>
                    runtime.updateValue(field.id, value)
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      <PublishedFormHoneypot
        value={runtime.website}
        onChange={runtime.setWebsite}
      />
      {finalStep ? (
        <PublishedFormResponseConsent
          checked={runtime.responseConsent}
          disabled={formLocked}
          error={runtime.responseConsentError}
          label={responseConsentLabel}
          privacyPolicyUrl={privacyPolicyUrl}
          onChange={runtime.setResponseConsent}
        />
      ) : null}
      <PublishedFormAlerts
        formErrors={runtime.formErrors}
        state={runtime.state}
      />
      <PublishedFormNavigation
        finalStep={finalStep}
        isMultiStep={isMultiStep}
        stepIndex={runtime.stepIndex}
        state={runtime.state.status}
        onBack={runtime.back}
        onRetry={() => void runtime.submit()}
      />
    </form>
  );
}
