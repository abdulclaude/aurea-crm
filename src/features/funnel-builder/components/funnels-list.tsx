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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MoreVertical, Pencil, Trash2, ExternalLink, Globe, Code, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CreateFunnelDialog } from "./create-funnel-dialog";
import { RegisterExternalFunnelDialog } from "@/features/external-funnels/components/register-external-funnel-dialog";
import { FunnelStatus, FunnelType } from "@prisma/client";

export function FunnelsList() {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [registerExternalOpen, setRegisterExternalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [funnelToDelete, setFunnelToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"builder" | "custom">("builder");

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

  const allFunnels = data?.funnels ?? [];
  const builderFunnels = allFunnels.filter((f: any) => f.funnelType === FunnelType.INTERNAL || !f.funnelType);
  const customFunnels = allFunnels.filter((f: any) => f.funnelType === FunnelType.EXTERNAL);

  const renderFunnelCard = (funnel: any, isCustom: boolean) => (
    <Card
      key={funnel.id}
      className="group cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => !isCustom && router.push(`/funnels/${funnel.id}/editor`)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">{funnel.name}</CardTitle>
            {isCustom && (
              <Badge variant="outline" className="gap-1">
                <Code className="h-3 w-3" />
                Custom
              </Badge>
            )}
          </div>
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
            {!isCustom && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/funnels/${funnel.id}/editor`);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {funnel.externalUrl && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (funnel.externalUrl) {
                    window.open(funnel.externalUrl, "_blank");
                  }
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {isCustom ? "View Website" : "View Live"}
              </DropdownMenuItem>
            )}
            {isCustom && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/funnels/${funnel.id}/analytics`);
                }}
              >
                <Globe className="mr-2 h-4 w-4" />
                View Analytics
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
          {isCustom ? (
            <span className="text-muted-foreground text-xs truncate">
              {funnel.externalUrl}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {(funnel._count as any)?.funnelPage || 0}{" "}
              {(funnel._count as any)?.funnelPage === 1 ? "page" : "pages"}
            </span>
          )}
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
  );

  return (
    <>
      <div className="flex flex-col gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="builder" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Builder Funnels ({builderFunnels.length})
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-2">
                <Code className="h-4 w-4" />
                Custom Funnels ({customFunnels.length})
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRegisterExternalOpen(true)}>
                <Globe className="mr-2 h-4 w-4" />
                Register Custom
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Builder Funnel
              </Button>
            </div>
          </div>

          <TabsContent value="builder" className="mt-4">
            {builderFunnels.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No builder funnels yet</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                    Create your first funnel using our drag-and-drop builder to design
                    high-converting landing pages and sales funnels.
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Builder Funnel
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {builderFunnels.map((funnel) => renderFunnelCard(funnel, false))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            {customFunnels.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Code className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No custom funnels yet</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                    Register your custom-built funnels (Next.js, React, etc.) to track
                    conversions, visitor behavior, and integrate with workflows.
                  </p>
                  <Button onClick={() => setRegisterExternalOpen(true)}>
                    <Globe className="mr-2 h-4 w-4" />
                    Register Custom Funnel
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {customFunnels.map((funnel) => renderFunnelCard(funnel, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateFunnelDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={(funnelId) => {
          setCreateDialogOpen(false);
          router.push(`/funnels/${funnelId}/editor`);
        }}
      />

      <RegisterExternalFunnelDialog
        open={registerExternalOpen}
        onOpenChange={setRegisterExternalOpen}
        onSuccess={() => {
          refetch();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this funnel and all its data. This
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
