"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ResizableSheetContent,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type StudioNodeDialogLayoutProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
};

export function StudioNodeDialogLayout({
  open,
  onOpenChange,
  title,
  description,
  children,
}: StudioNodeDialogLayoutProps): React.ReactElement {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto border-border bg-background sm:max-w-xl">
        <SheetHeader className="gap-1 px-6 pb-1 pt-8">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <Separator className="my-5" />
        {children}
      </ResizableSheetContent>
    </Sheet>
  );
}

export function StudioNodeDialogFooter(): React.ReactElement {
  return (
    <SheetFooter className="px-0 pb-4">
      <Button type="submit" className="ml-auto w-max" variant="gradient">
        Save changes
      </Button>
    </SheetFooter>
  );
}
