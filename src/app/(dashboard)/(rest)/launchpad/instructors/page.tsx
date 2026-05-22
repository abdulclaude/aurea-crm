"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function LaunchpadInstructorsPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const create = useMutation(
    trpc.instructors.create.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries();
        toast.success("Instructor added");
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
              Add an instructor
            </h1>
            <p className="text-xs text-primary/50">
              Set up an instructor profile for your team.
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
              email: email || undefined,
              phone: phone || undefined,
            });
          }}
        >
          <div className="flex flex-col gap-3">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Jane Smith"
              required
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Email (optional)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@studio.com"
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Phone (optional)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44"
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
              {create.isPending ? "Adding..." : "Add instructor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
