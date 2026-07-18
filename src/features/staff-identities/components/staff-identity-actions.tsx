"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, UserCheck, UserX } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StaffIdentityRow } from "@/features/staff-identities/contracts";
import { useTRPC } from "@/trpc/client";

export function StaffIdentityActions({
  identity,
}: {
  identity: StaffIdentityRow;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const updateStatus = useMutation(
    trpc.staffIdentities.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.staffIdentities.directory.queryKey(),
        });
        toast.success("Staff access updated");
        setConfirmSuspend(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (identity.status !== "ACTIVE" && identity.status !== "SUSPENDED") {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Manage {identity.displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {identity.status === "SUSPENDED" ? (
            <DropdownMenuItem
              onClick={() =>
                updateStatus.mutate({ id: identity.id, status: "ACTIVE" })
              }
            >
              <UserCheck className="size-4" />
              Restore access
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-600"
              onClick={() => setConfirmSuspend(true)}
            >
              <UserX className="size-4" />
              Suspend access
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {identity.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their linked workspace and location permissions will stop working
              until access is restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatus.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                updateStatus.mutate({
                  id: identity.id,
                  status: "SUSPENDED",
                })
              }
              disabled={updateStatus.isPending}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {updateStatus.isPending ? "Suspending..." : "Suspend access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
