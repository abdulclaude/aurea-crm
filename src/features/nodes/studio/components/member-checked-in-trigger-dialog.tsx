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
import { Switch } from "@/components/ui/switch";
import {
  memberCheckedInTriggerConfigSchema,
  type MemberCheckedInTriggerConfig,
} from "@/features/nodes/studio/lib/studio-node-config";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "./studio-node-dialog-layout";

type MemberCheckedInTriggerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MemberCheckedInTriggerConfig) => void;
  defaultValues?: Partial<MemberCheckedInTriggerConfig>;
};

export function MemberCheckedInTriggerDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: MemberCheckedInTriggerDialogProps): React.ReactElement {
  const form = useForm<MemberCheckedInTriggerConfig>({
    resolver: zodResolver(memberCheckedInTriggerConfigSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "checkIn",
      firstCheckInOnly: defaultValues.firstCheckInOnly || false,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      variableName: defaultValues.variableName || "checkIn",
      firstCheckInOnly: defaultValues.firstCheckInOnly || false,
    });
  }, [defaultValues.firstCheckInOnly, defaultValues.variableName, form, open]);

  const handleSubmit = (values: MemberCheckedInTriggerConfig): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <StudioNodeDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Member checked in trigger"
      description="Run after member check-in, optionally only for their first class."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 px-6"
        >
          <FormField
            control={form.control}
            name="firstCheckInOnly"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded border border-border p-4">
                <div>
                  <FormLabel>First check-in only</FormLabel>
                  <FormDescription className="mt-1">
                    Run only when the member reaches one lifetime attendance.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
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
                  <Input placeholder="checkIn" {...field} />
                </FormControl>
                <FormDescription>
                  Reference member, class, streak, and attendance data later.
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
