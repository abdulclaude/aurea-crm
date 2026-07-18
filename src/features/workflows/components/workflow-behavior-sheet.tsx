"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  ResizableSheetContent,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { WorkflowBehaviorConfig } from "@/features/workflows/lib/workflow-behavior";
import { useTRPC } from "@/trpc/client";

export function WorkflowBehaviorSheet({
  workflowId,
  behavior,
}: {
  workflowId: string;
  behavior: WorkflowBehaviorConfig;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [enrollment, setEnrollment] = useState(behavior.enrollment);
  useEffect(() => setEnrollment(behavior.enrollment), [behavior.enrollment]);
  const update = useMutation(
    trpc.workflows.updateBehavior.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.workflows.getOne.queryOptions({ id: workflowId }),
        );
        setOpen(false);
        toast.success("Workflow behavior saved");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant="ghost"
        className="hidden h-8 rounded-lg text-xs sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        Behavior
      </Button>
      <ResizableSheetContent className="overflow-y-auto border-border bg-background sm:max-w-lg">
        <SheetHeader className="gap-1 px-6 pb-1 pt-8">
          <SheetTitle>Behavior</SheetTitle>
          <SheetDescription>
            Control how people enter this workflow.
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-5" />
        <div className="space-y-3 px-6">
          <Label>Enrollment</Label>
          <RadioGroup
            value={enrollment}
            onValueChange={(value) =>
              setEnrollment(value as WorkflowBehaviorConfig["enrollment"])
            }
          >
            <EnrollmentOption
              value="EVERY_EVENT"
              title="Every matching event"
              description="A member can enter again whenever the trigger happens."
            />
            <EnrollmentOption
              value="ONCE_PER_MEMBER"
              title="Only once per member"
              description="Later matching events are recorded as skipped."
            />
          </RadioGroup>
        </div>
        <SheetFooter className="mt-6 px-6">
          <Button
            variant="gradient"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ id: workflowId, behavior: { enrollment } })
            }
          >
            {update.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Save behavior
          </Button>
        </SheetFooter>
      </ResizableSheetContent>
    </Sheet>
  );
}

function EnrollmentOption({
  value,
  title,
  description,
}: {
  value: WorkflowBehaviorConfig["enrollment"];
  title: string;
  description: string;
}) {
  return (
    <Label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 font-normal">
      <RadioGroupItem value={value} className="mt-0.5" />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </Label>
  );
}
