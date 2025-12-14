"use client";

import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUploadThing } from "@/utils/uploadthing";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

interface DocumentUploadButtonProps {
  workerId: string;
  documentId: string;
  onSuccess: () => void;
}

export function DocumentUploadButton({
  workerId,
  documentId,
  onSuccess,
}: DocumentUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const trpc = useTRPC();

  const { startUpload, isUploading: uploadThingUploading } = useUploadThing(
    "workerDocument",
    {
      onClientUploadComplete: async (res) => {
        if (res && res[0]) {
          const file = res[0];
          // Update document with file info
          await updateDocumentMutation.mutateAsync({
            workerId,
            documentId,
            fileUrl: file.url,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
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
    trpc.workers.uploadDocumentFile.mutationOptions({
      onSuccess: () => {
        toast.success("Document uploaded successfully!");
        setIsUploading(false);
        onSuccess();
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

  const isLoading = isUploading || uploadThingUploading || updateDocumentMutation.isPending;

  return (
    <div>
      <input
        type="file"
        id={`upload-${documentId}`}
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        disabled={isLoading}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => document.getElementById(`upload-${documentId}`)?.click()}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="size-4 mr-2" />
            Upload File
          </>
        )}
      </Button>
    </div>
  );
}
