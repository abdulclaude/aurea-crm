"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Star,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

export function GlobalStylesManager() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const { data: presets, isLoading } = useQuery({
    ...trpc.globalStyles.list.queryOptions(),
  });

  const { mutate: createPreset, isPending: isCreating } = useMutation(
    trpc.globalStyles.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Style preset created");
        setCreateDialogOpen(false);
        setNewPresetName("");
      },
      onError: (error) => {
        toast.error("Failed to create preset", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: deletePreset } = useMutation(
    trpc.globalStyles.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Preset deleted");
      },
      onError: (error) => {
        toast.error("Failed to delete preset", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: duplicatePreset } = useMutation(
    trpc.globalStyles.duplicate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Preset duplicated");
      },
      onError: (error) => {
        toast.error("Failed to duplicate preset", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: updatePreset } = useMutation(
    trpc.globalStyles.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Preset updated");
      },
      onError: (error) => {
        toast.error("Failed to update preset", {
          description: error.message,
        });
      },
    })
  );

  const handleCreatePreset = () => {
    if (!newPresetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }
    createPreset({ name: newPresetName });
  };

  const handleDelete = (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      deletePreset({ id });
    }
  };

  const handleSetDefault = (id: string) => {
    updatePreset({ id, isDefault: true });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Style presets are used across funnels, forms, and other builders to
            maintain brand consistency
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Preset
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Loading presets...</p>
          </div>
        ) : presets && presets.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((preset) => (
              <Card key={preset.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="line-clamp-1">
                          {preset.name}
                        </CardTitle>
                        {preset.isDefault && (
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {preset.description && (
                        <CardDescription className="mt-2 line-clamp-2">
                          {preset.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            duplicatePreset({
                              id: preset.id,
                              newName: `${preset.name} (Copy)`,
                            })
                          }
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        {!preset.isDefault && (
                          <DropdownMenuItem
                            onClick={() => handleSetDefault(preset.id)}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(preset.id, preset.name)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Brand Colors
                      </p>
                      <div className="flex gap-2">
                        <div
                          className="h-10 w-10 rounded-md border"
                          style={{ backgroundColor: preset.primaryColor }}
                          title={`Primary: ${preset.primaryColor}`}
                        />
                        <div
                          className="h-10 w-10 rounded-md border"
                          style={{ backgroundColor: preset.secondaryColor }}
                          title={`Secondary: ${preset.secondaryColor}`}
                        />
                        <div
                          className="h-10 w-10 rounded-md border"
                          style={{ backgroundColor: preset.accentColor }}
                          title={`Accent: ${preset.accentColor}`}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Typography
                      </p>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Font: {preset.fontFamily.split(",")[0]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Heading: {preset.headingFont.split(",")[0]}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-md border border-dashed">
            <Palette className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-semibold">No style presets yet</h3>
              <p className="text-sm text-muted-foreground">
                Create a preset to maintain brand consistency across your builders
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Preset
            </Button>
          </div>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Style Preset</DialogTitle>
            <DialogDescription>
              Create a new global style preset with default brand colors and
              typography settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Preset Name</Label>
              <Input
                id="name"
                placeholder="e.g., Brand Colors 2024"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreatePreset();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewPresetName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePreset} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Preset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
