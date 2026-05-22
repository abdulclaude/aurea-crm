"use client";

import { ChevronLeft, FileArchive, Upload, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MindbodyExportUploadStepProps = {
  file: File | null;
  isSubmitting: boolean;
  onBack: () => void;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MindbodyExportUploadStep({
  file,
  isSubmitting,
  onBack,
  onFileChange,
  onSubmit,
}: MindbodyExportUploadStepProps) {
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="rounded-md border border-dashed border-input bg-muted/25 p-5">
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileArchive className="size-4 text-primary/70" />
              Full Mindbody ZIP export
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Upload the full archive from Mindbody. Aurea will inspect the ZIP,
              find every supported CSV and document inside it, then populate
              your studio with the data from the export.
            </p>
          </div>

          {file ? (
            <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline">ZIP</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isSubmitting}
                  onClick={() => onFileChange(null)}
                  aria-label="Remove selected ZIP"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <Button asChild variant="outline" className="shadow-none">
              <Label
                htmlFor="mindbody-onboarding-export"
                className="cursor-pointer"
              >
                Choose ZIP
              </Label>
            </Button>
          )}

          <Input
            key={file?.name ?? "empty"}
            id="mindbody-onboarding-export"
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            disabled={isSubmitting}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="gap-1.5"
          disabled={isSubmitting}
        >
          <ChevronLeft className="size-3.5" />
          Back
        </Button>

        <Button
          type="submit"
          variant="gradient"
          className="flex-1"
          disabled={isSubmitting}
        >
          Start Mindbody import
        </Button>
      </div>
    </form>
  );
}
