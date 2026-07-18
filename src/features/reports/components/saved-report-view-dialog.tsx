"use client";

import { LoaderCircle, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SavedReportViewDialogProps = {
  editing: boolean;
  name: string;
  onArchive: () => void;
  onNameChange: (name: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onVisibilityChange: (visibility: "PERSONAL" | "LOCATION") => void;
  open: boolean;
  pending: boolean;
  visibility: "PERSONAL" | "LOCATION";
};

export function SavedReportViewDialog(props: SavedReportViewDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {props.editing ? "Update report view" : "Save report view"}
          </DialogTitle>
          <DialogDescription>
            Keep the current filters, sort, date range, columns, and page size.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-view-name">Name</Label>
            <Input
              id="report-view-name"
              value={props.name}
              onChange={(event) => props.onNameChange(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              value={props.visibility}
              onValueChange={(value) =>
                props.onVisibilityChange(value as "PERSONAL" | "LOCATION")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERSONAL">Personal</SelectItem>
                <SelectItem value="LOCATION">Location team</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="items-center">
          {props.editing ? (
            <Button
              variant="ghost"
              className="mr-auto"
              disabled={props.pending}
              onClick={props.onArchive}
            >
              <Trash2 className="size-3.5" /> Archive
            </Button>
          ) : null}
          <Button
            disabled={props.pending || !props.name.trim()}
            onClick={props.onSave}
          >
            {props.pending ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {props.editing ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
