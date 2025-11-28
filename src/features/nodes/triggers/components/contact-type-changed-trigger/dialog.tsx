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

const CONTACT_TYPES = [
  { value: "LEAD", label: "Lead" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "CHURN", label: "Churn" },
  { value: "CLOSED", label: "Closed" },
] as const;

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  fromType: z.string().optional(),
  toType: z.string().optional(),
});

export type ContactTypeChangedTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContactTypeChangedTriggerFormValues) => void;
  defaultValues?: Partial<ContactTypeChangedTriggerFormValues>;
  variables: VariableItem[];
}

export const ContactTypeChangedTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "contactTypeChange",
      fromType: defaultValues.fromType || "",
      toType: defaultValues.toType || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "contactTypeChange",
        fromType: defaultValues.fromType || "",
        toType: defaultValues.toType || "",
      });
    }
  }, [open, defaultValues.variableName, defaultValues.fromType, defaultValues.toType, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Contact Type Changed Trigger Configuration</SheetTitle>
          <SheetDescription>
            This workflow will trigger when a contact type changes.
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
                    <Input placeholder="contactTypeChange" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Access the type change data in other nodes: <br />
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "contactTypeChange"}.oldType}}`}
                    </span>
                    {", "}
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "contactTypeChange"}.newType}}`}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fromType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Type (Optional)</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(val) => field.onChange(val || undefined)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONTACT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Leave empty to trigger from any type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Type (Optional)</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(val) => field.onChange(val || undefined)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONTACT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Leave empty to trigger to any type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
              <p className="text-sm text-blue-200">
                Useful for automations when a contact moves from Lead to Customer, or
                from Customer to Churn. Set filters to trigger only on specific type
                transitions.
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
