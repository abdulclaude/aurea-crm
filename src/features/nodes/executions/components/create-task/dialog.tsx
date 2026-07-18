"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizableSheetContent,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { createTaskFormSchema, type CreateTaskFormValues } from "./config";

type CreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateTaskFormValues) => void;
  defaultValues?: Partial<CreateTaskFormValues>;
  variables: VariableItem[];
};

function defaults(
  values: Partial<CreateTaskFormValues> = {},
): CreateTaskFormValues {
  return {
    title: values.title ?? "Follow up with {{triggerData.client.name}}",
    description: values.description ?? "",
    dueAmount: values.dueAmount ?? 24,
    dueUnit: values.dueUnit ?? "HOURS",
    priority: values.priority ?? "MEDIUM",
    clientId: values.clientId ?? "",
    assigneeId: values.assigneeId ?? "",
    variableName: values.variableName ?? "createdTask",
  };
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  variables,
}: CreateTaskDialogProps) {
  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: defaults(defaultValues),
  });

  useEffect(() => {
    if (open) form.reset(defaults(defaultValues));
  }, [defaultValues, form, open]);

  const submit = (values: CreateTaskFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto border-border bg-background sm:max-w-xl">
        <SheetHeader className="gap-1 px-6 pb-1 pt-8">
          <SheetTitle>Create task</SheetTitle>
          <SheetDescription>
            Add a tenant-scoped CRM task for workflow follow-up.
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-5" />
        <Form {...form}>
          <form className="space-y-5 px-6" onSubmit={form.handleSubmit(submit)}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      variables={variables}
                      placeholder="Call the new member"
                      ariaLabel="Task title"
                      className="min-h-9"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="dueAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due in</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={3650}
                        value={field.value}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        onChange={(event) =>
                          field.onChange(event.currentTarget.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MINUTES">Minutes</SelectItem>
                        <SelectItem value="HOURS">Hours</SelectItem>
                        <SelectItem value="DAYS">Days</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map(
                        (value) => (
                          <SelectItem key={value} value={value}>
                            {value.toLowerCase()}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(
              [
                ["clientId", "Client ID", "{{triggerData.clientId}}"],
                ["assigneeId", "Assignee user ID", "Optional"],
              ] as const
            ).map(([name, label, placeholder]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        variables={variables}
                        placeholder={placeholder}
                        ariaLabel={label}
                        className="min-h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Result variable</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="px-0 pb-6">
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
}
