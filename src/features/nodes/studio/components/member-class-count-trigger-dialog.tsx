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
  memberClassCountTriggerConfigSchema,
  type MemberClassCountTriggerConfig,
} from "@/features/nodes/studio/lib/studio-node-config";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "./studio-node-dialog-layout";

type MemberClassCountTriggerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MemberClassCountTriggerConfig) => void;
  defaultValues?: Partial<MemberClassCountTriggerConfig>;
};

export function MemberClassCountTriggerDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: MemberClassCountTriggerDialogProps): React.ReactElement {
  const form = useForm<MemberClassCountTriggerConfig>({
    resolver: zodResolver(memberClassCountTriggerConfigSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "milestone",
      targetCount: defaultValues.targetCount || 10,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      variableName: defaultValues.variableName || "milestone",
      targetCount: defaultValues.targetCount || 10,
    });
  }, [defaultValues.targetCount, defaultValues.variableName, form, open]);

  const handleSubmit = (values: MemberClassCountTriggerConfig): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <StudioNodeDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Class milestone trigger"
      description="Run when a member reaches an exact lifetime class count."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 px-6"
        >
          <FormField
            control={form.control}
            name="targetCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class count</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={field.value}
                    onChange={(event) =>
                      field.onChange(event.target.valueAsNumber)
                    }
                  />
                </FormControl>
                <FormDescription>
                  This workflow runs only when attendance reaches this count.
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
                  <Input placeholder="milestone" {...field} />
                </FormControl>
                <FormDescription>
                  Reference the member and attendance data in later nodes.
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
