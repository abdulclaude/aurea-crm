import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OperationsValueSource } from "@/features/workspace-settings/lib/operations-settings";

const sourceLabels: Record<OperationsValueSource, string> = {
  LOCATION_OVERRIDE: "Location override",
  ORGANIZATION_DEFAULT: "Organization default",
  SYSTEM_DEFAULT: "System default",
};

export function OperationsSelectRow(props: {
  id: string;
  label: string;
  description: string;
  value: string | null;
  source: OperationsValueSource;
  inheritedLabel: string;
  options: readonly { value: string; label: string }[];
  allowInheritance: boolean;
  disabled: boolean;
  onChange: (value: string | null) => void;
}): React.JSX.Element {
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
      <Select
        value={
          props.value ?? (props.allowInheritance ? "__inherit__" : undefined)
        }
        onValueChange={(value) =>
          props.onChange(value === "__inherit__" ? null : value)
        }
        disabled={props.disabled}
      >
        <SelectTrigger
          id={props.id}
          aria-describedby={`${props.id}-description`}
          className="w-full"
        >
          <SelectValue placeholder="Choose a value" />
        </SelectTrigger>
        <SelectContent>
          {props.allowInheritance ? (
            <SelectItem value="__inherit__">{props.inheritedLabel}</SelectItem>
          ) : null}
          {props.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
