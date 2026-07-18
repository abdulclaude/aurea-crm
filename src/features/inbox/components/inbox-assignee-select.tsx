"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";

const UNASSIGNED_VALUE = "__unassigned__";

type InboxAssigneeSelectProps = {
  conversationId: string;
  assignee: {
    id: string;
    displayName: string;
    email: string | null;
  } | null;
};

export function InboxAssigneeSelect({
  conversationId,
  assignee,
}: InboxAssigneeSelectProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const staffQuery = useQuery({
    ...trpc.inbox.listAssignableStaff.queryOptions(),
    retry: false,
  });
  const assign = useMutation(
    trpc.inbox.assignConversation.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.inbox.getConversation.queryKey({
              id: conversationId,
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.inbox.listConversations.queryKey(),
          }),
        ]);
      },
    }),
  );

  if (staffQuery.isError) {
    return assignee ? (
      <span className="max-w-36 truncate text-xs text-muted-foreground">
        {assignee.displayName}
      </span>
    ) : null;
  }

  return (
    <Select
      value={assignee?.id ?? UNASSIGNED_VALUE}
      disabled={staffQuery.isLoading || assign.isPending}
      onValueChange={(value) =>
        assign.mutate({
          conversationId,
          staffIdentityId: value === UNASSIGNED_VALUE ? null : value,
        })
      }
    >
      <SelectTrigger className="h-8 w-40 text-xs" aria-label="Assignee">
        <UserRound className="size-3.5 text-muted-foreground" />
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
        {staffQuery.data?.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
