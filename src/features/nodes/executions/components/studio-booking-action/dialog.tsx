"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  ResizableSheetContent,
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  studioBookingActionDefaults,
  studioBookingActionFormSchema,
  type StudioBookingActionFormValues,
} from "./config";
import { StudioBookingActionFields } from "./form-fields";
import { useStudioActionOptions } from "./use-studio-action-options";

type StudioBookingActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: StudioBookingActionFormValues) => void;
  defaultValues?: Partial<StudioBookingActionFormValues>;
  variables: VariableItem[];
};

export function StudioBookingActionDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  variables,
}: StudioBookingActionDialogProps) {
  const form = useForm<StudioBookingActionFormValues>({
    resolver: zodResolver(studioBookingActionFormSchema),
    defaultValues: studioBookingActionDefaults(defaultValues),
  });
  const classSource = form.watch("classSource");
  const clientSource = form.watch("clientSource");
  const operation = form.watch("operation");
  const {
    classOptions,
    classSearch,
    classLoading,
    clientOptions,
    clientSearch,
    clientLoading,
    setClassSearch,
    setClientSearch,
  } = useStudioActionOptions({ open, classSource, clientSource, operation });

  useEffect(() => {
    if (!open) return;
    form.reset(studioBookingActionDefaults(defaultValues));
    setClassSearch("");
    setClientSearch("");
  }, [defaultValues, form, open]);

  const submit = (values: StudioBookingActionFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto border-border bg-background sm:max-w-xl">
        <SheetHeader className="gap-1 px-6 pb-1 pt-8">
          <SheetTitle>Attendance and waitlist action</SheetTitle>
          <SheetDescription>
            Update attendance or manage a member's place on a class waitlist.
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-5" />
        <Form {...form}>
          <form className="space-y-6 px-6" onSubmit={form.handleSubmit(submit)}>
            <StudioBookingActionFields
              form={form}
              variables={variables}
              classOptions={classOptions}
              clientOptions={clientOptions}
              classSearch={classSearch}
              clientSearch={clientSearch}
              classLoading={classLoading}
              clientLoading={clientLoading}
              onClassSearchChange={setClassSearch}
              onClientSearchChange={setClientSearch}
            />
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
}
