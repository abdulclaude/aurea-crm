"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Plus,
  MoreVertical,
  Trash2,
  Copy,
  FileText,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { activePageIdAtom } from "../../../lib/editor-store";
import type { FunnelPage } from "@prisma/client";
import { toast } from "sonner";

interface PagesPanelProps {
  funnelId: string;
  pages: FunnelPage[];
}

export function PagesPanel({ funnelId, pages }: PagesPanelProps) {
  const [activePageId, setActivePageId] = useAtom(activePageIdAtom);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [duplicateFromId, setDuplicateFromId] = useState<string | undefined>();

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutate: createPageMutation, isPending: isCreating } = useMutation(
    trpc.funnels.createPage.mutationOptions({
      onSuccess: async (page) => {
        await queryClient.invalidateQueries();
        setActivePageId(page.id);
        setCreateDialogOpen(false);
        setNewPageName("");
        setNewPageSlug("");
        setDuplicateFromId(undefined);
        toast.success("Page created", {
          description: `"${page.name}" has been created.`,
        });
      },
      onError: (error) => {
        toast.error("Failed to create page", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: deletePageMutation, isPending: isDeleting } = useMutation(
    trpc.funnels.deletePage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        // If deleted page was active, switch to first page
        if (pages.length > 1) {
          const firstOtherPage = pages.find((p) => p.id !== activePageId);
          if (firstOtherPage) {
            setActivePageId(firstOtherPage.id);
          }
        }
        toast.success("Page deleted", {
          description: "The page has been permanently deleted.",
        });
      },
      onError: (error) => {
        toast.error("Failed to delete page", {
          description: error.message,
        });
      },
    })
  );

  const handleCreatePage = () => {
    if (!newPageName || !newPageSlug) {
      toast.error("Missing fields", {
        description: "Please enter both page name and slug.",
      });
      return;
    }

    createPageMutation({
      funnelId,
      name: newPageName,
      slug: newPageSlug,
      duplicateFromPageId: duplicateFromId,
    });
  };

  const handleDuplicatePage = (page: FunnelPage) => {
    setNewPageName(`${page.name} (Copy)`);
    setNewPageSlug(`${page.slug}-copy`);
    setDuplicateFromId(page.id);
    setCreateDialogOpen(true);
  };

  const handleDeletePage = (pageId: string) => {
    if (pages.length === 1) {
      toast.error("Cannot delete", {
        description: "You must have at least one page in your funnel.",
      });
      return;
    }

    if (
      confirm(
        "Are you sure you want to delete this page? This action cannot be undone."
      )
    ) {
      deletePageMutation({ pageId });
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setNewPageName(name);
    if (!duplicateFromId) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setNewPageSlug(slug);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="w-full"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Page
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pages.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No pages yet. Click "Add Page" to get started.
            </div>
          ) : (
            pages.map((page, index) => (
              <div
                key={page.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
                  activePageId === page.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted"
                )}
                onClick={() => setActivePageId(page.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate">{page.name}</span>
                <span className="text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDuplicatePage(page)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeletePage(page.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {duplicateFromId ? "Duplicate Page" : "Create New Page"}
            </DialogTitle>
            <DialogDescription>
              {duplicateFromId
                ? "Create a copy of the selected page with all its blocks."
                : "Add a new page to your funnel."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="page-name">Page Name</Label>
              <Input
                id="page-name"
                placeholder="e.g., Home, Thank You, etc."
                value={newPageName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-slug">
                Slug (URL path)
              </Label>
              <Input
                id="page-slug"
                placeholder="e.g., home, thank-you"
                value={newPageSlug}
                onChange={(e) => setNewPageSlug(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This will be the URL: /f/{newPageSlug || "your-slug"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewPageName("");
                setNewPageSlug("");
                setDuplicateFromId(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePage}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
