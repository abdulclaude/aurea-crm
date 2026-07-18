"use client";

import type { Control, UseFormSetValue } from "react-hook-form";
import { Trash2Icon } from "lucide-react";

import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { operatorLabel, operatorsForType } from "./condition-utils";
import type {
  IfElseFormValues,
  IfElseOperator,
  IfElseValueType,
} from "./schema";
import type { ConditionVariableOption } from "./variable-options";
import {
  GuidedField,
  GuidedRightField,
  LiteralValueField,
} from "./condition-fields";

type Props = {
  control: Control<IfElseFormValues>;
  index: number;
  mode: "guided" | "advanced";
  onRemove: () => void;
  canRemove: boolean;
  options: ConditionVariableOption[];
  setValue: UseFormSetValue<IfElseFormValues>;
  variables: VariableItem[];
  valueType: IfElseValueType;
  operator: IfElseOperator;
  rightOperandSource: "value" | "field";
  literalOptions?: Array<{ value: string; label: string }>;
};

export function ConditionRow({
  control,
  index,
  mode,
  onRemove,
  canRemove,
  options,
  setValue,
  variables,
  valueType,
  operator,
  rightOperandSource,
  literalOptions,
}: Props): React.ReactNode {
  const showRightOperand = !["isEmpty", "isNotEmpty"].includes(operator);

  return (
    <div className="space-y-4 rounded-md border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-primary">
          Condition {index + 1}
        </p>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label={`Remove condition ${index + 1}`}
          title="Remove condition"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>

      {mode === "guided" ? (
        <GuidedField
          control={control}
          index={index}
          options={options}
          setValue={setValue}
        />
      ) : (
        <FormField
          control={control}
          name={`conditions.${index}.leftOperand`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value to check</FormLabel>
              <FormControl>
                <VariableInput
                  placeholder="Choose a previous step variable"
                  value={field.value}
                  onChange={field.onChange}
                  variables={variables}
                  className="min-h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={`conditions.${index}.valueType`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data type</FormLabel>
              <Select
                value={field.value}
                onValueChange={(nextValue: IfElseValueType) => {
                  field.onChange(nextValue);
                  if (!operatorsForType(nextValue).includes(operator)) {
                    setValue(`conditions.${index}.operator`, "equals");
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Yes / No</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`conditions.${index}.operator`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comparison</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {operatorsForType(valueType).map((item) => (
                    <SelectItem key={item} value={item}>
                      {operatorLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>

      {showRightOperand ? (
        <div className="space-y-4">
          <FormField
            control={control}
            name={`conditions.${index}.rightOperandSource`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Compare with</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="value">A value I enter</SelectItem>
                    <SelectItem value="field">Another previous field</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {rightOperandSource === "field" && mode === "guided" ? (
            <GuidedRightField
              control={control}
              index={index}
              options={options}
              setValue={setValue}
            />
          ) : mode === "advanced" && rightOperandSource === "field" ? (
            <FormField
              control={control}
              name={`conditions.${index}.rightOperand`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <VariableInput
                      placeholder="Choose another previous step variable"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                      className="min-h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <LiteralValueField
              control={control}
              index={index}
              valueType={valueType}
              options={literalOptions}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
