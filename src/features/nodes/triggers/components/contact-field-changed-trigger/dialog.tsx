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
  fieldName: z.string().min(1, "Field name is required"),
});

export type ContactFieldChangedTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContactFieldChangedTriggerFormValues) => void;
  defaultValues?: Partial<ContactFieldChangedTriggerFormValues>;
  variables: VariableItem[];
}

export const ContactFieldChangedTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "contactChange",
      fieldName: defaultValues.fieldName || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "contactChange",
        fieldName: defaultValues.fieldName || "",
      });
    }
  }, [open, defaultValues.variableName, defaultValues.fieldName, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Contact Field Changed Trigger Configuration</SheetTitle>
          <SheetDescription>
            This workflow will trigger when a specific contact field changes.
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
                    <Input placeholder="contactChange" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Access the change data in other nodes: <br />
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "contactChange"}.oldValue}}`}
                    </span>
                    {", "}
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "contactChange"}.newValue}}`}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fieldName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field to Watch</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a field to watch" />
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
                  <FormDescription className="text-xs">
                    The workflow will trigger when this specific field changes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
              <p className="text-sm text-blue-200">
                Useful for tracking when tags are added, type changes, or any other
                specific field update. The trigger includes both old and new values.
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
