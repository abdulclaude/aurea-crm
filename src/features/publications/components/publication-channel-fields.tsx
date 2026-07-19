import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicationSwitchField } from "@/features/publications/components/publication-switch-field";
import type { PublicationChannelConfig } from "@/features/publications/components/publication-ui-types";

type Props = {
  config: PublicationChannelConfig;
  onChange: (config: PublicationChannelConfig) => void;
};

function splitValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function PublicationChannelFields({
  config,
  onChange,
}: Props): React.JSX.Element {
  if (config.kind === "SCHEDULE") {
    return (
      <div>
        <div className="space-y-2 py-3">
          <Label htmlFor="publication-days">Days available</Label>
          <Input
            id="publication-days"
            type="number"
            min={1}
            max={365}
            value={config.maxDaysAhead}
            onChange={(event) =>
              onChange({ ...config, maxDaysAhead: Number(event.target.value) })
            }
          />
        </div>
        <div className="space-y-2 border-t py-3">
          <Label htmlFor="publication-class-types">Class type IDs</Label>
          <Input
            id="publication-class-types"
            value={config.classTypeIds.join(", ")}
            onChange={(event) =>
              onChange({
                ...config,
                classTypeIds: splitValues(event.target.value),
              })
            }
            placeholder="Leave blank to include all class types"
          />
        </div>
        <PublicationSwitchField
          id="publication-availability"
          label="Show availability"
          description="Display remaining capacity on the public schedule."
          checked={config.showAvailability}
          onCheckedChange={(showAvailability) =>
            onChange({ ...config, showAvailability })
          }
        />
      </div>
    );
  }

  if (config.kind === "PRICING") {
    return (
      <div>
        <PublicationSwitchField
          id="publication-terms"
          label="Show terms"
          description="Include the pricing option terms in the public view."
          checked={config.showTerms}
          onCheckedChange={(showTerms) => onChange({ ...config, showTerms })}
        />
        <PublicationSwitchField
          id="publication-purchase"
          label="Allow direct purchase"
          description="Show the checkout command when the product is available."
          checked={config.allowDirectPurchase}
          onCheckedChange={(allowDirectPurchase) =>
            onChange({ ...config, allowDirectPurchase })
          }
        />
      </div>
    );
  }

  if (config.kind === "FORM") {
    return (
      <div>
        <PublicationSwitchField
          id="publication-form-submissions"
          label="Accept responses"
          description="Validate and store responses against the exact published version."
          checked={config.submissionMode === "ENABLED"}
          onCheckedChange={(enabled) =>
            onChange({
              ...config,
              submissionMode: enabled ? "ENABLED" : "DISABLED",
            })
          }
        />
        {config.submissionMode === "ENABLED" ? (
          <div className="space-y-2 border-t py-3">
            <Label htmlFor="publication-form-retention-days">
              Response retention (days)
            </Label>
            <Input
              id="publication-form-retention-days"
              type="number"
              min={1}
              max={3650}
              value={config.responseRetentionDays}
              onChange={(event) => {
                const responseRetentionDays = Number(event.target.value);
                if (
                  Number.isInteger(responseRetentionDays) &&
                  responseRetentionDays >= 1 &&
                  responseRetentionDays <= 3650
                ) {
                  onChange({ ...config, responseRetentionDays });
                }
              }}
            />
            <Label htmlFor="publication-form-response-consent">
              Response consent label
            </Label>
            <Input
              id="publication-form-response-consent"
              value={config.responseConsentLabel}
              maxLength={500}
              onChange={(event) =>
                onChange({
                  ...config,
                  responseConsentLabel: event.target.value,
                })
              }
            />
            <Alert className="border-amber-500/30">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Privacy policy required</AlertTitle>
              <AlertDescription>
                Add the response privacy policy URL under Consent before
                publishing.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
        <div className="space-y-2 border-t py-3">
          <Label htmlFor="publication-form-height">Embed height</Label>
          <Input
            id="publication-form-height"
            type="number"
            min={320}
            max={2000}
            value={config.height}
            className="shadow-none"
            onChange={(event) => {
              const height = Number(event.target.value);
              if (Number.isInteger(height) && height >= 320 && height <= 2000) {
                onChange({ ...config, height });
              }
            }}
          />
        </div>
        <PublicationSwitchField
          id="publication-form-transparent"
          label="Transparent background"
          description="Allow the approved host website background to show through."
          checked={config.transparentBackground}
          onCheckedChange={(transparentBackground) =>
            onChange({ ...config, transparentBackground })
          }
        />
        <div className="space-y-2 border-t py-3">
          <Label htmlFor="publication-form-frame-origins">
            Allowed website origins
          </Label>
          <Input
            id="publication-form-frame-origins"
            value={config.allowedFrameOrigins.join(", ")}
            className="shadow-none"
            onChange={(event) =>
              onChange({
                ...config,
                allowedFrameOrigins: splitValues(event.target.value),
              })
            }
            placeholder="https://www.example.com"
          />
          <p className="text-xs text-muted-foreground">
            Exact origins only. Republish after changing this list.
          </p>
        </div>
      </div>
    );
  }

  if (config.kind === "GIFT_CARDS") {
    return (
      <div className="space-y-2 py-3">
        <Label htmlFor="publication-amounts">Suggested amounts</Label>
        <Input
          id="publication-amounts"
          value={config.suggestedAmounts.join(", ")}
          onChange={(event) =>
            onChange({
              ...config,
              suggestedAmounts: splitValues(event.target.value),
            })
          }
          placeholder="25, 50, 100"
        />
        <p className="text-xs text-muted-foreground">
          Enter up to eight currency amounts separated by commas.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2 py-3">
        <Label htmlFor="publication-height">Embed height</Label>
        <Input
          id="publication-height"
          type="number"
          min={240}
          max={2000}
          value={config.height}
          onChange={(event) =>
            onChange({ ...config, height: Number(event.target.value) })
          }
        />
      </div>
      <PublicationSwitchField
        id="publication-transparent"
        label="Transparent background"
        description="Allow the host page background to show through the embed."
        checked={config.transparentBackground}
        onCheckedChange={(transparentBackground) =>
          onChange({ ...config, transparentBackground })
        }
      />
      <div className="space-y-2 border-t py-3">
        <Label htmlFor="publication-frame-origins">Allowed website origins</Label>
        <Input
          id="publication-frame-origins"
          value={config.allowedFrameOrigins.join(", ")}
          className="shadow-none"
          onChange={(event) =>
            onChange({
              ...config,
              allowedFrameOrigins: splitValues(event.target.value),
            })
          }
          placeholder="https://www.example.com"
        />
        <p className="text-xs text-muted-foreground">
          Exact origins only. Republish after changing this list.
        </p>
      </div>
    </div>
  );
}
