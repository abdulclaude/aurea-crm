import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicationConsentConfig } from "@/features/publications/components/publication-ui-types";

type ConsentCategory = PublicationConsentConfig["categories"][number];

const CATEGORIES: Array<{ value: ConsentCategory; label: string }> = [
  { value: "ANALYTICS", label: "Analytics" },
  { value: "MARKETING", label: "Marketing" },
  { value: "PERSONALIZATION", label: "Personalization" },
];

export function PublicationConsentFields({
  config,
  onChange,
}: {
  config: PublicationConsentConfig;
  onChange: (config: PublicationConsentConfig) => void;
}): React.JSX.Element {
  function setCategory(category: ConsentCategory, checked: boolean): void {
    onChange({
      ...config,
      categories: checked
        ? [...new Set([...config.categories, category])]
        : config.categories.filter((value) => value !== category),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="publication-consent-mode">Consent mode</Label>
          <Select
            value={config.mode}
            onValueChange={(mode: PublicationConsentConfig["mode"]) =>
              onChange({ ...config, mode })
            }
          >
            <SelectTrigger id="publication-consent-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DISABLED">Disabled</SelectItem>
              <SelectItem value="REQUIRED">Required</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="publication-consent-version">Policy version</Label>
          <Input
            id="publication-consent-version"
            value={config.version}
            onChange={(event) =>
              onChange({ ...config, version: event.target.value })
            }
            maxLength={40}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="publication-privacy-url">Privacy policy URL</Label>
        <Input
          id="publication-privacy-url"
          type="url"
          value={config.privacyPolicyUrl ?? ""}
          onChange={(event) =>
            onChange({
              ...config,
              privacyPolicyUrl: event.target.value || null,
            })
          }
          placeholder="https://"
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium">Consent categories</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CATEGORIES.map((category) => {
            const id = `publication-consent-${category.value.toLowerCase()}`;
            return (
              <div
                key={category.value}
                className="flex items-center gap-2 border-y py-3"
              >
                <Checkbox
                  id={id}
                  checked={config.categories.includes(category.value)}
                  onCheckedChange={(checked) =>
                    setCategory(category.value, checked === true)
                  }
                />
                <Label htmlFor={id}>{category.label}</Label>
              </div>
            );
          })}
        </div>
      </fieldset>
      {config.mode === "REQUIRED" && !config.privacyPolicyUrl ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Add a privacy policy URL before publishing a consent-gated target.
        </p>
      ) : null}
    </div>
  );
}
