import { Archive } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";

export function ArchiveButton({
  disabled,
  label,
  onArchive,
}: {
  disabled: boolean;
  label: string;
  onArchive: () => void;
}): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onArchive}
      aria-label={`Archive ${label}`}
    >
      <Archive className="size-3.5" />
    </Button>
  );
}
