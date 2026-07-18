"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  formatDateValue,
  parseDateValue,
} from "@/components/ui/date-picker-utils";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PUBLIC_FORM_CONTROL_BY_FIELD_TYPE,
  type PublicFormField,
} from "@/features/forms-builder/lib/public-form-contract";
import {
  PublishedCheckboxOptions,
  PublishedRadioOptions,
  PublishedRatingOptions,
  PublishedSlider,
} from "@/features/publications/public/published-form-choice-fields";
import { PublishedFormFieldLabel } from "@/features/publications/public/published-form-field-label";

export function PublishedFormField({
  field,
  value,
  error,
  disabled = false,
  onValueChange,
}: {
  field: PublicFormField;
  value: unknown;
  error?: string;
  disabled?: boolean;
  onValueChange: (value: unknown) => void;
}): React.JSX.Element {
  const controlId = `publication-form-field-${field.id}`;
  const labelId = `${controlId}-label`;
  const helpId = field.helpText ? `${controlId}-help` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const control = PUBLIC_FORM_CONTROL_BY_FIELD_TYPE[field.type];
  const commonInputProps = {
    id: controlId,
    name: field.id,
    required: field.required,
    "aria-describedby": describedBy,
    "aria-invalid": Boolean(error),
    disabled,
  } as const;

  return (
    <div className="space-y-2">
      <PublishedFormFieldLabel
        field={field}
        controlId={controlId}
        labelId={labelId}
      />
      {control === "TEXTAREA" ? (
        <Textarea
          {...commonInputProps}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onValueChange(event.target.value)}
          minLength={field.validation.minLength}
          maxLength={field.validation.maxLength}
          placeholder={field.placeholder ?? undefined}
          rows={5}
        />
      ) : control === "SELECT" ? (
        <Select
          value={typeof value === "string" ? value : ""}
          onValueChange={onValueChange}
          disabled={disabled}
          name={field.id}
          required={field.required}
        >
          <SelectTrigger
            id={controlId}
            className="w-full"
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
          >
            <SelectValue
              placeholder={field.placeholder ?? "Select an option"}
            />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : control === "RADIO" ? (
        <PublishedRadioOptions
          field={field}
          describedBy={describedBy}
          labelledBy={labelId}
          value={value}
          disabled={disabled}
          onValueChange={onValueChange}
        />
      ) : control === "CHECKBOX" ? (
        <div className="flex items-start gap-2 py-1">
          <Checkbox
            id={controlId}
            name={field.id}
            required={field.required}
            checked={value === true}
            disabled={disabled}
            onCheckedChange={(checked) => onValueChange(checked === true)}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
          />
          <Label
            htmlFor={controlId}
            className="min-w-0 break-words text-sm font-normal"
          >
            {field.placeholder ?? field.label}
          </Label>
        </div>
      ) : control === "MULTI_SELECT" ? (
        <PublishedCheckboxOptions
          field={field}
          describedBy={describedBy}
          labelledBy={labelId}
          value={value}
          disabled={disabled}
          onValueChange={onValueChange}
        />
      ) : control === "RATING" ? (
        <PublishedRatingOptions
          field={field}
          describedBy={describedBy}
          labelledBy={labelId}
          value={value}
          disabled={disabled}
          onValueChange={onValueChange}
        />
      ) : control === "SLIDER" ? (
        <PublishedSlider
          field={field}
          describedBy={describedBy}
          labelledBy={labelId}
          value={value}
          disabled={disabled}
          onValueChange={onValueChange}
        />
      ) : field.type === "DATE" ? (
        <DatePicker
          id={controlId}
          date={parseDateValue(typeof value === "string" ? value : "")}
          onSelect={(date) => onValueChange(formatDateValue(date))}
          placeholder={field.placeholder ?? "Pick a date"}
          disabled={disabled}
          required={field.required}
          ariaLabelledBy={labelId}
          ariaDescribedBy={describedBy}
          invalid={Boolean(error)}
        />
      ) : field.type === "DATETIME" ? (
        <DateTimePicker
          id={controlId}
          value={typeof value === "string" ? value : ""}
          onChange={onValueChange}
          disabled={disabled}
          required={field.required}
          dateAriaLabel={`${field.label} date`}
          timeAriaLabel={`${field.label} time`}
          ariaDescribedBy={describedBy}
          invalid={Boolean(error)}
        />
      ) : (
        <Input
          {...commonInputProps}
          type={PUBLIC_FORM_HTML_INPUT_TYPE[field.type] ?? "text"}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={field.placeholder ?? undefined}
          minLength={field.validation.minLength}
          maxLength={field.validation.maxLength}
          min={field.validation.min}
          max={field.validation.max}
          step={field.validation.step}
        />
      )}
      {field.helpText ? (
        <p id={helpId} className="break-words text-xs opacity-65">
          {field.helpText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="break-words text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const PUBLIC_FORM_HTML_INPUT_TYPE: Partial<
  Record<PublicFormField["type"], string>
> = {
  EMAIL: "email",
  PHONE: "tel",
  NUMBER: "number",
  URL: "url",
  TIME: "time",
};
