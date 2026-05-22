"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function LaunchpadRoomsPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");

  const create = useMutation(
    trpc.rooms.create.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries();
        toast.success("Room added");
        router.push("/launchpad");
      },
    }),
  );

  return (
    <div className="flex-1 flex items-center justify-center p-6 mx-auto w-xl">
      <div className="w-full">
        <div className="flex items-center gap-3 mb-1">
          <div>
            <h1 className="text-lg font-semibold text-primary">Add a room</h1>
            <p className="text-xs text-primary/50">
              Create a physical space for scheduling classes.
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({
              name,
              capacity: capacity ? Number(capacity) : undefined,
            });
          }}
        >
          <div className="flex flex-col gap-3">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Studio"
              required
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Capacity (optional)</Label>
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g., 20"
            />
          </div>
          <div className="flex items-center justify-end gap-3 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/launchpad")}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Adding..." : "Add room"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
