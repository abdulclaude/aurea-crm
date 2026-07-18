import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PUBLIC_FORM_CONTROL_BY_FIELD_TYPE,
  publicFormFieldTypeSchema,
  publishedFormSourceSchema,
} from "@/features/forms-builder/lib/public-form-contract";
import { buildPublicFormSnapshot } from "@/features/forms-builder/lib/public-form-snapshot";
import { validatePublicFormValues } from "@/features/forms-builder/lib/public-form-validation";

const form = {
  id: "form-1",
  name: "Contact us",
  description: "Tell us how we can help.",
  isMultiStep: false,
  showProgress: true,
  successMessage: "Thank you.",
  redirectUrl: null,
  locationId: "location-1",
  updatedAt: "2026-07-14T12:00:00.000Z",
};

const step = {
  id: "step-1",
  name: "Contact details",
  order: 0,
  showConditions: null,
};

function field(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "field-1",
    stepId: "step-1",
    type: "SHORT_TEXT",
    label: "Name",
    placeholder: null,
    helpText: null,
    required: true,
    validation: null,
    options: null,
    defaultValue: null,
    showConditions: null,
    order: 0,
    styles: null,
    ...overrides,
  };
}

describe("public form snapshot contract", () => {
  it("maps every supported field type to an explicit public control", () => {
    assert.deepEqual(
      Object.keys(PUBLIC_FORM_CONTROL_BY_FIELD_TYPE).sort(),
      [...publicFormFieldTypeSchema.options].sort(),
    );
  });

  it("normalizes a single-step contact form into a versioned definition", () => {
    const result = buildPublicFormSnapshot({
      form,
      steps: [step],
      fields: [
        field({}),
        field({
          id: "field-2",
          type: "EMAIL",
          label: "Email",
          validation: { maxLength: 200 },
          order: 1,
        }),
      ],
    });

    assert.deepEqual(result.errors, []);
    assert.equal(result.source.definitionSchemaVersion, 1);
    assert.equal(result.source.steps[0]?.fields.length, 2);
    assert.equal(result.source.form?.progressDisplay, "BAR");
    assert.equal(result.source.form?.buttonTextColor, "#ffffff");
    assert.equal(publishedFormSourceSchema.safeParse(result.source).success, true);
  });

  it("uses form trigger workflows instead of an invisible direct workflow", () => {
    const result = buildPublicFormSnapshot({
      form: { ...form, workflowId: "legacy-direct-workflow" },
      steps: [step],
      fields: [field({})],
    });

    assert.deepEqual(result.errors, []);
    assert.equal(result.source.form?.workflowId, null);
  });

  it("stores validated form colors in the immutable source snapshot", () => {
    const result = buildPublicFormSnapshot({
      form: {
        ...form,
        backgroundColor: "#f7fee7",
        textColor: "#1a2e05",
        primaryColor: "#15803d",
        buttonTextColor: "#f7fee7",
      },
      steps: [step],
      fields: [field({})],
    });

    assert.deepEqual(result.errors, []);
    assert.equal(result.source.form?.backgroundColor, "#f7fee7");
    assert.equal(result.source.form?.textColor, "#1a2e05");
    assert.equal(result.source.form?.primaryColor, "#15803d");
    assert.equal(result.source.form?.buttonTextColor, "#f7fee7");
  });

  it("stores the selected multi-step progress display", () => {
    for (const progressDisplay of ["RING", "STEPS", "BAR"] as const) {
      const result = buildPublicFormSnapshot({
        form: { ...form, isMultiStep: true, progressDisplay },
        steps: [
          step,
          { ...step, id: "step-2", name: "Preferences", order: 1 },
        ],
        fields: [
          field({}),
          field({ id: "field-2", stepId: "step-2", order: 0 }),
        ],
      });

      assert.deepEqual(result.errors, []);
      assert.equal(result.source.form?.progressDisplay, progressDisplay);
    }
  });

  it("blocks malformed form colors from publication", () => {
    const result = buildPublicFormSnapshot({
      form: { ...form, primaryColor: "red;position:fixed" },
      steps: [step],
      fields: [field({})],
    });

    assert.match(result.errors.join(" "), /settings are invalid/i);
  });

  it("blocks an unknown progress display from publication", () => {
    const result = buildPublicFormSnapshot({
      form: { ...form, progressDisplay: "SPINNER" },
      steps: [step],
      fields: [field({})],
    });

    assert.match(result.errors.join(" "), /definition is invalid/i);
  });

  it("supports a materially different numeric and choice definition", () => {
    const result = buildPublicFormSnapshot({
      form: { ...form, id: "form-2", name: "Experience survey", isMultiStep: true },
      steps: [step, { ...step, id: "step-2", name: "Preferences", order: 1 }],
      fields: [
        field({
          id: "field-rating",
          type: "RATING",
          label: "Rating",
          validation: { min: 1, max: 5 },
        }),
        field({
          id: "field-choice",
          stepId: "step-2",
          type: "RADIO",
          label: "Preferred time",
          options: ["Morning", "Evening"],
        }),
      ],
    });

    assert.deepEqual(result.errors, []);
    assert.equal(result.source.steps.length, 2);
    assert.equal(result.source.steps[1]?.fields[0]?.type, "RADIO");
  });

  it("blocks provider-bound and unsupported conditional fields explicitly", () => {
    const result = buildPublicFormSnapshot({
      form,
      steps: [step],
      fields: [
        field({ type: "PAYMENT", label: "Deposit" }),
        field({
          id: "field-2",
          label: "Conditional detail",
          showConditions: { fieldId: "field-1", equals: "Yes" },
        }),
      ],
    });

    assert.match(result.errors.join(" "), /owned Stripe connection/i);
    assert.match(result.errors.join(" "), /conditional visibility/i);
    assert.match(result.errors.join(" "), /supported form field/i);
  });

  it("rejects choice fields without a typed option set", () => {
    const result = buildPublicFormSnapshot({
      form,
      steps: [step],
      fields: [field({ type: "SELECT", label: "Service" })],
    });

    assert.match(result.errors.join(" "), /invalid public definition/i);
  });

  it("returns a publish blocker instead of throwing for malformed structure", () => {
    const result = buildPublicFormSnapshot({
      form,
      steps: [{ ...step, name: "", order: -1 }],
      fields: [field({})],
    });

    assert.equal(result.source.form, null);
    assert.match(result.errors.join(" "), /structure is invalid/i);
  });
});

