"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveX,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Trash2,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportClassRosterCsv,
  exportClassRosterPdf,
  type ClassRosterExportRow,
} from "@/features/studio/lib/class-roster-export";
import { useTRPC } from "@/trpc/client";

type ClassDetailActionsProps = {
  canManage: boolean;
  canManageWorkflows: boolean;
  classId: string;
  className: string;
  organizationSlug: string | null;
  rows: ClassRosterExportRow[];
  startTime: Date | string;
  status: string;
  onEdit: () => void;
};

export function ClassDetailActions(props: ClassDetailActionsProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = React.useState<
    "cancel" | "delete" | "sub" | null
  >(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.studioClassesEnhanced.getById.queryKey({
        classId: props.classId,
      }),
    });
  };
  const cancelClass = useMutation(
    trpc.studioClassesEnhanced.cancel.mutationOptions({
      onSuccess: async () => {
        await refresh();
        setConfirmAction(null);
        toast.success("Class cancelled");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const deleteClass = useMutation(
    trpc.studioClassesEnhanced.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Class deleted");
        router.push("/studio/classes");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const requestSub = useMutation(
    trpc.instructorSubstitutions.requestForClass.mutationOptions({
      onSuccess: (result) => {
        setConfirmAction(null);
        toast.success(
          result.candidateCount > 0
            ? `${result.candidateCount} available instructor${result.candidateCount === 1 ? "" : "s"} notified`
            : "Open cover request created",
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const createBookingAutomation = useMutation(
    trpc.workflows.create.mutationOptions({
      onSuccess: (workflow) => {
        toast.success("Booking automation created");
        router.push(`/workflows/${workflow.id}`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const exportInput = {
    className: props.className,
    startTime: props.startTime,
    rows: props.rows,
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <MoreHorizontal className="size-3.5" /> Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">
            Class actions
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {props.canManage && (
            <>
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                onSelect={props.onEdit}
              >
                <Pencil className="size-3.5" /> Edit class
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                onSelect={() => setConfirmAction("sub")}
              >
                <Repeat2 className="size-3.5" /> Request a sub
              </DropdownMenuItem>
            </>
          )}
          {props.canManageWorkflows ? (
            <DropdownMenuItem
              className="cursor-pointer text-xs"
              disabled={createBookingAutomation.isPending}
              onSelect={() =>
                createBookingAutomation.mutate({
                  starter: {
                    event: "CLASS_OCCURRENCE_BOOKED",
                    classId: props.classId,
                  },
                })
              }
            >
              <Workflow className="size-3.5" /> Create booking automation
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="cursor-pointer text-xs"
            onSelect={() => exportClassRosterCsv(exportInput)}
          >
            <Download className="size-3.5" /> Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-xs"
            onSelect={() =>
              void exportClassRosterPdf(exportInput).catch(() =>
                toast.error("PDF export failed"),
              )
            }
          >
            <FileText className="size-3.5" /> Export as PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {props.organizationSlug && (
            <DropdownMenuItem asChild>
              <Link
                href={`/schedule/${props.organizationSlug}#${props.classId}`}
                target="_blank"
                className="cursor-pointer text-xs"
              >
                <ExternalLink className="size-3.5" /> View checkout page
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/studio/classes" className="cursor-pointer text-xs">
              <CalendarDays className="size-3.5" /> View scheduled classes
            </Link>
          </DropdownMenuItem>
          {props.canManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-xs text-amber-600 focus:text-amber-600"
                disabled={props.status === "CANCELLED"}
                onSelect={() => setConfirmAction("cancel")}
              >
                <ArchiveX className="size-3.5" /> Cancel class
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-xs text-destructive focus:text-destructive"
                onSelect={() => setConfirmAction("delete")}
              >
                <Trash2 className="size-3.5" /> Delete class
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "sub"
                ? "Request cover for this class?"
                : confirmAction === "cancel"
                  ? "Cancel this class?"
                  : "Delete this class?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "sub"
                ? "Available instructors will be notified and an open request will be created if nobody is currently available."
                : confirmAction === "cancel"
                  ? "Active bookings and waitlist entries will be cancelled."
                  : "Only a cancelled class with no booking or attendance history can be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                cancelClass.isPending ||
                deleteClass.isPending ||
                requestSub.isPending
              }
              onClick={() => {
                if (confirmAction === "sub")
                  requestSub.mutate({ classId: props.classId });
                if (confirmAction === "cancel")
                  cancelClass.mutate({ id: props.classId });
                if (confirmAction === "delete")
                  deleteClass.mutate({ id: props.classId });
              }}
            >
              {confirmAction === "sub"
                ? "Request cover"
                : confirmAction === "cancel"
                  ? "Cancel class"
                  : "Delete class"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
