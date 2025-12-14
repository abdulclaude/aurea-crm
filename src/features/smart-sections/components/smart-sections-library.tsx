"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Search,
  Boxes,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function SmartSectionsLibrary() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [newSectionCategory, setNewSectionCategory] = useState("");

  const { data: sections, isLoading } = useQuery({
    ...trpc.smartSections.list.queryOptions(),
  });

  const { data: categories } = useQuery({
    ...trpc.smartSections.getCategories.queryOptions(),
  });

  const { mutate: createSection, isPending: isCreating } = useMutation(
    trpc.smartSections.createFromBlocks.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries();
        toast.success("Section created");
        setCreateDialogOpen(false);
        setNewSectionName("");
        setNewSectionDescription("");
        setNewSectionCategory("");
        // Navigate to the editor
        router.push(`/builder/library/${data.id}`);
      },
      onError: (error) => {
        toast.error("Failed to create section", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: deleteSection } = useMutation(
    trpc.smartSections.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Section deleted");
      },
      onError: (error) => {
        toast.error("Failed to delete section", {
          description: error.message,
        });
      },
    })
  );

  const handleCreateSection = () => {
    if (!newSectionName.trim()) {
      toast.error("Please enter a section name");
      return;
    }

    // Create an empty section with placeholder block structure
    createSection({
      name: newSectionName,
      description: newSectionDescription || undefined,
      category: newSectionCategory || undefined,
      blockStructure: [],
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      deleteSection({ id });
    }
  };

  const filteredSections = sections?.filter((section) => {
    const matchesSearch = section.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || section.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Section
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading sections...</p>
        </div>
      ) : filteredSections && filteredSections.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSections.map((section) => (
            <Card
              key={section.id}
              className="flex flex-col cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => router.push(`/builder/library/${section.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-1">{section.name}</CardTitle>
                    {section.category && (
                      <Badge variant="outline" className="mt-2">
                        {section.category}
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/builder/library/${section.id}`);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(section.id, section.name);
                        }}
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
                {section.thumbnail ? (
                  <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted">
                    <img
                      src={section.thumbnail}
                      alt={section.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-md border bg-muted">
                    <Boxes className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {section.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {section.description}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t pt-4">
                <div className="text-xs text-muted-foreground">
                  Used {(section._count as any).smartSectionInstance} time
                  {(section._count as any).smartSectionInstance !== 1 && "s"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(section.updatedAt), {
                    addSuffix: true,
                  })}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-md border border-dashed">
          <Boxes className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-semibold">No sections yet</h3>
            <p className="text-sm text-muted-foreground">
              Create reusable sections to use across your funnels and forms
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Section
          </Button>
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Smart Section</DialogTitle>
            <DialogDescription>
              Create a reusable section that can be inserted into funnels and forms
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Section Name</Label>
              <Input
                id="name"
                placeholder="e.g., Hero Section, Footer"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateSection();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe this section..."
                value={newSectionDescription}
                onChange={(e) => setNewSectionDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                placeholder="e.g., header, footer, cta"
                value={newSectionCategory}
                onChange={(e) => setNewSectionCategory(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewSectionName("");
                setNewSectionDescription("");
                setNewSectionCategory("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSection} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
