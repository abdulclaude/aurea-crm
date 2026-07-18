"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  ResizableSheetContent,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { PlusIcon, TrashIcon } from "lucide-react";

const switchCaseSchema = z.object({
  value: z.string().min(1, "Value is required"),
  label: z.string().optional(),
});

const formSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  inputValue: z.string().min(1, "Input value is required"),
  cases: z.array(switchCaseSchema).min(1, "At least one case is required"),
  defaultLabel: z.string().optional(),
});

export type SwitchFormValues = z.infer<typeof formSchema>;

interface SwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SwitchFormValues) => void;
  defaultValues?: Partial<SwitchFormValues>;
  variables?: VariableItem[];
}

export const SwitchDialog: React.FC<SwitchDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  variables = [],
}) => {
  const form = useForm<SwitchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "switchResult",
      inputValue: defaultValues?.inputValue || "",
      cases: defaultValues?.cases || [{ value: "", label: "" }],
      defaultLabel: defaultValues?.defaultLabel || "Default",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cases",
  });

  const handleSubmit = (values: SwitchFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto border-border bg-background">
        <SheetHeader className="gap-1 border-b border-border px-6 pb-5 pt-8">
          <SheetTitle>Switch paths</SheetTitle>
          <SheetDescription>
            Route the workflow to a named path based on one previous value.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 px-6 py-6"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="switchResult"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inputValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Input Value</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      variables={variables}
                      placeholder="Enter value or select variable..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Cases</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ value: "", label: "" })}
                >
                  <PlusIcon className="size-4 mr-1" />
                  Add Case
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`cases.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="Case value"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`cases.${index}.label`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="Label (optional)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="defaultLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Branch Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Default"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="px-0 pt-4">
              <Button type="submit" className="w-full">Save paths</Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
