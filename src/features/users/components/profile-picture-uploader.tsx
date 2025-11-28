"use client";

import { Upload, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { UploadThingError } from "uploadthing/server";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  type FileUploadProps,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { useUploadThing } from "@/utils/uploadthing";

export function ProfilePictureUploader({
  value,
  onChange,
  disabled,
  className,
  userName,
}: {
  value?: string | null;
  onChange: (url?: string | null) => void;
  disabled?: boolean;
  className?: string;
  userName: string;
}) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);

  // Keep a ref to the latest progress reporter and current files
  const progressRef = React.useRef<
    ((file: File | undefined, progress: number) => void) | null
  >(null);
  const currentFilesRef = React.useRef<File[]>([]);

  const { startUpload } = useUploadThing("profilePicture", {
    onUploadProgress: (progress: number) => {
      const reporter = progressRef.current;
      if (!reporter) return;
      currentFilesRef.current.forEach((f) => {
        reporter(f, progress);
      });
    },
  });

  const onUpload: NonNullable<FileUploadProps["onUpload"]> = React.useCallback(
    async (incoming, { onProgress }) => {
      try {
        setIsUploading(true);
        // set refs so the hook callbacks can use the latest
        progressRef.current = (file, p) => onProgress(file as File, p);
        currentFilesRef.current = incoming;

        const res = (await startUpload(incoming)) ?? [];
        const url = (res[0]?.url as string) || undefined;
        if (url) {
          onChange(url);
          toast.success("Profile picture updated");
        } else {
          toast.error("No URL returned");
        }
      } catch (error) {
        if (error instanceof UploadThingError) {
          toast.error(error.message);
        } else {
          toast.error(error instanceof Error ? error.message : "Upload failed");
        }
      } finally {
        setIsUploading(false);
      }
    },
    [startUpload, onChange]
  );

  if (value) {
    return (
      <div className={className}>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={value} alt={userName} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-2xl font-medium uppercase">
              {userName[0]}
              {userName[1]}
            </AvatarFallback>
          </Avatar>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(null)}
              disabled={disabled || isUploading}
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Immediate mode: upload on selection
  return (
    <FileUpload
      accept="image/*"
      maxFiles={1}
      maxSize={4 * 1024 * 1024}
      className={className ?? "w-full"}
      onAccept={(files) => setFiles(files)}
      onUpload={onUpload}
      onFileReject={(file, message) =>
        toast(message, {
          description: `"${
            file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name
          }" has been rejected`,
        })
      }
      multiple={false}
      disabled={isUploading || disabled}
    >
      <FileUploadDropzone>
        <div className="flex flex-col items-center gap-1 text-center">
          <Avatar className="h-20 w-20 mb-3">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-2xl font-medium uppercase">
              {userName[0]}
              {userName[1]}
            </AvatarFallback>
          </Avatar>
          <p className="font-medium text-sm">Drag & drop an image here</p>
          <p className="text-muted-foreground text-xs">Max 1 file, up to 4MB</p>
        </div>
        <FileUploadTrigger asChild>
          <Button variant="outline" size="sm" className="mt-3 w-fit text-xs">
            Browse files
          </Button>
        </FileUploadTrigger>
      </FileUploadDropzone>
      <FileUploadList>
        {files.map((file) => (
          <FileUploadItem key={file.name} value={file}>
            <div className="flex w-full items-center gap-2">
              <FileUploadItemPreview />
              <FileUploadItemMetadata />
            </div>
            <FileUploadItemProgress />
          </FileUploadItem>
        ))}
      </FileUploadList>
    </FileUpload>
  );
}
