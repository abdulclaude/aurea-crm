"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";

import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  fileId: z.string().min(1, "FileId is required"),
  destinationFolderId: z.string().min(1, "DestinationFolderId is required"),
});

export type OnedriveMoveFileFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OnedriveMoveFileFormValues) => void;
  defaultValues?: Partial<OnedriveMoveFileFormValues>;
  variables: VariableItem[];
}

export const OnedriveMoveFileDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "movedFile",
      fileId: defaultValues.fileId || "",
      destinationFolderId: defaultValues.destinationFolderId || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "movedFile",
        fileId: defaultValues.fileId || "",
        destinationFolderId: defaultValues.destinationFolderId || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>OneDrive: Move File Configuration</SheetTitle>
          <SheetDescription>
            Move a file in OneDrive
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
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="movedFile" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference the result in other nodes using this variable name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File Id</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="fileId or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destinationFolderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Folder Id</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="destinationFolderId or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="px-0 pb-4">
              <Button
                type="submit"
                className="w-max ml-auto"
                variant="gradient"
              >
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
