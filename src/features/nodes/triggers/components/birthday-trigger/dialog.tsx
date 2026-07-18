"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "@/features/nodes/studio/components/studio-node-dialog-layout";

import {
  birthdayTriggerConfigSchema,
  type BirthdayTriggerFormValues,
} from "./config";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BirthdayTriggerFormValues) => void;
  defaultValues?: Partial<BirthdayTriggerFormValues>;
};

export function BirthdayTriggerDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) {
  const form = useForm<BirthdayTriggerFormValues>({
    resolver: zodResolver(birthdayTriggerConfigSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "birthday",
      daysBefore: defaultValues.daysBefore ?? 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "birthday",
        daysBefore: defaultValues.daysBefore ?? 0,
      });
    }
  }, [defaultValues.daysBefore, defaultValues.variableName, form, open]);

  const handleSubmit = (values: BirthdayTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <StudioNodeDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Upcoming birthday trigger"
      description="Start once per year before or on each member's birthday."
    >
      <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6"
          >
            <FormField
              control={form.control}
              name="daysBefore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>When should this run?</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">On the birthday</SelectItem>
                      <SelectItem value="1">1 day before</SelectItem>
                      <SelectItem value="3">3 days before</SelectItem>
                      <SelectItem value="7">7 days before</SelectItem>
                      <SelectItem value="14">14 days before</SelectItem>
                      <SelectItem value="30">30 days before</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The location timezone is used for the daily match.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input placeholder="birthday" {...field} />
                  </FormControl>
                  <FormDescription>
                    Later steps can use the member and birthday details from
                    this variable.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <StudioNodeDialogFooter />
          </form>
        </Form>
    </StudioNodeDialogLayout>
  );
}

export type { BirthdayTriggerFormValues } from "./config";
