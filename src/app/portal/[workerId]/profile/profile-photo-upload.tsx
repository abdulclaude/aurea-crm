"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUploadThing } from "@/utils/uploadthing";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

interface ProfilePhotoUploadProps {
  workerId: string;
  onSuccess: () => void;
}

export function ProfilePhotoUpload({
  workerId,
  onSuccess,
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const trpc = useTRPC();

  const { startUpload, isUploading: uploadThingUploading } = useUploadThing(
    "workerProfilePhoto",
    {
      onClientUploadComplete: async (res) => {
        if (res && res[0]) {
          const file = res[0];
          // Update worker profile photo
          await updatePhotoMutation.mutateAsync({
            workerId,
            profilePhoto: file.url,
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

  const updatePhotoMutation = useMutation(
    trpc.workers.updateProfilePhoto.mutationOptions({
      onSuccess: () => {
        toast.success("Profile photo updated successfully!");
        setIsUploading(false);
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update profile photo");
        setIsUploading(false);
      },
    })
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (4MB max)
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image size must be less than 4MB");
      return;
    }

    setIsUploading(true);
    try {
      await startUpload([file]);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo");
      setIsUploading(false);
    }
  };

  const isLoading = isUploading || uploadThingUploading || updatePhotoMutation.isPending;

  return (
    <div>
      <input
        type="file"
        id="profile-photo-upload"
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={isLoading}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => document.getElementById("profile-photo-upload")?.click()}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Camera className="size-4 mr-2" />
            Change Photo
          </>
        )}
      </Button>
    </div>
  );
}
