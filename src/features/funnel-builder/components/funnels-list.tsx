"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CreateFunnelDialog } from "./create-funnel-dialog";
import { FunnelStatus } from "@prisma/client";

export function FunnelsList() {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [funnelToDelete, setFunnelToDelete] = useState<string | null>(null);

  const trpc = useTRPC();

  const { data, refetch } = useSuspenseQuery(
    trpc.funnels.list.queryOptions({
      limit: 50,
    })
  );

  const { mutate: deleteFunnel, isPending: isDeleting } = useMutation(
    trpc.funnels.delete.mutationOptions({
      onSuccess: () => {
        refetch();
        setDeleteDialogOpen(false);
        setFunnelToDelete(null);
      },
    })
  );

  const handleDelete = () => {
    if (funnelToDelete) {
      deleteFunnel({ id: funnelToDelete });
    }
  };

  const getStatusBadge = (status: FunnelStatus) => {
    const variants: Record<
      FunnelStatus,
      { variant: "default" | "secondary" | "outline"; label: string }
    > = {
      DRAFT: { variant: "secondary", label: "Draft" },
      PUBLISHED: { variant: "default", label: "Published" },
      ARCHIVED: { variant: "outline", label: "Archived" },
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const funnels = data?.funnels ?? [];

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Funnel
          </Button>
        </div>

        {funnels.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No funnels yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Create your first funnel to start building high-converting
                landing pages and sales funnels.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Funnel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {funnels.map((funnel) => (
              <Card
                key={funnel.id}
                className="group cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => router.push(`/funnels/${funnel.id}/editor`)}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-xl">{funnel.name}</CardTitle>
                    <CardDescription>
                      {funnel.description || "No description"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/funnels/${funnel.id}/editor`);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {funnel.status === FunnelStatus.PUBLISHED && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Open in new tab
                          }}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Live
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setFunnelToDelete(funnel.id);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {(funnel._count as any).funnelPage}{" "}
                      {(funnel._count as any).funnelPage === 1 ? "page" : "pages"}
                    </span>
                    {getStatusBadge(funnel.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated{" "}
                    {formatDistanceToNow(new Date(funnel.updatedAt), {
                      addSuffix: true,
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateFunnelDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={(funnelId) => {
          setCreateDialogOpen(false);
          router.push(`/funnels/${funnelId}/editor`);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this funnel and all its pages. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
