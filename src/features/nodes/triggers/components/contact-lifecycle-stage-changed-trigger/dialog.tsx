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

const LIFECYCLE_STAGES = [
  { value: "SUBSCRIBER", label: "Subscriber" },
  { value: "LEAD", label: "Lead" },
  { value: "MQL", label: "Marketing Qualified Lead (MQL)" },
  { value: "SQL", label: "Sales Qualified Lead (SQL)" },
  { value: "OPPORTUNITY", label: "Opportunity" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "EVANGELIST", label: "Evangelist" },
] as const;

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  fromStage: z.string().optional(),
  toStage: z.string().optional(),
});

export type ContactLifecycleStageChangedTriggerFormValues = z.infer<
  typeof formSchema
>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContactLifecycleStageChangedTriggerFormValues) => void;
  defaultValues?: Partial<ContactLifecycleStageChangedTriggerFormValues>;
  variables: VariableItem[];
}

export const ContactLifecycleStageChangedTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "contactStageChange",
      fromStage: defaultValues.fromStage || "",
      toStage: defaultValues.toStage || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "contactStageChange",
        fromStage: defaultValues.fromStage || "",
        toStage: defaultValues.toStage || "",
      });
    }
  }, [open, defaultValues.variableName, defaultValues.fromStage, defaultValues.toStage, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>
            Contact Lifecycle Stage Changed Trigger Configuration
          </SheetTitle>
          <SheetDescription>
            This workflow will trigger when a contact lifecycle stage changes.
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
                    <Input placeholder="contactStageChange" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Access the stage change data in other nodes: <br />
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "contactStageChange"}.oldStage}}`}
                    </span>
                    {", "}
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "contactStageChange"}.newStage}}`}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fromStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Stage (Optional)</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(val) => field.onChange(val || undefined)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Any stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LIFECYCLE_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Leave empty to trigger from any stage
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Stage (Optional)</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(val) => field.onChange(val || undefined)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Any stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LIFECYCLE_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Leave empty to trigger to any stage
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
              <p className="text-sm text-blue-200">
                Perfect for tracking contact progression through your sales funnel.
                Trigger workflows when contacts move from LEAD to MQL, MQL to SQL, or
                SQL to CUSTOMER.
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
