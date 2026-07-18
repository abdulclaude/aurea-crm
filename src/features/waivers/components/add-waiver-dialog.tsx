"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import { useUploadThing } from "@/utils/uploadthing";
import { addWaiverSchema, type AddWaiverValues } from "./add-waiver-schema";
import { WaiverBooleanField } from "./waiver-boolean-field";
import { WaiverDocumentPicker } from "./waiver-document-picker";

export function AddWaiverDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { startUpload, isUploading } = useUploadThing("waiverDocument");
  const form = useForm<AddWaiverValues>({
    resolver: zodResolver(addWaiverSchema),
    defaultValues: {
      name: "",
      content: "",
      isRequired: true,
      requiresMinor: false,
    },
  });
  const createWaiver = useMutation(
    trpc.waivers.createTemplate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.waivers.listTemplates.queryKey(),
        });
        form.reset();
        onOpenChange(false);
        toast.success("Waiver added");
      },
    }),
  );

  const handleSubmit = async (values: AddWaiverValues) => {
    try {
      const uploads = await startUpload([values.document]);
      const uploaded = uploads?.[0];
      if (!uploaded) throw new Error("The PDF could not be uploaded.");

      const { document, ...template } = values;
      const metadata = uploaded.serverData;
      await createWaiver.mutateAsync({
        ...template,
        documentUrl: metadata.url,
        documentName: metadata.fileName || document.name,
        documentKey: metadata.uploadKey,
        documentSize: metadata.fileSize,
        documentMimeType: "application/pdf",
        uploadReceipt: metadata.uploadReceipt,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add waiver");
    }
  };

  const isSubmitting = isUploading || createWaiver.isPending;

  React.useEffect(() => {
    if (!open) form.reset();
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add waiver</DialogTitle>
          <DialogDescription>
            Create a reusable waiver template for this workspace.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Waiver name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Liability waiver" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Waiver content</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={9}
                      placeholder="Enter the terms clients must review and sign..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="document"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Waiver PDF</FormLabel>
                  <FormControl>
                    <WaiverDocumentPicker
                      file={field.value}
                      disabled={isSubmitting}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload one PDF up to 16 MB. Clients will review this document
                    when signing.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <WaiverBooleanField
                control={form.control}
                name="isRequired"
                label="Required for clients"
              />
              <WaiverBooleanField
                control={form.control}
                name="requiresMinor"
                label="Requires guardian for minors"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-max"
                variant="gradient"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : null}
                {isUploading ? "Uploading PDF" : "Add waiver"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
