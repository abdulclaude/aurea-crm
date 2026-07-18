"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ResizableSheetContent,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTRPC } from "@/trpc/client";

const ALL_FORMS = "__all_forms__";
const schema = z
  .object({
    formId: z.string().trim(),
    formName: z.string().trim().optional(),
    intent: z.enum(["FORM", "NEWSLETTER"]).optional(),
    requireEmailMarketingConsent: z.boolean(),
    requireSmsMarketingConsent: z.boolean(),
    variableName: z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
  })
  .superRefine((value, context) => {
    if (value.intent === "NEWSLETTER" && !value.formId) {
      context.addIssue({
        code: "custom",
        message: "Choose the newsletter form.",
        path: ["formId"],
      });
    }
  });

export type FormSubmittedTriggerFormValues = z.infer<typeof schema>;

export function FormSubmittedTriggerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FormSubmittedTriggerFormValues) => void;
  defaultValues?: Partial<FormSubmittedTriggerFormValues>;
}) {
  const trpc = useTRPC();
  const formsQuery = useQuery(trpc.forms.list.queryOptions());
  const form = useForm<FormSubmittedTriggerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      formId: "",
      requireEmailMarketingConsent: false,
      requireSmsMarketingConsent: false,
      variableName: "formSubmission",
    },
  });

  useEffect(() => {
    if (!props.open) return;
    form.reset({
      formId: props.defaultValues?.formId ?? "",
      formName: props.defaultValues?.formName,
      intent: props.defaultValues?.intent,
      requireEmailMarketingConsent:
        props.defaultValues?.requireEmailMarketingConsent ?? false,
      requireSmsMarketingConsent:
        props.defaultValues?.requireSmsMarketingConsent ?? false,
      variableName: props.defaultValues?.variableName ?? "formSubmission",
    });
  }, [form, props.defaultValues, props.open]);

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto border-border bg-background sm:max-w-xl">
        <SheetHeader className="gap-1 px-6 pb-1 pt-8">
          <SheetTitle>
            {props.defaultValues?.intent === "NEWSLETTER"
              ? "Newsletter subscribed trigger"
              : "Form submitted trigger"}
          </SheetTitle>
          <SheetDescription>
            {props.defaultValues?.intent === "NEWSLETTER"
              ? "Start when a member submits the selected newsletter signup form."
              : "Start this workflow whenever a member submits a form."}
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-5" />
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
              name="formId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ALL_FORMS}
                      onValueChange={(value) => {
                        const formId = value === ALL_FORMS ? "" : value;
                        const selectedForm = formsQuery.data?.find(
                          (candidate) => candidate.id === formId,
                        );
                        field.onChange(formId);
                        form.setValue("formName", selectedForm?.name, {
                          shouldDirty: true,
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a form" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value={ALL_FORMS}
                          disabled={
                            props.defaultValues?.intent === "NEWSLETTER"
                          }
                        >
                          {props.defaultValues?.intent === "NEWSLETTER"
                            ? "Choose a form"
                            : "Any form"}
                        </SelectItem>
                        {formsQuery.data?.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    {props.defaultValues?.intent === "NEWSLETTER"
                      ? "Choose the tenant-owned form used for newsletter subscriptions."
                      : "Choose a form from this workspace, or run for every form."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4 border-t pt-5">
              <div>
                <FormLabel>Marketing permission</FormLabel>
                <FormDescription>
                  Only start this workflow when the selected form answer grants
                  the required channel permission.
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="requireEmailMarketingConsent"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3">
                    <FormLabel className="font-normal">
                      Require email marketing permission
                    </FormLabel>
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
                name="requireSmsMarketingConsent"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3">
                    <FormLabel className="font-normal">
                      Require SMS marketing permission
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
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
                    Answers are available at @{field.value}.values. Change this
                    only for advanced workflows.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="px-0 pb-4">
              <Button type="submit" className="ml-auto w-max" variant="gradient">
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
}
