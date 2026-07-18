"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
import { NodeType } from "@/db/enums";
import { WorkflowProviderAccountSelect } from "@/features/workflows/components/workflow-provider-account-select";

const formSchema = z.object({
  providerAccountId: z.string().trim().min(1, "Select a OneDrive account."),
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.",
    }),
  folderPath: z
    .string()
    .min(1, { message: "Folder path is required (try / for root)." }),
  filePattern: z.string().optional(),
});

export type OneDriveTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OneDriveTriggerFormValues) => void;
  defaultValues?: Partial<OneDriveTriggerFormValues>;
  variables: VariableItem[];
}

export const OneDriveTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  variables,
}) => {
  const form = useForm<OneDriveTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      providerAccountId: defaultValues?.providerAccountId || "",
      variableName: defaultValues?.variableName || "oneDriveTrigger",
      folderPath: defaultValues?.folderPath || "/",
      filePattern: defaultValues?.filePattern || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        providerAccountId: defaultValues?.providerAccountId || "",
        variableName: defaultValues?.variableName || "oneDriveTrigger",
        folderPath: defaultValues?.folderPath || "/",
        filePattern: defaultValues?.filePattern || "",
      });
    }
  }, [
    open,
    defaultValues?.providerAccountId,
    defaultValues?.variableName,
    defaultValues?.folderPath,
    defaultValues?.filePattern,
    form,
  ]);

  const handleSubmit = (values: OneDriveTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent
        side="right"
        className="overflow-y-auto border-border bg-background p-0"
      >
        <div className="sticky top-0 z-10 border-b border-border bg-background px-6 py-4">
          <SheetHeader>
            <SheetTitle>OneDrive Trigger</SheetTitle>
            <SheetDescription>
              Trigger workflow when files change in OneDrive
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="px-6 py-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="providerAccountId"
                render={({ field }) => (
                  <FormItem>
                    <WorkflowProviderAccountSelect
                      nodeType={NodeType.ONEDRIVE_TRIGGER}
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="variableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variable Name</FormLabel>
                    <FormControl>
                      <Input placeholder="oneDriveTrigger" {...field} />
                    </FormControl>
                    <FormDescription>
                      Name to store file change data in workflow context
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="bg-border" />

              <FormField
                control={form.control}
                name="folderPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Folder Path</FormLabel>
                    <FormControl>
                      <Input placeholder="/" {...field} />
                    </FormControl>
                    <FormDescription>
                      OneDrive folder path to monitor (e.g., / for root,
                      /Documents)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="filePattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Name Filter (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="invoice" {...field} />
                    </FormControl>
                    <FormDescription>
                      Only trigger for file names containing this text
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="sticky bottom-0 border-t border-border bg-background px-6 py-4">
                <Button type="submit">Save Configuration</Button>
              </SheetFooter>
            </form>
          </Form>
        </div>
      </ResizableSheetContent>
    </Sheet>
  );
};
