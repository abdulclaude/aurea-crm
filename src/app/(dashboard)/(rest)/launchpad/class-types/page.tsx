"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function LaunchpadClassTypesPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation(
    trpc.classTypes.create.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries();
        toast.success("Class type created");
        router.push("/launchpad");
      },
    }),
  );

  return (
    <div className="flex-1 flex items-center justify-center p-6 mx-auto w-xl">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-1">
          <div>
            <h1 className="text-lg font-semibold text-primary">
              Create a class type
            </h1>
            <p className="text-xs text-primary/50">
              Define the types of classes your studio offers.
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <form
          className="flex flex-col gap-4 "
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ name, description: description || undefined });
          }}
        >
          <div className="flex flex-col gap-3">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Yoga, HIIT, Pilates"
              required
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
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
              {create.isPending ? "Creating..." : "Create class type"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
