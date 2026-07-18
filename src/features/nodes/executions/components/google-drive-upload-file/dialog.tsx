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
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { NodeType } from "@/db/enums";
import { WorkflowProviderAccountSelect } from "@/features/workflows/components/workflow-provider-account-select";
import { requiredWorkflowProviderBindingSchema } from "@/features/workflows/lib/workflow-provider-binding";

const formSchema = z.object({
  providerAccountId: requiredWorkflowProviderBindingSchema.shape.providerAccountId,
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore.",
    }),
  fileName: z.string().min(1, "File name is required"),
  content: z.string().min(1, "File content is required"),
  mimeType: z.string().optional(),
  parentFolderId: z.string().optional(),
});

export type GoogleDriveUploadFileFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleDriveUploadFileFormValues) => void;
  defaultValues?: Partial<GoogleDriveUploadFileFormValues>;
  variables: VariableItem[];
}

export const GoogleDriveUploadFileDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      providerAccountId: defaultValues.providerAccountId || "",
      variableName: defaultValues.variableName || "uploadedFile",
      fileName: defaultValues.fileName || "",
      content: defaultValues.content || "",
      mimeType: defaultValues.mimeType || "text/plain",
      parentFolderId: defaultValues.parentFolderId || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        providerAccountId: defaultValues.providerAccountId || "",
        variableName: defaultValues.variableName || "uploadedFile",
        fileName: defaultValues.fileName || "",
        content: defaultValues.content || "",
        mimeType: defaultValues.mimeType || "text/plain",
        parentFolderId: defaultValues.parentFolderId || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-border">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Google Drive upload file configuration</SheetTitle>
          <SheetDescription>
            Upload a file to your Google Drive
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6"
          >
            <FormField
              control={form.control}
              name="providerAccountId"
              render={({ field }) => (
                <FormItem>
                  <WorkflowProviderAccountSelect
                    id="google-drive-upload-file-account"
                    nodeType={NodeType.GOOGLE_DRIVE_UPLOAD_FILE}
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
                  <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input placeholder="uploadedFile" {...field} />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    Access the file data: <br />
                    <span className="text-primary font-medium tracking-wide">
                      @{field.value || "uploadedFile"}.id
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fileName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File name</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="document.txt"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Name of the file to create
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File content</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="File content..."
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Content to write to the file (plain text or base64)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mimeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MIME type (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="text/plain"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    File MIME type (e.g., text/plain, application/pdf)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parentFolderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent folder ID (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="folder_id_here"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Drive folder ID to upload to (leave empty for root)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
              <p className="text-xs text-blue-400">
                <strong>Note:</strong> Make sure you've connected your Google account
                in Settings → Apps.
              </p>
            </div>

            <SheetFooter className="px-0 pb-4">
              <Button type="submit" className="w-max ml-auto" variant="gradient">
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
