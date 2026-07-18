"use client";

import { useQuery } from "@tanstack/react-query";

import { NotesPanel } from "@/features/crm/components/notes-panel";
import { useTRPC } from "@/trpc/client";

export function MemberNotesView({ clientId }: { clientId: string }) {
  const trpc = useTRPC();
  const { data: members = [] } = useQuery(
    trpc.clients.getLocationMembers.queryOptions(),
  );

  return (
    <NotesPanel
      clientId={clientId}
      members={members}
      layout="grid"
      className="py-5"
    />
  );
}
