"use client";

import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { VariableInput } from "@/components/tiptap/variable-input";
import { FormDescription, FormLabel } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  StudioResourcePicker,
  type StudioResourceOption,
} from "./resource-picker";

type ResourceSourceFieldProps = {
  error?: string;
  label: string;
  options: StudioResourceOption[];
  pickerEmptyText: string;
  pickerPlaceholder: string;
  search: string;
  searchPlaceholder: string;
  selected: StudioResourceOption | null;
  source: "SELECTED" | "VARIABLE";
  value: string;
  variablePlaceholder: string;
  variables: VariableItem[];
  onSearchChange: (value: string) => void;
  onSelect: (option: StudioResourceOption) => void;
  onSourceChange: (value: "SELECTED" | "VARIABLE") => void;
  onVariableChange: (value: string) => void;
};

export function ResourceSourceField({
  error,
  label,
  options,
  pickerEmptyText,
  pickerPlaceholder,
  search,
  searchPlaceholder,
  selected,
  source,
  value,
  variablePlaceholder,
  variables,
  onSearchChange,
  onSelect,
  onSourceChange,
  onVariableChange,
}: ResourceSourceFieldProps) {
  return (
    <div className="space-y-2">
      <FormLabel>{label}</FormLabel>
      <Select value={source} onValueChange={onSourceChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="SELECTED">Choose from studio</SelectItem>
          <SelectItem value="VARIABLE">Use workflow data</SelectItem>
        </SelectContent>
      </Select>
      {source === "SELECTED" ? (
        <StudioResourcePicker
          emptyText={pickerEmptyText}
          options={options}
          placeholder={pickerPlaceholder}
          search={search}
          searchPlaceholder={searchPlaceholder}
          selected={selected}
          onSearchChange={onSearchChange}
          onSelect={onSelect}
        />
      ) : (
        <VariableInput
          value={value}
          onChange={onVariableChange}
          variables={variables}
          placeholder={variablePlaceholder}
          className="min-h-9"
        />
      )}
      <FormDescription>
        {source === "SELECTED"
          ? `Use one ${label.toLowerCase()} every time this workflow runs.`
          : `Use the ${label.toLowerCase()} supplied by a trigger or earlier node.`}
      </FormDescription>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
