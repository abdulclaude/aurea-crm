import { NodeType } from "@/db/enums";
import {
  formAutomationConfigSchema,
  type FormAutomationConfig,
} from "@/features/forms-builder/lib/form-automation-config";
import {
  formCrmResolutionConfigSchema,
  type FormCrmResolutionConfig,
} from "@/features/forms-builder/lib/form-crm-resolution";
import { formSubmittedTriggerConfigSchema } from "@/features/workflows/lib/studio-trigger-config";

type ReadinessNode = {
  id: string;
  type: NodeType;
  data: unknown;
};

type ReadinessConnection = {
  fromNodeId: string;
  toNodeId: string;
};

export type WorkflowReadinessForm = {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  crmResolutionConfig: unknown;
  automationConfig: unknown;
  fields: Array<{
    id: string;
    label: string;
    type: string;
    required: boolean;
  }>;
};

type TriggerRequirements = {
  formId: string | null;
  triggerNodeId: string;
  requiresClient: boolean;
  requiresEmail: boolean;
  requiresPhone: boolean;
  requiresEmailMarketingConsent: boolean;
  requiresSmsMarketingConsent: boolean;
  emailConsentGateEnabled: boolean;
  smsConsentGateEnabled: boolean;
};

export function getWorkflowFormReadinessIssues(input: {
  nodes: readonly ReadinessNode[];
  connections: readonly ReadinessConnection[];
  forms: readonly WorkflowReadinessForm[];
}): string[] {
  const formsById = new Map(input.forms.map((item) => [item.id, item]));
  const issues: string[] = [];

  for (const requirements of getTriggerRequirements(
    input.nodes,
    input.connections,
  )) {
    if (!requirements.formId) {
      if (
        requirements.requiresClient ||
        requirements.requiresEmailMarketingConsent ||
        requirements.requiresSmsMarketingConsent
      ) {
        issues.push(
          "Choose a specific form for every form trigger that uses a member or marketing permission.",
        );
      }
      continue;
    }

    const selectedForm = formsById.get(requirements.formId);
    if (!selectedForm) {
      issues.push(
        "Reconnect every form trigger to a form in this workflow workspace.",
      );
      continue;
    }
    if (selectedForm.status !== "PUBLISHED") {
      issues.push(`Publish "${selectedForm.name}" before activating this workflow.`);
    }

    const fieldsById = new Map(
      selectedForm.fields.map((field) => [field.id, field]),
    );
    const crm = formCrmResolutionConfigSchema.safeParse(
      selectedForm.crmResolutionConfig,
    );
    const automation = formAutomationConfigSchema.safeParse(
      selectedForm.automationConfig,
    );

    if (requirements.requiresClient) {
      validateClientResolution(issues, selectedForm.name, fieldsById, crm);
    }
    if (requirements.requiresEmail) {
      validateChannelField({
        issues,
        formName: selectedForm.name,
        fieldsById,
        crm: crm.success ? crm.data : null,
        fieldId: crm.success ? crm.data.emailFieldId : null,
        expectedType: "EMAIL",
        channelLabel: "email",
      });
    }
    if (requirements.requiresPhone) {
      validateChannelField({
        issues,
        formName: selectedForm.name,
        fieldsById,
        crm: crm.success ? crm.data : null,
        fieldId: crm.success ? crm.data.phoneFieldId : null,
        expectedType: "PHONE",
        channelLabel: "phone",
      });
    }
    if (
      requirements.requiresEmailMarketingConsent &&
      !requirements.emailConsentGateEnabled
    ) {
      issues.push(
        "Turn on email marketing permission in the form trigger before activation.",
      );
    }
    if (
      requirements.requiresSmsMarketingConsent &&
      !requirements.smsConsentGateEnabled
    ) {
      issues.push(
        "Turn on SMS marketing permission in the form trigger before activation.",
      );
    }
    if (
      requirements.requiresEmailMarketingConsent ||
      requirements.emailConsentGateEnabled
    ) {
      validateConsentField(
        issues,
        selectedForm.name,
        fieldsById,
        automation.success
          ? automation.data.emailMarketingConsentFieldId
          : null,
        "email marketing",
      );
    }
    if (
      requirements.requiresSmsMarketingConsent ||
      requirements.smsConsentGateEnabled
    ) {
      validateConsentField(
        issues,
        selectedForm.name,
        fieldsById,
        automation.success
          ? automation.data.smsMarketingConsentFieldId
          : null,
        "SMS marketing",
      );
    }
  }

  return [...new Set(issues)];
}

