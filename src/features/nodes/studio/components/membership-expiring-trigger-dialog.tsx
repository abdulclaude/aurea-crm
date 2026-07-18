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
  membershipExpiringTriggerConfigSchema,
  type MembershipExpiringTriggerConfig,
} from "@/features/nodes/studio/lib/studio-node-config";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "./studio-node-dialog-layout";

export function MembershipExpiringTriggerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MembershipExpiringTriggerConfig) => void;
  defaultValues?: Partial<MembershipExpiringTriggerConfig>;
}): React.ReactElement {
  const form = useForm<MembershipExpiringTriggerConfig>({
    resolver: zodResolver(membershipExpiringTriggerConfigSchema),
    defaultValues: {
      variableName: "expiringMembership",
      daysBefore: 7,
      membershipKind: "ANY",
    },
  });

  useEffect(() => {
    if (!props.open) return;
    form.reset({
      variableName:
        props.defaultValues?.variableName ?? "expiringMembership",
      daysBefore: props.defaultValues?.daysBefore ?? 7,
      membershipKind: props.defaultValues?.membershipKind ?? "ANY",
    });
  }, [form, props.defaultValues, props.open]);

  return (
    <StudioNodeDialogLayout
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Pricing option expiring trigger"
      description="Start before a package or subscription reaches its end date."
    >
      <Form {...form}>
        <form
          className="space-y-6 px-6"
          onSubmit={form.handleSubmit((values) => {
            props.onSubmit(values);
            props.onOpenChange(false);
          })}
        >
          <FormField
            control={form.control}
            name="membershipKind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pricing option type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ANY">
                      Any package or subscription
                    </SelectItem>
                    <SelectItem value="PACKAGE">Packages only</SelectItem>
                    <SelectItem value="SUBSCRIPTION">
                      Subscriptions only
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    <SelectItem value="0">On the expiry date</SelectItem>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="7">7 days before</SelectItem>
                    <SelectItem value="14">14 days before</SelectItem>
                    <SelectItem value="30">30 days before</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Each membership enrolls once for its matching expiry date.
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
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Later steps can use the member and expiring pricing option.
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