describe("public form server validation", () => {
  it("validates values against the exact immutable definition", () => {
    const snapshot = buildPublicFormSnapshot({
      form,
      steps: [step],
      fields: [
        field({ validation: { minLength: 2 } }),
        field({
          id: "field-email",
          type: "EMAIL",
          label: "Email",
          required: true,
        }),
        field({
          id: "field-choice",
          type: "SELECT",
          label: "Service",
          options: ["Consultation", "Class"],
        }),
      ],
    }).source;

    const invalid = validatePublicFormValues(snapshot, {
      "field-1": "A",
      "field-email": "not-an-email",
      "field-choice": "Injected",
    });
    assert.equal(invalid.success, false);
    assert.match(invalid.fieldErrors["field-1"] ?? "", /at least 2/i);
    assert.match(invalid.fieldErrors["field-email"] ?? "", /valid email/i);
    assert.match(invalid.fieldErrors["field-choice"] ?? "", /invalid option/i);

    const valid = validatePublicFormValues(snapshot, {
      "field-1": "Ada",
      "field-email": "ada@example.com",
      "field-choice": "Class",
    });
    assert.deepEqual(valid, {
      success: true,
      fieldErrors: {},
      formErrors: [],
    });
  });

  it("rejects client-supplied fields outside the published version", () => {
    const snapshot = buildPublicFormSnapshot({
      form,
      steps: [step],
      fields: [field({ required: false })],
    }).source;
    const result = validatePublicFormValues(snapshot, {
      "field-1": "Ada",
      injected: "admin",
    });

    assert.equal(result.success, false);
    assert.match(result.formErrors[0] ?? "", /outside this published definition/i);
  });
});