function getTriggerRequirements(
  nodes: readonly ReadinessNode[],
  connections: readonly ReadinessConnection[],
): TriggerRequirements[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, string[]>();
  for (const connection of connections) {
    const targets = outgoing.get(connection.fromNodeId) ?? [];
    targets.push(connection.toNodeId);
    outgoing.set(connection.fromNodeId, targets);
  }

  return nodes.flatMap((trigger) => {
    if (trigger.type !== NodeType.FORM_SUBMITTED_TRIGGER) return [];
    const config = formSubmittedTriggerConfigSchema.safeParse(trigger.data);
    if (!config.success) {
      return [
        {
          formId: null,
          triggerNodeId: trigger.id,
          requiresClient: true,
          requiresEmail: false,
          requiresPhone: false,
          requiresEmailMarketingConsent: false,
          requiresSmsMarketingConsent: false,
          emailConsentGateEnabled: false,
          smsConsentGateEnabled: false,
        },
      ];
    }
    const downstream = downstreamNodes(trigger.id, outgoing, nodesById);
    const emailNodes = downstream.filter(
      (node) => node.type === NodeType.SEND_EMAIL && hasClientRecipient(node.data),
    );
    const smsNodes = downstream.filter(
      (node) => node.type === NodeType.SEND_SMS && hasClientRecipient(node.data),
    );
    return [
      {
        formId: config.data.formId ?? null,
        triggerNodeId: trigger.id,
        requiresClient: downstream.some((node) => hasClientRecipient(node.data)),
        requiresEmail: emailNodes.length > 0,
        requiresPhone: smsNodes.length > 0,
        requiresEmailMarketingConsent: emailNodes.some((node) =>
          hasPurpose(node.data, "MARKETING"),
        ),
        requiresSmsMarketingConsent: smsNodes.some((node) =>
          hasPurpose(node.data, "MARKETING"),
        ),
        emailConsentGateEnabled:
          config.data.requireEmailMarketingConsent,
        smsConsentGateEnabled: config.data.requireSmsMarketingConsent,
      },
    ];
  });
}

function downstreamNodes(
  triggerId: string,
  outgoing: ReadonlyMap<string, readonly string[]>,
  nodesById: ReadonlyMap<string, ReadinessNode>,
): ReadinessNode[] {
  const visited = new Set<string>();
  const pending = [...(outgoing.get(triggerId) ?? [])];
  while (pending.length > 0) {
    const nodeId = pending.pop();
    if (!nodeId || visited.has(nodeId)) continue;
    visited.add(nodeId);
    pending.push(...(outgoing.get(nodeId) ?? []));
  }
  return [...visited]
    .map((nodeId) => nodesById.get(nodeId))
    .filter((node): node is ReadinessNode => Boolean(node));
}

function hasClientRecipient(value: unknown): boolean {
  return readText(value, "clientId") !== null;
}

function hasPurpose(value: unknown, purpose: string): boolean {
  return readText(value, "purpose") === purpose;
}

function readText(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field.trim() : null;
}

function validateClientResolution(
  issues: string[],
  formName: string,
  fieldsById: ReadonlyMap<string, WorkflowReadinessForm["fields"][number]>,
  parsed: ReturnType<typeof formCrmResolutionConfigSchema.safeParse>,
): void {
  if (!parsed.success || !parsed.data.enabled) {
    issues.push(
      `Enable member profile mapping on "${formName}" before activating this workflow.`,
    );
    return;
  }
  const config: FormCrmResolutionConfig = parsed.data;
  const expectedTypes = new Map<string | null, string>([
    [config.emailFieldId, "EMAIL"],
    [config.phoneFieldId, "PHONE"],
    [config.fullNameFieldId, "SHORT_TEXT"],
    [config.firstNameFieldId, "SHORT_TEXT"],
    [config.lastNameFieldId, "SHORT_TEXT"],
  ]);
  for (const [fieldId, expectedType] of expectedTypes) {
    if (!fieldId) continue;
    if (fieldsById.get(fieldId)?.type !== expectedType) {
      issues.push(
        `Repair the member profile field mappings on "${formName}" before activation.`,
      );
      return;
    }
  }
}

function validateChannelField(input: {
  issues: string[];
  formName: string;
  fieldsById: ReadonlyMap<string, WorkflowReadinessForm["fields"][number]>;
  crm: FormCrmResolutionConfig | null;
  fieldId: string | null;
  expectedType: "EMAIL" | "PHONE";
  channelLabel: "email" | "phone";
}): void {
  const field = input.fieldId ? input.fieldsById.get(input.fieldId) : null;
  if (!input.crm || !input.crm.enabled || field?.type !== input.expectedType) {
    input.issues.push(
      `Map a valid ${input.channelLabel} field on "${input.formName}" before activation.`,
    );
    return;
  }
  if (!field.required) {
    input.issues.push(
      `Make the mapped ${input.channelLabel} field required on "${input.formName}" before activation.`,
    );
  }
}

function validateConsentField(
  issues: string[],
  formName: string,
  fieldsById: ReadonlyMap<string, WorkflowReadinessForm["fields"][number]>,
  fieldId: FormAutomationConfig["emailMarketingConsentFieldId"],
  label: string,
): void {
  if (!fieldId || fieldsById.get(fieldId)?.type !== "CHECKBOX") {
    issues.push(
      `Map a distinct ${label} checkbox on "${formName}" before activation.`,
    );
  }
}
