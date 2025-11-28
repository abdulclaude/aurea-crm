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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required.")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter/underscore and contain only letters, numbers, and underscores.",
    }),
  action: z.enum(["upload", "download", "delete"]),
  filePath: z.string().min(1, "File path is required."),
  content: z.string().optional(),
});

export type OneDriveExecutionFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OneDriveExecutionFormValues) => void;
  defaultValues?: Partial<OneDriveExecutionFormValues>;
  variables: VariableItem[];
}

export const OneDriveExecutionDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  variables,
}) => {
  const form = useForm<OneDriveExecutionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "oneDriveFile",
      action: defaultValues?.action || "upload",
      filePath: defaultValues?.filePath || "",
      content: defaultValues?.content || "",
    },
  });

  const action = form.watch("action");

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues?.variableName || "oneDriveFile",
        action: defaultValues?.action || "upload",
        filePath: defaultValues?.filePath || "",
        content: defaultValues?.content || "",
      });
    }
  }, [open, defaultValues?.variableName, defaultValues?.action, defaultValues?.filePath, defaultValues?.content, form]);

  const handleSubmit = (values: OneDriveExecutionFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent side="right" className="overflow-y-auto p-0">
        <div className="sticky top-0 z-10 border-b border-white/5 bg-[#202e32] px-6 py-4">
          <SheetHeader>
            <SheetTitle>OneDrive File Operation</SheetTitle>
            <SheetDescription>
              Upload, download, or delete files in OneDrive
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
                name="variableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variable Name</FormLabel>
                    <FormControl>
                      <Input placeholder="oneDriveFile" {...field} />
                    </FormControl>
                    <FormDescription>
                      Name to store response in workflow context
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="bg-white/5" />

              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="upload">Upload File</SelectItem>
                        <SelectItem value="download">Download File</SelectItem>
                        <SelectItem value="delete">Delete File</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="filePath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Path</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="/Documents/file.txt"
                        variables={variables}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Path to the file in OneDrive
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {action === "upload" && (
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <VariableInput
                          placeholder="File content..."
                          variables={variables}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Content to upload to the file
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <SheetFooter className="sticky bottom-0 border-t border-white/5 bg-[#202e32] px-6 py-4">
                <Button type="submit">Save Configuration</Button>
              </SheetFooter>
            </form>
          </Form>
        </div>
      </ResizableSheetContent>
    </Sheet>
  );
};
