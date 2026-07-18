import { Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { commerceTaxRateKinds } from "@/features/commerce-settings/contracts";

import type { CommerceSettingsSubmit } from "./commerce-settings-types";

type TaxKind = (typeof commerceTaxRateKinds)[number];

export function TaxRateForm({
  createTaxRate,
  isPending,
  submit,
}: {
  createTaxRate: (input: {
    name: string;
    code: string;
    rateBasisPoints: number;
    kind: TaxKind;
    description: null;
  }) => Promise<unknown>;
  isPending: boolean;
  submit: CommerceSettingsSubmit;
}): React.JSX.Element {
  const [taxKind, setTaxKind] = React.useState<TaxKind>("EXCLUSIVE");

  return (
    <form
      className="grid gap-2 md:grid-cols-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const saved = await submit(
          () =>
            createTaxRate({
              name: String(data.get("name")),
              code: String(data.get("code")).toUpperCase(),
              rateBasisPoints: Number(data.get("rate")) * 100,
              kind: taxKind,
              description: null,
            }),
          "Tax rate created",
        );
        if (saved) form.reset();
      }}
    >
      <Label htmlFor="tax-rate-name" className="sr-only">
        Rate name
      </Label>
      <Input id="tax-rate-name" name="name" placeholder="Rate name" required />
      <Label htmlFor="tax-rate-code" className="sr-only">
        Tax code
      </Label>
      <Input
        id="tax-rate-code"
        name="code"
        placeholder="VAT_STANDARD"
        required
      />
      <Label htmlFor="tax-rate-percent" className="sr-only">
        Tax rate percent
      </Label>
      <Input
        id="tax-rate-percent"
        name="rate"
        type="number"
        min="0"
        max="100"
        step="0.01"
        placeholder="20"
        required
      />
      <Select
        value={taxKind}
        onValueChange={(value) => setTaxKind(value as TaxKind)}
      >
        <SelectTrigger aria-label="Tax calculation kind">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {commerceTaxRateKinds.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {kind}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={isPending}>
        <Plus />
        Add tax rate
      </Button>
    </form>
  );
}
