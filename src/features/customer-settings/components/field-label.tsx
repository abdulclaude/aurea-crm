import * as React from "react";

import { Label } from "@/components/ui/label";

export function FieldLabel({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
