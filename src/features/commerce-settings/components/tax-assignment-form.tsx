import { Save } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { commerceLineTypes } from "@/features/commerce-settings/contracts";

import type {
  CommerceSettings,
  CommerceSettingsSubmit,
} from "./commerce-settings-types";

type LineType = (typeof commerceLineTypes)[number];

export function TaxAssignmentForm({
  activeRates,
  assignTaxRate,
  canManage,
  isPending,
  submit,
}: {
  activeRates: CommerceSettings["taxRates"];
  assignTaxRate: (input: {
    id: null;
    subjectType: "LINE_TYPE";
    lineType: LineType;
    productId: null;
    taxRateId: string | null;
  }) => Promise<unknown>;
  canManage: boolean;
  isPending: boolean;
  submit: CommerceSettingsSubmit;
}): React.JSX.Element {
  const [lineType, setLineType] = React.useState<LineType>("MEMBERSHIP");
  const [taxRateId, setTaxRateId] = React.useState<string>("none");

  return (
    <form
      className="grid gap-2 md:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(
          () =>
            assignTaxRate({
              id: null,
              subjectType: "LINE_TYPE",
              lineType,
              productId: null,
              taxRateId: taxRateId === "none" ? null : taxRateId,
            }),
          "Tax assignment saved",
        );
      }}
    >
      <Select
        value={lineType}
        onValueChange={(value) => setLineType(value as LineType)}
      >
        <SelectTrigger aria-label="Commerce line type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {commerceLineTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={taxRateId} onValueChange={setTaxRateId}>
        <SelectTrigger aria-label="Assigned tax rate">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Exempt</SelectItem>
          {activeRates.map((rate) => (
            <SelectItem key={rate.id} value={rate.id}>
              {rate.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={!canManage || isPending}>
        <Save />
        Save line assignment
      </Button>
    </form>
  );
}
