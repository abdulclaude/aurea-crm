import type { VariableItem } from "@/components/tiptap/variable-suggestion";

import { inferValueType, type IfElseValueType } from "./schema";

export type ConditionVariableOption = {
  label: string;
  operand: string;
  path: string;
  valueType: IfElseValueType;
};

export function buildConditionVariableOptions(
  variables: VariableItem[],
  customFields: string[] = [],
  pricingOptions: Array<{ id: string; name: string }> = [],
): ConditionVariableOption[] {
  const options: ConditionVariableOption[] = [
    ...LIVE_CLIENT_OPTIONS,
    ...customFields.map((field) =>
      option(
        `Member / Custom fields / ${humanizeLabel(field)}`,
        `system.client.customFields.${field}`,
        "text",
      ),
    ),
    ...pricingOptions
      .filter(({ id }) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id))
      .map(({ id, name }) =>
        option(
          `Pricing options / ${name} / Successful purchases`,
          `system.purchases.byPricingOption.${id}`,
          "number",
        ),
      ),
  ];

  const visit = (items: VariableItem[], parents: string[]): void => {
    for (const item of items) {
      const labels = [...parents, humanizeLabel(item.label)];
      if (item.type === "primitive" || !item.children?.length) {
        options.push({
          label: labels.join(" / "),
          operand: `{{${item.path}}}`,
          path: item.path,
          valueType: inferValueType(item.path),
        });
      }
      if (item.children?.length) visit(item.children, labels);
    }
  };

  visit(variables, []);
  return options;
}

const LIVE_CLIENT_OPTIONS: ConditionVariableOption[] = [
  option("Member / Name", "system.client.name", "text"),
  option("Member / Email", "system.client.email", "text"),
  option("Member / Phone", "system.client.phone", "text"),
  option("Member / Type", "system.client.type", "text"),
  option("Member / Lifecycle stage", "system.client.lifecycleStage", "text"),
  option("Member / Acquisition stage", "system.client.acquisitionStage", "text"),
  option("Member / Tags", "system.client.tags", "text"),
  option(
    "Member / Lifetime classes attended",
    "system.client.attendanceCount",
    "number",
  ),
  option("Member / Current streak", "system.client.currentStreak", "number"),
  option(
    "Reservations / Booked",
    "system.reservations.booked",
    "number",
  ),
  option(
    "Reservations / Cancelled",
    "system.reservations.cancelled",
    "number",
  ),
  option(
    "Reservations / Attended",
    "system.reservations.attended",
    "number",
  ),
  option(
    "Pricing options / Successful purchases",
    "system.purchases.successful",
    "number",
  ),
  option("Email / Delivered", "system.email.delivered", "number"),
  option("Email / Opened", "system.email.opened", "number"),
  option("Email / Clicked", "system.email.clicked", "number"),
  option("Email / Bounced", "system.email.bounced", "number"),
];

function option(
  label: string,
  path: string,
  valueType: IfElseValueType,
): ConditionVariableOption {
  return {
    label,
    operand: `{{${path}}}`,
    path,
    valueType,
  };
}

function humanizeLabel(label: string): string {
  return label
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}
