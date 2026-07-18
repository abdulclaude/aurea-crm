import { useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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
import type { ContentLibraryKind } from "@/features/content-settings/contracts";
import { useTRPC } from "@/trpc/client";

import { initialContentFormValues } from "./content-form-values";
import { FaqEditor } from "./faq-editor";
import { MacroEditor } from "./macro-editor";
import { ProfileEditor } from "./profile-editor";
import { TerminologyEditor } from "./terminology-editor";
import { KIND_LABELS, type ContentItem } from "./types";

export function ContentItemDialog({ open, kind, item, onOpenChange, onSaved }: { open: boolean; kind: ContentLibraryKind; item: ContentItem | null; onOpenChange: (open: boolean) => void; onSaved: () => Promise<void> }): React.JSX.Element {
  const trpc = useTRPC();
  const [values, setValues] = React.useState(() => initialContentFormValues(kind, item));
  const create = useMutation(trpc.contentSettings.create.mutationOptions());
  const createVersion = useMutation(trpc.contentSettings.createVersion.mutationOptions());

  React.useEffect(() => {
    if (open) setValues(initialContentFormValues(kind, item));
  }, [item, kind, open]);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      if (item) {
        await createVersion.mutateAsync({ itemId: item.id, expectedVersion: item.currentVersion, name: values.name, description: values.description || null, payload: values.payload, changeNote: values.changeNote || null });
      } else {
        await create.mutateAsync({ name: values.name, key: values.key, description: values.description || null, payload: values.payload, changeNote: values.changeNote || null });
      }
      toast.success(item ? "New content version saved" : "Reusable content created");
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reusable content could not be saved");
    }
  };

  const setKey = (key: string): void => {
    setValues((current) => ({ ...current, key, payload: current.payload.kind === "PUBLIC_PROFILE" ? { ...current.payload, slug: key } : current.payload }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{item ? `Edit ${item.name}` : `Add ${KIND_LABELS[kind].toLowerCase()}`}</DialogTitle>
            <DialogDescription>{item ? `Saving creates version ${item.currentVersion + 1}; published content stays unchanged until you publish.` : "Create a reusable draft. Review it before publishing it to runtime consumers."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="content-name">Name</Label><Input id="content-name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required /></div>
              <div className="space-y-1"><Label htmlFor="content-key">Key</Label><Input id="content-key" value={values.key} disabled={Boolean(item)} onChange={(event) => setKey(event.target.value.toLowerCase().replaceAll(" ", "-"))} required /></div>
              <div className="space-y-1 sm:col-span-2"><Label htmlFor="content-description">Description</Label><Input id="content-description" value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></div>
            </div>
            {values.payload.kind === "TERMINOLOGY_PACK" ? <TerminologyEditor value={values.payload} onChange={(payload) => setValues({ ...values, payload })} /> : null}
            {values.payload.kind === "FAQ_COLLECTION" ? <FaqEditor value={values.payload} onChange={(payload) => setValues({ ...values, payload })} /> : null}
            {values.payload.kind === "MESSAGE_MACRO" ? <MacroEditor value={values.payload} onChange={(payload) => setValues({ ...values, payload })} /> : null}
            {values.payload.kind === "PUBLIC_PROFILE" ? <ProfileEditor value={values.payload} onChange={(payload) => setValues({ ...values, payload })} /> : null}
            <div className="space-y-1"><Label htmlFor="content-change-note">Change note</Label><Input id="content-change-note" value={values.changeNote} onChange={(event) => setValues({ ...values, changeNote: event.target.value })} maxLength={240} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={create.isPending || createVersion.isPending}><Save className="size-4" /> Save draft</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
