import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StaffCompensationTemplateCard(props: {
  name: string;
  hourlyRate: string;
  currency: string;
  canManage: boolean;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onHourlyRateChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onCreate: () => Promise<void>;
}): React.JSX.Element {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">New compensation template</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="compensation-template-name" className="text-xs">
            Name
          </Label>
          <Input
            id="compensation-template-name"
            value={props.name}
            maxLength={120}
            disabled={props.disabled}
            onChange={(event) => props.onNameChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="compensation-hourly-rate" className="text-xs">
            Hourly rate
          </Label>
          <Input
            id="compensation-hourly-rate"
            inputMode="decimal"
            value={props.hourlyRate}
            disabled={props.disabled}
            onChange={(event) => props.onHourlyRateChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="compensation-currency" className="text-xs">
            Currency
          </Label>
          <Input
            id="compensation-currency"
            value={props.currency}
            maxLength={3}
            disabled={props.disabled}
            onChange={(event) =>
              props.onCurrencyChange(event.target.value.toUpperCase())
            }
          />
        </div>
      </CardContent>
      {props.canManage ? (
        <CardFooter className="justify-end border-t">
          <Button
            type="button"
            onClick={props.onCreate}
            disabled={props.disabled || !props.name.trim() || !props.hourlyRate}
          >
            Create template
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
