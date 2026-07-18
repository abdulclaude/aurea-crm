"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTRPC } from "@/trpc/client";

export function FormSubmissionDeleteButton({
  formId,
  submissionId,
}: {
  formId: string;
  submissionId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation(
    trpc.forms.deleteSubmission.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.forms.getSubmissions.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.forms.get.queryKey({ id: formId }),
          }),
        ]);
        setOpen(false);
        toast.success("Form response deleted");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive"
            onClick={() => setOpen(true)}
            aria-label="Delete form response"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete response</TooltipContent>
      </Tooltip>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this form response?</AlertDialogTitle>
            <AlertDialogDescription>
              The submitted values will be permanently removed. The minimal
              consent and delivery receipt remains for audit and replay safety.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => remove.mutate({ formId, submissionId })}
            >
              Delete response
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
