"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Users } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AudienceFilterFields } from "@/features/audiences/components/audience-filter-fields";
import {
  createEmptyAudienceDefinition,
  savedAudienceDefinitionSchema,
  type SavedAudienceDefinition,
} from "@/features/audiences/lib/audience-definition";
import type { SavedAudienceRow } from "@/features/audiences/types";
import { useTRPC } from "@/trpc/client";

type AudienceEditorDialogProps = {
  audience: SavedAudienceRow | null;
  open: boolean;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AudienceEditorDialog({
  audience,
  open,
  canManage,
  onOpenChange,
}: AudienceEditorDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [definition, setDefinition] = React.useState<SavedAudienceDefinition>(
    createEmptyAudienceDefinition,
  );
  const [previewDefinition, setPreviewDefinition] =
    React.useState<SavedAudienceDefinition | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(audience?.name ?? "");
    setDescription(audience?.description ?? "");
    setDefinition(audience?.definition ?? createEmptyAudienceDefinition());
    setPreviewDefinition(null);
  }, [audience, open]);

  const members = useQuery({
    ...trpc.clients.getLocationMembers.queryOptions(),
    enabled: open,
  });
  const instructors = useQuery({
    ...trpc.clients.getInstructors.queryOptions(),
    enabled: open,
  });
  const membershipPlans = useQuery({
    ...trpc.membershipPlans.list.queryOptions({ includeInactive: true }),
    enabled: open,
  });
  const preview = useQuery({
    ...trpc.savedAudiences.preview.queryOptions({
      mode: "definition",
      definition: previewDefinition ?? definition,
    }),
    enabled: open && previewDefinition !== null,
  });

  const onSaved = React.useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: trpc.savedAudiences.list.queryKey(),
    });
    toast.success(audience ? "Audience updated" : "Audience created");
    onOpenChange(false);
  }, [audience, onOpenChange, queryClient, trpc.savedAudiences.list]);

  const createAudience = useMutation(
    trpc.savedAudiences.create.mutationOptions({
      onSuccess: onSaved,
      onError: (error) => toast.error(error.message),
    }),
  );
  const updateAudience = useMutation(
    trpc.savedAudiences.update.mutationOptions({
      onSuccess: onSaved,
      onError: (error) => toast.error(error.message),
    }),
  );

  const readOnly = !canManage || Boolean(audience?.archivedAt);
  const pending = createAudience.isPending || updateAudience.isPending;

  function updateDefinition(next: SavedAudienceDefinition): void {
    setDefinition(next);
    setPreviewDefinition(null);
  }

  function validateDefinition(): SavedAudienceDefinition | null {
    const parsed = savedAudienceDefinitionSchema.safeParse(definition);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the audience filters.");
      return null;
    }
    return parsed.data;
  }

  function save(): void {
    if (!name.trim()) {
      toast.error("Enter an audience name.");
      return;
    }
    const parsed = validateDefinition();
    if (!parsed) return;
    const values = {
      name: name.trim(),
      description: description.trim() || null,
      definition: parsed,
    };
    if (audience) {
      updateAudience.mutate({ id: audience.id, ...values });
    } else {
      createAudience.mutate(values);
    }
  }

  function runPreview(): void {
    const parsed = validateDefinition();
    if (parsed) setPreviewDefinition(parsed);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{audience ? audience.name : "Create audience"}</DialogTitle>
          <DialogDescription>
            Filters always apply inside the active organization and location.
          </DialogDescription>
        </DialogHeader>
        <Separator className="bg-black/5 dark:bg-white/5" />
        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-1">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="audience-name">Name</Label>
              <Input
                id="audience-name"
                value={name}
                disabled={readOnly}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience-description">Description</Label>
              <Textarea
                id="audience-description"
                value={description}
                disabled={readOnly}
                className="min-h-9"
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          <Separator className="bg-black/5 dark:bg-white/5" />
          <AudienceFilterFields
            definition={definition}
            disabled={readOnly}
            assignees={(members.data ?? []).map((member) => ({
              value: member.id,
              label: member.name,
            }))}
            instructors={(instructors.data ?? []).map((instructor) => ({
              value: instructor.id,
              label: instructor.name,
            }))}
            membershipPlans={(membershipPlans.data ?? []).map((plan) => ({
              value: plan.id,
              label: plan.name,
            }))}
            onChange={updateDefinition}
          />
        </div>
        <Separator className="bg-black/5 dark:bg-white/5" />
        <DialogFooter className="items-center justify-between px-6 pb-6 sm:justify-between">
          <div className="min-h-8 text-xs text-primary/65">
            {preview.isFetching ? (
              <span className="flex items-center gap-2">
                <LoaderCircle className="size-3.5 animate-spin" /> Counting customers
              </span>
            ) : preview.data ? (
              <span>
                {preview.data.count.toLocaleString()} match, {" "}
                {preview.data.email.eligible.toLocaleString()} emailable, {" "}
                {preview.data.email.suppressed.toLocaleString()} suppressed, {" "}
                {preview.data.email.invalid.toLocaleString()} invalid
              </span>
            ) : null}
            {preview.data?.warnings.map((warning) => (
              <p key={warning} className="text-amber-600">{warning}</p>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={runPreview}>
              <Users className="size-3.5" /> Preview
            </Button>
            {!readOnly ? (
              <Button type="button" disabled={pending} onClick={save}>
                {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                {audience ? "Save changes" : "Create audience"}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
