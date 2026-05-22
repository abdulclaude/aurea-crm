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
import { ClassTypesTable } from "@/features/studio/components/class-types-table";

export default function ClassTypesPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");

  const createMutation = useMutation(trpc.classTypes.create.mutationOptions());

  function resetForm() {
    setName("");
    setDescription("");
    setColor("#6366f1");
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Class type name is required");
      return;
    }
    createMutation.mutate(
      { name: name.trim(), description: description || undefined, color },
      {
        onSuccess: () => {
          toast.success("Class type created");
          queryClient.invalidateQueries(
            trpc.classTypes.list.queryOptions({ includeInactive: true }),
          );
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
          <h1 className="text-lg font-semibold text-primary">Class types</h1>
          <p className="text-xs text-primary/70">
            Define the types of classes your studio offers.
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
          Add class type
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12 text-sm text-primary/40">
            Loading class types...
          </div>
        }
      >
        <ClassTypesTable />
      </Suspense>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create class type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Yoga, Pilates, HIIT"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this class type"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex w-max gap-2">
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-9 p-1"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex w-max"
                />
              </div>
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
