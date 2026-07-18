"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, MoreHorizontal, UserMinus, Users } from "lucide-react";
import Link from "next/link";
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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/trpc/client";
import type { HouseholdRow } from "./household-table-columns";

type HouseholdMember = HouseholdRow["members"][number];

export function HouseholdRowActions({ household }: { household: HouseholdRow }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [removeTarget, setRemoveTarget] = React.useState<HouseholdMember | null>(
    null,
  );
  const removeMember = useMutation(
    trpc.households.removeMember.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.households.list.queryKey(),
        });
        toast.success("Client removed from household");
        setRemoveTarget(null);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const removableMembers = household.members.filter(
    (member) => member.clientId !== household.primaryContact?.id,
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <span className="sr-only">Open household actions</span>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {household.primaryContact ? (
            <DropdownMenuItem asChild>
              <Link href={`/clients/${household.primaryContact.id}`}>
                <Eye className="size-3.5" /> View primary client
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Users className="size-3.5" /> View clients
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {household.members.length ? (
                household.members.map((member) => (
                  <DropdownMenuItem key={member.id} asChild>
                    <Link href={`/clients/${member.clientId}`}>
                      {member.client.name}
                    </Link>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No linked clients</DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {removableMembers.length ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-rose-600">
                  <UserMinus className="size-3.5" /> Remove client
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  {removableMembers.map((member) => (
                    <DropdownMenuItem
                      key={member.id}
                      variant="destructive"
                      onSelect={() => setRemoveTarget(member)}
                    >
                      <UserMinus className="size-3.5" />
                      {member.client.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removeTarget?.client.name} from {household.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the household relationship only. The client profile
              and its history will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMember.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeTarget) {
                  removeMember.mutate({
                    householdId: household.id,
                    clientId: removeTarget.clientId,
                  });
                }
              }}
            >
              {removeMember.isPending ? "Removing..." : "Remove client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
