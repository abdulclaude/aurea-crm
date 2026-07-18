import { Archive } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CommerceSettingsSection({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function ArchiveButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      aria-label={`Archive ${label}`}
    >
      <Archive className="size-3.5" />
    </Button>
  );
}

export function ReadinessStatus({
  value,
}: {
  value: string;
}): React.JSX.Element {
  return (
    <Badge variant={value === "READY" ? "secondary" : "outline"}>
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
