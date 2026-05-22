"use client";

import { useState, Suspense } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { RoomsTable } from "@/features/studio/components/rooms-table";

export default function RoomsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation(trpc.rooms.create.mutationOptions());

  function resetForm() {
    setName("");
    setCapacity("");
    setDescription("");
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Room name is required");
      return;
    }
    createMutation.mutate(
      {
        name: name.trim(),
        capacity: capacity ? parseInt(capacity) : undefined,
        description: description || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Room created");
          queryClient.invalidateQueries(trpc.rooms.list.queryOptions());
          resetForm();
          setDialogOpen(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Rooms</h1>
          <p className="text-xs text-primary/70">
            Manage your studio rooms and spaces.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="size-3.5" />
          Add room
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12 text-sm text-primary/40">
            Loading rooms...
          </div>
        }
      >
        <RoomsTable />
      </Suspense>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Studio A, Main Hall, Yoga Room"
              />
            </div>
            <div className="space-y-3">
              <Label>Capacity</Label>
              <Input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Maximum number of people"
              />
            </div>
            <div className="space-y-3">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this room"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>

            <Button
              variant="outline"
              onClick={handleCreate}
              disabled={!name || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
