"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import { ClientType } from "@/db/enums";

export default function NewHouseholdPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [primaryContactId, setPrimaryContactId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: clients } = useQuery(
    trpc.clients.list.queryOptions({
      pageSize: 100,
      types: [ClientType.CUSTOMER, ClientType.PROSPECT],
    }),
  );

  const createHousehold = useMutation(
    trpc.households.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Household created");
        router.push("/households");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const clientOptions = clients?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary">New household</h1>
          <p className="text-xs text-primary/75">
            Create a household to link family or dependent accounts.
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="pb-6">
        <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-white/5">
          <div className="space-y-2">
            <Label htmlFor="household-name" className="text-xs text-primary/75">
              Household name
            </Label>
            <Input
              id="household-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Patel household"
              className="border-black/10 dark:border-white/5 text-primary text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-primary/75">Primary account holder</Label>
            <Select value={primaryContactId} onValueChange={setPrimaryContactId}>
              <SelectTrigger className="w-full border-black/10 dark:border-white/5">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent className="bg-background border-black/10 dark:border-white/5">
                {clientOptions.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="household-notes" className="text-xs text-primary/75">
              Notes
            </Label>
            <Textarea
              id="household-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Billing, pickup, or guardian notes"
              className="border-black/10 dark:border-white/5 text-primary text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={createHousehold.isPending}
            className="bg-rose-500 text-rose-100 hover:bg-rose-500/95 hover:text-white text-xs rounded-lg border border-black/10 dark:border-white/5 transition duration-150"
          >
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || createHousehold.isPending}
            onClick={() =>
              createHousehold.mutate({
                name,
                primaryContactId: primaryContactId || undefined,
                notes: notes || undefined,
              })
            }
            className="bg-background hover:bg-primary-foreground/50 hover:text-black text-xs rounded-lg border border-black/10 dark:border-white/5 transition duration-150"
          >
            {createHousehold.isPending ? "Creating..." : "Create household"}
          </Button>
        </div>
      </div>
    </div>
  );
}
