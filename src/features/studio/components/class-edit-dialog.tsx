"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
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
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

import {
  ClassEditFields,
  editableClassStatus,
  type EditableClassStatus,
} from "./class-edit-fields";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ClassDetail = NonNullable<
  RouterOutput["studioClassesEnhanced"]["getById"]
>;

type ClassEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioClass: ClassDetail;
};

export function ClassEditDialog({
  open,
  onOpenChange,
  studioClass,
}: ClassEditDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState(studioClass.name);
  const [description, setDescription] = React.useState(
    studioClass.description ?? "",
  );
  const [status, setStatus] = React.useState<EditableClassStatus>(
    editableClassStatus(studioClass.status),
  );
  const [startTime, setStartTime] = React.useState(
    toDateTimeInput(studioClass.startTime),
  );
  const [endTime, setEndTime] = React.useState(
    toDateTimeInput(studioClass.endTime),
  );
  const [maxCapacity, setMaxCapacity] = React.useState(
    studioClass.maxCapacity?.toString() ?? "",
  );
  const [cancellationPolicyId, setCancellationPolicyId] = React.useState(
    studioClass.cancellationPolicyId ?? "",
  );
  const { data: cancellationPolicies = [] } = useQuery({
    ...trpc.cancellationPolicy.list.queryOptions(),
    enabled: open,
  });

  React.useEffect(() => {
    if (!open) return;
    setName(studioClass.name);
    setDescription(studioClass.description ?? "");
    setStatus(editableClassStatus(studioClass.status));
    setStartTime(toDateTimeInput(studioClass.startTime));
    setEndTime(toDateTimeInput(studioClass.endTime));
    setMaxCapacity(studioClass.maxCapacity?.toString() ?? "");
    setCancellationPolicyId(studioClass.cancellationPolicyId ?? "");
  }, [open, studioClass]);

  const updateMutation = useMutation(
    trpc.studioClassesEnhanced.update.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.studioClassesEnhanced.getById.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.studioClassesEnhanced.getSchedule.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.studioClassesEnhanced.list.queryKey(),
          }),
        ]);
        toast.success("Class updated");
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleSave(): void {
    const policyChanged =
      cancellationPolicyId !== (studioClass.cancellationPolicyId ?? "");
    updateMutation.mutate({
      id: studioClass.id,
      name: name.trim(),
      description: description.trim() || null,
      status,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      maxCapacity: maxCapacity.trim() ? Number(maxCapacity) : null,
      ...(policyChanged
        ? { cancellationPolicyId: cancellationPolicyId || null }
        : {}),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit class</DialogTitle>
          <DialogDescription>
            Update this class and its cancellation policy assignment.
          </DialogDescription>
        </DialogHeader>

        <ClassEditFields
          cancellationPolicies={cancellationPolicies}
          cancellationPolicyId={cancellationPolicyId}
          currentCancellationPolicyId={studioClass.cancellationPolicyId}
          description={description}
          endTime={endTime}
          maxCapacity={maxCapacity}
          name={name}
          setCancellationPolicyId={setCancellationPolicyId}
          setDescription={setDescription}
          setEndTime={setEndTime}
          setMaxCapacity={setMaxCapacity}
          setName={setName}
          setStartTime={setStartTime}
          setStatus={setStatus}
          startTime={startTime}
          status={status}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="gradient"
            className="w-max"
            onClick={handleSave}
            disabled={!name.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toDateTimeInput(value: string | Date): string {
  return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
}
