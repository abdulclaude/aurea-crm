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

export type WaitlistFormState = {
  mode: "DISABLED" | "MANUAL" | "OFFER_NEXT";
  maxEntries: string;
  allowOverlappingReservations: boolean;
  offerExpiryMinutes: string;
};

export function WaitlistFields(props: {
  value: WaitlistFormState;
  disabled: boolean;
  onChange: (value: WaitlistFormState) => void;
}) {
  const update = <K extends keyof WaitlistFormState>(
    key: K,
    value: WaitlistFormState[K],
  ) => props.onChange({ ...props.value, [key]: value });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="waitlist-mode">Waitlist mode</Label>
          <Select
            value={props.value.mode}
            disabled={props.disabled}
            onValueChange={(value) =>
              update("mode", value as WaitlistFormState["mode"])
            }
          >
            <SelectTrigger id="waitlist-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DISABLED">Disabled</SelectItem>
              <SelectItem value="MANUAL">Manual</SelectItem>
              <SelectItem value="OFFER_NEXT">Offer next spot</SelectItem>
              <SelectItem value="AUTO_BOOK" disabled>
                Auto-book (credit holds required)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="waitlist-max-entries">Maximum entries</Label>
          <Input
            id="waitlist-max-entries"
            type="number"
            inputMode="numeric"
            min={1}
            max={10000}
            placeholder="No limit"
            value={props.value.maxEntries}
            disabled={props.disabled || props.value.mode === "DISABLED"}
            onChange={(event) => update("maxEntries", event.target.value)}
          />
        </div>
        {props.value.mode === "OFFER_NEXT" ? (
          <div className="space-y-2">
            <Label htmlFor="waitlist-offer-expiry">Offer expires after</Label>
            <Input
              id="waitlist-offer-expiry"
              type="number"
              inputMode="numeric"
              min={1}
              max={10080}
              value={props.value.offerExpiryMinutes}
              disabled={props.disabled}
              onChange={(event) =>
                update("offerExpiryMinutes", event.target.value)
              }
            />
            <p className="text-xs text-muted-foreground">
              Minutes after the offer is sent
            </p>
          </div>
        ) : null}
      </div>
      <div className="flex min-h-16 items-center justify-between gap-4 rounded-md border p-3">
        <div>
          <Label htmlFor="waitlist-overlap" className="text-sm font-medium">
            Allow overlapping waitlist reservations
          </Label>
          <p className="text-xs text-muted-foreground">
            When off, a member cannot join overlapping class waitlists.
          </p>
        </div>
        <Switch
          id="waitlist-overlap"
          checked={props.value.allowOverlappingReservations}
          disabled={props.disabled || props.value.mode === "DISABLED"}
          onCheckedChange={(checked) =>
            update("allowOverlappingReservations", checked)
          }
        />
      </div>
    </div>
  );
}
