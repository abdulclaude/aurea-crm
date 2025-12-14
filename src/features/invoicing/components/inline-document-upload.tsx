"use client";

import { useState } from "react";
import { Loader2, FileText, X } from "lucide-react";

import { IconCloudUpload as UploadIcon } from "central-icons/IconCloudUpload";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUploadThing } from "@/utils/uploadthing";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { IconFilePdf as PDFIcon } from "central-icons/IconFilePdf";

interface InlineDocumentUploadProps {
  invoiceId: string;
  documentUrl?: string | null;
  documentName?: string | null;
}

export function InlineDocumentUpload({
  invoiceId,
  documentUrl,
  documentName,
}: InlineDocumentUploadProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload, isUploading: uploadThingUploading } = useUploadThing(
    "invoiceDocument",
    {
      onClientUploadComplete: async (res) => {
        if (res && res[0]) {
          const file = res[0];
          // Update invoice with document URL and name
          await updateDocumentMutation.mutateAsync({
            id: invoiceId,
            documentUrl: file.url,
            documentName: file.name,
          });
        }
      },
      onUploadError: (error: Error) => {
        console.error("Upload error:", error);
        toast.error(`Upload failed: ${error.message}`);
        setIsUploading(false);
      },
    }
  );

  const updateDocumentMutation = useMutation(
    trpc.invoices.updateDocument.mutationOptions({
      onSuccess: () => {
        toast.success("Document uploaded successfully!");
        setIsUploading(false);
        // Invalidate queries to refresh the list
        queryClient.invalidateQueries({
          queryKey: trpc.invoices.list.queryOptions({}).queryKey,
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update document");
        setIsUploading(false);
      },
    })
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (16MB max)
    if (file.size > 16 * 1024 * 1024) {
      toast.error("File size must be less than 16MB");
      return;
    }

    setIsUploading(true);
    try {
      await startUpload([file]);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
      setIsUploading(false);
    }
  };

  const isLoading =
    isUploading || uploadThingUploading || updateDocumentMutation.isPending;

  // If no document, show upload badge
  if (!documentUrl) {
    return (
      <div className="flex ">
        <input
          type="file"
          id={`upload-${invoiceId}`}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          disabled={isLoading}
        />
        <Badge
          variant="outline"
          className="cursor-pointer text-[11px] font-medium text-primary hover:bg-accent hover:text-primary transition-colors gap-2 py-1.5 px-3"
          onClick={(e) => {
            e.stopPropagation();
            if (!isLoading) {
              document.getElementById(`upload-${invoiceId}`)?.click();
            }
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadIcon className="size-3.5!" />
              Add invoice
            </>
          )}
        </Badge>
      </div>
    );
  }

  // If document exists, show preview
  const isPdf =
    documentUrl.toLowerCase().endsWith(".pdf") || documentUrl.includes("/pdf/");
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(documentUrl);

  // Use stored document name or extract from URL
  const getFileName = () => {
    // If we have a stored document name, use it
    if (documentName) {
      return documentName.length > 30
        ? `${documentName.substring(0, 27)}...`
        : documentName;
    }

    // Otherwise extract from URL
    try {
      const urlObj = new URL(documentUrl);
      const pathname = urlObj.pathname;
      const segments = pathname.split("/");
      const fileName = segments[segments.length - 1];
      // Decode URI component and limit length
      const decodedName = decodeURIComponent(fileName);
      return decodedName.length > 30
        ? `${decodedName.substring(0, 27)}...`
        : decodedName;
    } catch {
      return isPdf ? "invoice.pdf" : isImage ? "image.jpg" : "document";
    }
  };

  const fileName = getFileName();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          window.open(documentUrl, "_blank");
        }}
        className="group relative flex items-center gap-2 rounded-full ring ring-black/10 bg-background/50 px-2 py-1.5 transition-colors hover:border-primary/50 hover:bg-accent/50 shadow-xs"
      >
        {isImage ? (
          <div className="relative size-8 rounded ring ring-black/10 overflow-hidden">
            <img
              src={documentUrl}
              alt="Invoice document"
              className="size-full object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.innerHTML =
                  '<div class="flex items-center justify-center size-full bg-muted"><svg class="size-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
              }}
            />
          </div>
        ) : isPdf ? (
          <PDFIcon className="size-4 text-red-500" />
        ) : (
          <PDFIcon className="size-4 text-primary" />
        )}
        <span
          className="text-[11px] text-primary transition-colors truncate max-w-[75px]"
          title={fileName}
        >
          {fileName}
        </span>
      </button>
    </div>
  );
}
