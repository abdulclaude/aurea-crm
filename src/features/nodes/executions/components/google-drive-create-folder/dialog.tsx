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
  folderName: z.string().min(1, "Folder name is required"),
  parentFolderId: z.string().optional(),
});

export type GoogleDriveCreateFolderFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleDriveCreateFolderFormValues) => void;
  defaultValues?: Partial<GoogleDriveCreateFolderFormValues>;
  variables: VariableItem[];
}

export const GoogleDriveCreateFolderDialog: React.FC<Props> = ({
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
      variableName: defaultValues.variableName || "newFolder",
      folderName: defaultValues.folderName || "",
      parentFolderId: defaultValues.parentFolderId || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        providerAccountId: defaultValues.providerAccountId || "",
        variableName: defaultValues.variableName || "newFolder",
        folderName: defaultValues.folderName || "",
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
          <SheetTitle>Google Drive create folder configuration</SheetTitle>
          <SheetDescription>
            Create a new folder in Google Drive
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
                    id="google-drive-create-folder-account"
                    nodeType={NodeType.GOOGLE_DRIVE_CREATE_FOLDER}
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
                    <Input placeholder="newFolder" {...field} />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    Access the folder data: <br />
                    <span className="text-primary font-medium tracking-wide">
                      @{field.value || "newFolder"}.id
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="folderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Folder name</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="My Folder"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Name of the folder to create
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
                    ID of the parent folder (leave empty for root)
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
