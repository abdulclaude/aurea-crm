"use client";

import type { UseFormReturn } from "react-hook-form";

import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
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
import { SheetFooter } from "@/components/ui/sheet";

import {
  STUDIO_BOOKING_OPERATION_LABELS,
  type StudioBookingActionFormValues,
} from "./config";
import { ResourceSourceField } from "./resource-source-field";
import type { StudioResourceOption } from "./resource-picker";

type StudioBookingActionFieldsProps = {
  form: UseFormReturn<StudioBookingActionFormValues>;
  variables: VariableItem[];
  classOptions: StudioResourceOption[];
  clientOptions: StudioResourceOption[];
  classSearch: string;
  clientSearch: string;
  classLoading: boolean;
  clientLoading: boolean;
  onClassSearchChange: (value: string) => void;
  onClientSearchChange: (value: string) => void;
};

export function StudioBookingActionFields({
  form,
  variables,
  classOptions,
  clientOptions,
  classSearch,
  clientSearch,
  classLoading,
  clientLoading,
  onClassSearchChange,
  onClientSearchChange,
}: StudioBookingActionFieldsProps) {
  const classSource = form.watch("classSource");
  const clientSource = form.watch("clientSource");
  return (
    <>
      <FormField
        control={form.control}
        name="operation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Action</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.entries(STUDIO_BOOKING_OPERATION_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            {field.value === "MARK_NO_SHOW" ? (
              <FormDescription>
                Runs after the class ends. The studio's cancellation policy may
                deduct credits or collect a no-show fee.
              </FormDescription>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />
      <ResourceSourceField
        label="Class"
        source={classSource}
        value={form.watch("classId")}
        selected={selectedOption(
          classOptions,
          form.watch("classId"),
          form.watch("className"),
        )}
        options={classOptions}
        search={classSearch}
        searchPlaceholder="Search upcoming classes..."
        pickerPlaceholder="Choose an upcoming class"
        pickerEmptyText={
          classLoading ? "Loading classes..." : "No classes found."
        }
        variablePlaceholder="@triggerData.classId"
        variables={variables}
        error={form.formState.errors.classId?.message}
        onSearchChange={onClassSearchChange}
        onSourceChange={(source) => setSource(form, "class", source)}
        onVariableChange={(value) =>
          form.setValue("classId", value, { shouldValidate: true })
        }
        onSelect={(option) => setSelected(form, "class", option)}
      />
      <ResourceSourceField
        label="Member"
        source={clientSource}
        value={form.watch("clientId")}
        selected={selectedOption(
          clientOptions,
          form.watch("clientId"),
          form.watch("clientName"),
        )}
        options={clientOptions}
        search={clientSearch}
        searchPlaceholder="Search members..."
        pickerPlaceholder="Choose a member"
        pickerEmptyText={
          clientLoading ? "Loading members..." : "No members found."
        }
        variablePlaceholder="@triggerData.clientId"
        variables={variables}
        error={form.formState.errors.clientId?.message}
        onSearchChange={onClientSearchChange}
        onSourceChange={(source) => setSource(form, "client", source)}
        onVariableChange={(value) =>
          form.setValue("clientId", value, { shouldValidate: true })
        }
        onSelect={(option) => setSelected(form, "client", option)}
      />
      <FormField
        control={form.control}
        name="variableName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Save result as</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <SheetFooter className="px-0 pb-4">
        <Button type="submit" variant="gradient" className="ml-auto w-max">
          Save changes
        </Button>
      </SheetFooter>
    </>
  );
}

function selectedOption(
  options: StudioResourceOption[],
  id: string,
  name?: string,
) {
  return (
    options.find((option) => option.id === id) ??
    (name ? { id, label: name } : null)
  );
}

function setSource(
  form: UseFormReturn<StudioBookingActionFormValues>,
  kind: "class" | "client",
  source: "SELECTED" | "VARIABLE",
) {
  form.setValue(`${kind}Source`, source);
  form.setValue(
    `${kind}Id`,
    source === "VARIABLE"
      ? `{{triggerData.${kind === "class" ? "classId" : "clientId"}}}`
      : "",
    { shouldValidate: true },
  );
  form.setValue(`${kind}Name`, undefined);
}

function setSelected(
  form: UseFormReturn<StudioBookingActionFormValues>,
  kind: "class" | "client",
  option: StudioResourceOption,
) {
  form.setValue(`${kind}Id`, option.id, { shouldValidate: true });
  form.setValue(`${kind}Name`, option.label);
}
