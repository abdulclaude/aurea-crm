"use client";

import { FileText, Upload, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WaiverDocumentPickerProps = {
  disabled: boolean;
  file?: File;
  onChange: (file?: File) => void;
};

export function WaiverDocumentPicker({
  disabled,
  file,
  onChange,
}: WaiverDocumentPickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = "";
  }, [file]);

  const clearFile = () => {
    if (inputRef.current) inputRef.current.value = "";
    onChange(undefined);
  };

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        disabled={disabled}
        aria-label="Upload waiver PDF"
        onChange={(event) => onChange(event.target.files?.[0])}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-md border border-black/5 px-3 py-2.5 dark:border-white/5">
          <FileText className="size-5 shrink-0 text-primary/60" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-primary">{file.name}</p>
            <p className="text-[11px] text-primary/50">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label="Remove waiver PDF"
            onClick={clearFile}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center border-dashed"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          Choose PDF
        </Button>
      )}
    </div>
  );
}
