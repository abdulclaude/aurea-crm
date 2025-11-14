"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

interface ClientApi {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  profile?: {
    website?: string | null;
    billingEmail?: string | null;
    phone?: string | null;
    industry?: string | null;
    country?: string | null;
  } | null;
  pendingInvites?: number;
}

export default function ClientsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery(
    trpc.organizations.getClients.queryOptions()
  );
  const isLoading = false;
  const [inviteEmail, setInviteEmail] = useState("");

  const inviteToOrg = async (organizationId: string) => {
    if (!inviteEmail.trim()) return;

    await authClient.organization.inviteMember({
      organizationId,
      email: inviteEmail.trim(),
      role: "admin",
    });
    setInviteEmail("");
    await queryClient.invalidateQueries(
      trpc.organizations.getClients.queryOptions()
    );
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Manage all your clients</h1>
      </div>
    </div>
  );
}
