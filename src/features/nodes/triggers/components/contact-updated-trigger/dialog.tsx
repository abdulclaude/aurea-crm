"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";

import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CONTACT_FIELDS = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "companyName", label: "Company Name" },
  { value: "position", label: "Position" },
  { value: "type", label: "Type" },
  { value: "lifecycleStage", label: "Lifecycle Stage" },
  { value: "score", label: "Score" },
  { value: "tags", label: "Tags" },
  { value: "country", label: "Country" },
  { value: "city", label: "City" },
  { value: "source", label: "Source" },
  { value: "website", label: "Website" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "notes", label: "Notes" },
] as const;

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  watchFields: z.array(z.string()).optional(),
});

export type ContactUpdatedTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContactUpdatedTriggerFormValues) => void;
  defaultValues?: Partial<ContactUpdatedTriggerFormValues>;
  variables: VariableItem[];
}

export const ContactUpdatedTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "updatedContact",
      watchFields: defaultValues.watchFields || [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "updatedContact",
        watchFields: defaultValues.watchFields || [],
      });
    }
  }, [open, defaultValues.variableName, defaultValues.watchFields, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Contact Updated Trigger Configuration</SheetTitle>
          <SheetDescription>
            This workflow will trigger whenever a contact is updated in your CRM.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5 bg-white/5" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="updatedContact" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Access the updated contact data in other nodes: <br />
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "updatedContact"}.name}}`}
                    </span>
                    {", "}
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "updatedContact"}.changes}}`}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="watchFields"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Watch Specific Fields (Optional)</FormLabel>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const currentFields = field.value || [];
                      if (!currentFields.includes(value)) {
                        field.onChange([...currentFields, value]);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Add field to watch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONTACT_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {field.value && field.value.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value.map((watchField) => (
                        <div
                          key={watchField}
                          className="bg-white/10 px-3 py-1 rounded text-sm flex items-center gap-2"
                        >
                          {CONTACT_FIELDS.find((f) => f.value === watchField)?.label ||
                            watchField}
                          <button
                            type="button"
                            onClick={() => {
                              field.onChange(
                                field.value?.filter((f) => f !== watchField)
                              );
                            }}
                            className="text-white/60 hover:text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <FormDescription className="text-xs">
                    Leave empty to trigger on any field change, or select specific fields
                    to watch
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
              <p className="text-sm text-blue-200">
                This trigger will fire automatically whenever a contact is updated. The
                trigger data includes both the old and new values.
              </p>
            </div>

            <SheetFooter className="mt-6 px-0 pb-4">
              <Button
                type="submit"
                className="brightness-120! hover:brightness-130! w-full py-5"
              >
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
