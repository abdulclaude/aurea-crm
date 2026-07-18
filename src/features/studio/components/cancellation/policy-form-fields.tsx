import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type CancellationPolicyFormState = {
  name: string;
  lateCancelWindow: string;
  noShowFeeAmount: string;
  lateCancelFee: string;
  currency: string;
  deductCredits: boolean;
  creditsDeducted: string;
  chargeCard: boolean;
  sendNotification: boolean;
  isDefault: boolean;
};

export function PolicyFormFields({
  value,
  onChange,
}: {
  value: CancellationPolicyFormState;
  onChange: (value: CancellationPolicyFormState) => void;
}) {
  const update = <K extends keyof CancellationPolicyFormState>(
    key: K,
    next: CancellationPolicyFormState[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <Label htmlFor="policy-name">Name</Label>
        <Input
          id="policy-name"
          value={value.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="Standard cancellation policy"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="late-window">Late cancellation window</Label>
          <div className="flex items-center gap-2">
            <Input
              id="late-window"
              inputMode="numeric"
              value={value.lateCancelWindow}
              onChange={(event) =>
                update("lateCancelWindow", event.target.value)
              }
            />
            <span className="text-xs text-muted-foreground">hours</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="policy-currency">Currency</Label>
          <Select
            value={value.currency}
            onValueChange={(next) => update("currency", next)}
          >
            <SelectTrigger id="policy-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["GBP", "USD", "EUR", "AUD", "CAD"].map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="late-fee">Late cancellation fee</Label>
          <Input
            id="late-fee"
            inputMode="decimal"
            value={value.lateCancelFee}
            onChange={(event) => update("lateCancelFee", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="no-show-fee">No-show fee</Label>
          <Input
            id="no-show-fee"
            inputMode="decimal"
            value={value.noShowFeeAmount}
            onChange={(event) => update("noShowFeeAmount", event.target.value)}
          />
        </div>
      </div>
      <div className="divide-y rounded-md border">
        <ToggleRow
          label="Deduct class credits"
          description="Record the exact credit allocation so a waiver can restore it."
          checked={value.deductCredits}
          onCheckedChange={(checked) => update("deductCredits", checked)}
        >
          {value.deductCredits ? (
            <Input
              aria-label="Credits deducted"
              className="h-8 w-20"
              inputMode="numeric"
              value={value.creditsDeducted}
              onChange={(event) =>
                update("creditsDeducted", event.target.value)
              }
            />
          ) : null}
        </ToggleRow>
        <ToggleRow
          label="Collect saved card automatically"
          description="Uses the Stripe Express account connected to this workspace."
          checked={value.chargeCard}
          onCheckedChange={(checked) => update("chargeCard", checked)}
        />
        <ToggleRow
          label="Run member notification workflows"
          description="Dispatches the configured no-show or cancellation automation."
          checked={value.sendNotification}
          onCheckedChange={(checked) => update("sendNotification", checked)}
        />
        <ToggleRow
          label="Default policy"
          description="Used when a class does not have a specific policy."
          checked={value.isDefault}
          onCheckedChange={(checked) => update("isDefault", checked)}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        <Switch
          aria-label={label}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
    </div>
  );
}
