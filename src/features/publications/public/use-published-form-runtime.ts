"use client";

import { useState } from "react";

import type { PublishedFormSource } from "@/features/forms-builder/lib/public-form-contract";
import {
  validatePublicFormFields,
  validatePublicFormValues,
} from "@/features/forms-builder/lib/public-form-validation";

export type AvailablePublishedFormSource = PublishedFormSource & {
  form: NonNullable<PublishedFormSource["form"]>;
};

export type PublishedFormSubmissionState =
  | { status: "IDLE" }
  | { status: "SUBMITTING" }
  | { status: "RETRYABLE_ERROR"; message: string }
  | { status: "TERMINAL_ERROR"; message: string }
  | { status: "SUCCESS" };

export function usePublishedFormRuntime(input: {
  source: AvailablePublishedFormSource;
  targetId: string;
  versionId: string;
  token: string;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initialValues(input.source),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [responseConsent, setResponseConsentValue] = useState(false);
  const [responseConsentError, setResponseConsentError] = useState(false);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<PublishedFormSubmissionState>({
    status: "IDLE",
  });
  const [idempotencyKey] = useState(() => createIdempotencyKey());

  const showFieldErrors = (errors: Record<string, string>) => {
    setFieldErrors(errors);
    const firstFieldId = Object.keys(errors)[0];
    if (!firstFieldId) return;
    const invalidStep = input.source.steps.findIndex((step) =>
      step.fields.some((field) => field.id === firstFieldId),
    );
    if (input.source.form.isMultiStep && invalidStep >= 0) {
      setStepIndex(invalidStep);
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .getElementById(`publication-form-field-${firstFieldId}`)
          ?.focus();
      });
    });
  };

  const advanceStep = () => {
    const activeStep = input.source.steps[stepIndex];
    if (!activeStep) return;
    const errors = validatePublicFormFields(activeStep.fields, values);
    setFormErrors([]);
    showFieldErrors(errors);
    if (Object.keys(errors).length === 0) {
      setStepIndex((current) =>
        Math.min(current + 1, input.source.steps.length - 1),
      );
    }
  };

  const submit = async () => {
    const validation = validatePublicFormValues(input.source, values);
    showFieldErrors(validation.fieldErrors);
    setFormErrors(validation.formErrors);
    setResponseConsentError(!responseConsent);
    if (!validation.success || !responseConsent) {
      if (validation.success && !responseConsent) {
        window.requestAnimationFrame(() => {
          document.getElementById("publication-form-response-consent")?.focus();
        });
      }
      return;
    }

    setState({ status: "SUBMITTING" });
    try {
      const response = await fetch(
        `/api/publications/forms/${encodeURIComponent(input.targetId)}/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            token: input.token,
            versionId: input.versionId,
            values,
            responseConsent: true,
            website,
          }),
        },
      );
      const responseBody = readSubmissionErrorBody(await readJson(response));
      if (response.ok) {
        setState({ status: "SUCCESS" });
        return;
      }
      if (response.status === 422) {
        showFieldErrors(responseBody.fieldErrors ?? {});
        setFormErrors(responseBody.formErrors ?? []);
        setState({ status: "IDLE" });
        return;
      }
      const message =
        responseBody.error ?? "The response could not be saved. Try again.";
      setState(
        response.status >= 500
          ? { status: "RETRYABLE_ERROR", message }
          : { status: "TERMINAL_ERROR", message },
      );
    } catch {
      setState({
        status: "RETRYABLE_ERROR",
        message: "The connection was interrupted. Retry this response.",
      });
    }
  };

  return {
    advanceStep,
    back: () => {
      setStepIndex((current) => Math.max(0, current - 1));
      setFieldErrors({});
      setFormErrors([]);
    },
    fieldErrors,
    formErrors,
    responseConsent,
    responseConsentError,
    setResponseConsent: (checked: boolean) => {
      setResponseConsentValue(checked);
      setResponseConsentError(false);
    },
    setWebsite,
    state,
    stepIndex,
    submit,
    updateValue: (fieldId: string, value: unknown) => {
      setValues((current) => ({ ...current, [fieldId]: value }));
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[fieldId];
        return next;
      });
    },
    values,
    website,
  };
}

function initialValues(source: PublishedFormSource): Record<string, unknown> {
  return Object.fromEntries(
    source.steps.flatMap((step) =>
      step.fields.map((field) => {
        if (field.type === "CHECKBOX") {
          return [field.id, field.defaultValue === "true"];
        }
        if (field.type === "MULTI_SELECT") {
          return [
            field.id,
            field.defaultValue
              ? field.defaultValue.split(",").map((value) => value.trim())
              : [],
          ];
        }
        if (field.type === "SLIDER") {
          return [
            field.id,
            field.defaultValue ?? String(field.validation.min ?? 0),
          ];
        }
        return [field.id, field.defaultValue ?? ""];
      }),
    ),
  );
}

function createIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readSubmissionErrorBody(value: unknown): {
  error?: string;
  fieldErrors?: Record<string, string>;
  formErrors?: string[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const fieldErrors =
    record.fieldErrors &&
    typeof record.fieldErrors === "object" &&
    !Array.isArray(record.fieldErrors)
      ? Object.fromEntries(
          Object.entries(record.fieldErrors).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : undefined;
  return {
    error: typeof record.error === "string" ? record.error : undefined,
    fieldErrors,
    formErrors: Array.isArray(record.formErrors)
      ? record.formErrors.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : undefined,
  };
}
