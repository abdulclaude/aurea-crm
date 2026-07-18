import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import type { PublicFormField } from "@/features/forms-builder/lib/public-form-contract";

type ChoiceFieldProps = {
  field: PublicFormField;
  describedBy: string | undefined;
  labelledBy: string;
  value: unknown;
  disabled: boolean;
  onValueChange: (value: unknown) => void;
};

export function PublishedRadioOptions({
  field,
  describedBy,
  labelledBy,
  value,
  disabled,
  onValueChange,
}: ChoiceFieldProps): React.JSX.Element {
  return (
    <RadioGroup
      id={`publication-form-field-${field.id}`}
      name={field.id}
      value={typeof value === "string" ? value : ""}
      onValueChange={onValueChange}
      disabled={disabled}
      required={field.required}
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
    >
      {field.options.map((option, index) => {
        const id = `publication-form-field-${field.id}-${index}`;
        return (
          <div key={option} className="flex items-center gap-2">
            <RadioGroupItem id={id} value={option} />
            <Label
              htmlFor={id}
              className="min-w-0 break-words text-sm font-normal"
            >
              {option}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}

export function PublishedCheckboxOptions({
  field,
  describedBy,
  labelledBy,
  value,
  disabled,
  onValueChange,
}: ChoiceFieldProps): React.JSX.Element {
  const selected = new Set(Array.isArray(value) ? value : []);
  return (
    <fieldset
      id={`publication-form-field-${field.id}`}
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
      className="space-y-3"
    >
      <legend className="sr-only">{field.label}</legend>
      {field.options.map((option, index) => {
        const id = `publication-form-field-${field.id}-${index}`;
        return (
          <div key={option} className="flex items-center gap-2">
            <Checkbox
              id={id}
              name={field.id}
              value={option}
              checked={selected.has(option)}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onValueChange(
                  checked
                    ? [...selected, option]
                    : [...selected].filter((entry) => entry !== option),
                )
              }
            />
            <Label
              htmlFor={id}
              className="min-w-0 break-words text-sm font-normal"
            >
              {option}
            </Label>
          </div>
        );
      })}
    </fieldset>
  );
}

export function PublishedRatingOptions({
  field,
  describedBy,
  labelledBy,
  value,
  disabled,
  onValueChange,
}: ChoiceFieldProps): React.JSX.Element {
  return (
    <RadioGroup
      id={`publication-form-field-${field.id}`}
      name={field.id}
      value={typeof value === "string" ? value : ""}
      onValueChange={onValueChange}
      disabled={disabled}
      required={field.required}
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
      className="grid grid-cols-5 gap-2"
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const id = `publication-form-field-${field.id}-${rating}`;
        return (
          <Label
            key={rating}
            htmlFor={id}
            className="flex min-h-10 cursor-pointer items-center justify-center rounded-lg border text-sm"
          >
            <RadioGroupItem
              id={id}
              value={String(rating)}
              className="sr-only"
              aria-label={`${rating} out of 5`}
            />
            {rating}
          </Label>
        );
      })}
    </RadioGroup>
  );
}

export function PublishedSlider({
  field,
  describedBy,
  labelledBy,
  value,
  disabled,
  onValueChange,
}: ChoiceFieldProps): React.JSX.Element {
  const min = field.validation.min ?? 0;
  const max = field.validation.max ?? 100;
  const requestedValue = Number(value);
  const selectedValue = Number.isFinite(requestedValue)
    ? Math.min(max, Math.max(min, requestedValue))
    : min;
  return (
    <div className="space-y-2">
      <Slider
        id={`publication-form-field-${field.id}`}
        name={field.id}
        min={min}
        max={max}
        step={field.validation.step ?? 1}
        value={[selectedValue]}
        disabled={disabled}
        onValueChange={(next) => onValueChange(String(next[0] ?? min))}
        aria-describedby={describedBy}
        aria-labelledby={labelledBy}
      />
      <div className="flex justify-between text-xs opacity-65">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
