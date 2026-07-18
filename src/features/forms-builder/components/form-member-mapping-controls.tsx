import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type FormMappingField = { id: string; label: string; type: string };

export function FormMappingSelect({
  label,
  fields,
  value,
  required,
  onChange,
}: {
  label: string;
  fields: FormMappingField[];
  value: string | null;
  required?: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Select
        value={value ?? "none"}
        onValueChange={(next) => onChange(next === "none" ? null : next)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Choose ${label.toLowerCase()} field`} />
        </SelectTrigger>
        <SelectContent>
          {!required ? <SelectItem value="none">Do not map</SelectItem> : null}
          {fields.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FormMappingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
