import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type BookingWindowFormState = {
  opensMinutesBeforeStart: string;
  closesMinutesBeforeStart: string;
  cancellationsCloseMinutesBeforeStart: string;
  blockClientCancellations: boolean;
};

export function BookingWindowFields(props: {
  value: BookingWindowFormState;
  disabled: boolean;
  onChange: (value: BookingWindowFormState) => void;
}) {
  const update = <K extends keyof BookingWindowFormState>(
    key: K,
    value: BookingWindowFormState[K],
  ) => props.onChange({ ...props.value, [key]: value });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <MinuteField
          id="booking-opens-minutes"
          label="Booking opens"
          description="Minutes before class start"
          value={props.value.opensMinutesBeforeStart}
          min={0}
          disabled={props.disabled}
          onChange={(value) => update("opensMinutesBeforeStart", value)}
        />
        <MinuteField
          id="booking-closes-minutes"
          label="Booking closes"
          description="Use a negative value to allow booking after start"
          value={props.value.closesMinutesBeforeStart}
          min={-1440}
          disabled={props.disabled}
          onChange={(value) => update("closesMinutesBeforeStart", value)}
        />
        <MinuteField
          id="cancellations-close-minutes"
          label="Self-service cancellations close"
          description="Minutes before class start"
          value={props.value.cancellationsCloseMinutesBeforeStart}
          min={0}
          disabled={props.disabled}
          onChange={(value) =>
            update("cancellationsCloseMinutesBeforeStart", value)
          }
        />
      </div>
      <div className="flex min-h-16 items-center justify-between gap-4 rounded-md border p-3">
        <div>
          <Label
            htmlFor="block-client-cancellations"
            className="text-sm font-medium"
          >
            Block self-service cancellations
          </Label>
          <p className="text-xs text-muted-foreground">
            Operators can still cancel; members and API clients must contact the
            studio.
          </p>
        </div>
        <Switch
          id="block-client-cancellations"
          checked={props.value.blockClientCancellations}
          disabled={props.disabled}
          onCheckedChange={(checked) =>
            update("blockClientCancellations", checked)
          }
        />
      </div>
    </div>
  );
}

function MinuteField(props: {
  id: string;
  label: string;
  description: string;
  value: string;
  min: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type="number"
        inputMode="numeric"
        step={1}
        min={props.min}
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">{props.description}</p>
    </div>
  );
}
