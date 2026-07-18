"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function IssueResolutionDialog({
  open,
  isPending,
  onOpenChange,
  onResolve,
}: {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (resolutionNote: string) => void;
}) {
  const [note, setNote] = React.useState("");
  React.useEffect(() => {
    if (!open) setNote("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve reconciliation issue</DialogTitle>
          <DialogDescription>Record the verified outcome for the audit trail.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="resolution-note">Resolution note</Label>
          <Textarea
            id="resolution-note"
            value={note}
            maxLength={1_000}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={isPending || note.trim().length < 3} onClick={() => onResolve(note.trim())}>
            Resolve issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
