import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SearchCombobox } from "@/features/organizations/components/location-form-controls";
import type { RegionalValueSource } from "@/features/workspace-settings/lib/regional-settings";

const sourceLabels: Record<RegionalValueSource, string> = {
  LOCATION_OVERRIDE: "Location override",
  ORGANIZATION_DEFAULT: "Organization default",
  LEGACY_LOCATION: "Existing location value",
  LEGACY_ORGANIZATION: "Existing organization value",
  SYSTEM_DEFAULT: "System default",
};

export function RegionalFieldRow(props: {
  id: string;
  label: string;
  description: string;
  value: string | null;
  effectiveValue: string;
  source: RegionalValueSource;
  options: Array<{ value: string; label: string }>;
  allowInheritance: boolean;
  disabled: boolean;
  onChange: (value: string | null) => void;
}): React.JSX.Element {
  const options = props.allowInheritance
    ? [
        {
          value: "__inherit__",
          label: `Use organization default (${props.effectiveValue})`,
        },
        ...props.options,
      ]
    : props.options;

  return (
    <div className="grid gap-3 border-b border-black/5 py-4 last:border-b-0 dark:border-white/5 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)] md:items-center">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={props.id} className="text-xs font-medium">
            {props.label}
          </Label>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {sourceLabels[props.source]}
          </Badge>
        </div>
        <p id={`${props.id}-description`} className="text-xs text-primary/65">
          {props.description}
        </p>
      </div>
      <div>
        <SearchCombobox
          id={props.id}
          ariaDescribedBy={`${props.id}-description`}
          value={props.value ?? (props.allowInheritance ? "__inherit__" : undefined)}
          onChange={(value) => props.onChange(value === "__inherit__" ? null : value)}
          options={options}
          placeholder="Choose a value"
          searchPlaceholder={`Search ${props.label.toLowerCase()}`}
          emptyText="No matching option."
          disabled={props.disabled}
        />
      </div>
    </div>
  );
}
