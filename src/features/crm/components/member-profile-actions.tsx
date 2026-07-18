"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  KeyRound,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteClientsDialog } from "@/features/crm/components/delete-clients-dialog";
import { useTRPC } from "@/trpc/client";

type MemberProfileActionsProps = {
  member: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
};

export function MemberProfileActions({ member }: MemberProfileActionsProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const removeClient = useMutation(
    trpc.clients.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.clients.list.queryKey(),
        });
        toast.success("Client removed");
        router.push("/clients");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Actions <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem asChild disabled={!member.email}>
            <a href={member.email ? `mailto:${member.email}` : undefined}>
              <Mail className="size-3.5" /> Email
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild disabled={!member.phone}>
            <a href={member.phone ? `sms:${member.phone}` : undefined}>
              <MessageSquare className="size-3.5" /> Text
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild disabled={!member.phone}>
            <a href={member.phone ? `tel:${member.phone}` : undefined}>
              <Phone className="size-3.5" /> Call
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!member.email}
            onSelect={() =>
              toast.info(
                "This client does not have a password-based portal account.",
              )
            }
          >
            <KeyRound className="size-3.5" /> Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setRemoveOpen(true)}
          >
            <Trash2 className="size-3.5" /> Remove client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteClientsDialog
        count={1}
        names={[member.name]}
        open={removeOpen}
        isPending={removeClient.isPending}
        onOpenChange={setRemoveOpen}
        onConfirm={() => removeClient.mutate({ ids: [member.id] })}
      />
    </>
  );
}
