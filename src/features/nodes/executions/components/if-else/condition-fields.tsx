"use client";

import type { Control, UseFormSetValue } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { IfElseFormValues, IfElseValueType } from "./schema";
import type { ConditionVariableOption } from "./variable-options";

type FieldProps = {
  control: Control<IfElseFormValues>;
  index: number;
  options: ConditionVariableOption[];
  setValue: UseFormSetValue<IfElseFormValues>;
};

export function GuidedField({
  control,
  index,
  options,
  setValue,
}: FieldProps): React.ReactNode {
  return (
    <FormField
      control={control}
      name={`conditions.${index}.leftOperand`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>What should we check?</FormLabel>
          <Select
            value={field.value}
            onValueChange={(operand) => {
              field.onChange(operand);
              const selected = options.find((option) => option.operand === operand);
              setValue(`conditions.${index}.leftLabel`, selected?.label);
              if (selected) setValue(`conditions.${index}.valueType`, selected.valueType);
            }}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose data from the trigger or a previous step" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.length ? options.map((option) => (
                <SelectItem key={option.path} value={option.operand}>
                  {option.label}
                </SelectItem>
              )) : (
                <SelectItem value="__none" disabled>
                  Connect a configured trigger or data step first
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function GuidedRightField({
  control,
  index,
  options,
  setValue,
}: FieldProps): React.ReactNode {
  return (
    <FormField
      control={control}
      name={`conditions.${index}.rightOperand`}
      render={({ field }) => (
        <FormItem>
          <Select
            value={field.value || ""}
            onValueChange={(operand) => {
              field.onChange(operand);
              setValue(
                `conditions.${index}.rightLabel`,
                options.find((option) => option.operand === operand)?.label,
              );
            }}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose another field" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.path} value={option.operand}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function LiteralValueField({
  control,
  index,
  valueType,
  options = [],
}: Pick<FieldProps, "control" | "index"> & {
  valueType: IfElseValueType;
  options?: Array<{ value: string; label: string }>;
}): React.ReactNode {
  return (
    <FormField
      control={control}
      name={`conditions.${index}.rightOperand`}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            {options.length > 0 ? (
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a value" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : valueType === "boolean" ? (
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose yes or no" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                {...field}
                value={field.value || ""}
                type={valueType === "number" ? "number" : valueType === "date" ? "date" : "text"}
                placeholder={valueType === "number" ? "3" : "Enter a value"}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
