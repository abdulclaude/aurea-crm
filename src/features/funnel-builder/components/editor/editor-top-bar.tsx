"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, Upload, Archive, Trash2, BarChart3, Globe } from "lucide-react";
import { FunnelStatus } from "@prisma/client";
import type { Funnel } from "@prisma/client";
import { toast } from "sonner";
import { PixelIntegrationsDialog } from "../dialogs/pixel-integrations-dialog";
import { DomainSettingsDialog } from "../dialogs/domain-settings-dialog";

interface EditorTopBarProps {
  funnel: Funnel;
}

export function EditorTopBar({ funnel }: EditorTopBarProps) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [domainSettingsOpen, setDomainSettingsOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutateAsync: updateFunnel } = useMutation(
    trpc.funnels.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const { mutate: deleteFunnel } = useMutation(
    trpc.funnels.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Funnel deleted", {
          description: "The funnel has been permanently deleted.",
        });
        router.push("/funnels");
      },
    })
  );

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await updateFunnel({
        id: funnel.id,
        status: FunnelStatus.PUBLISHED,
      });

      toast.success("Funnel published!", {
        description: "Your funnel is now live and accessible to visitors.",
      });
    } catch (error) {
      toast.error("Failed to publish", {
        description: "There was an error publishing your funnel.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      await updateFunnel({
        id: funnel.id,
        status: FunnelStatus.DRAFT,
      });

      toast.success("Funnel unpublished", {
        description: "Your funnel is now in draft mode.",
      });
    } catch (error) {
      toast.error("Failed to unpublish", {
        description: "There was an error unpublishing your funnel.",
      });
    }
  };

  const handleArchive = async () => {
    try {
      await updateFunnel({
        id: funnel.id,
        status: FunnelStatus.ARCHIVED,
      });

      toast.success("Funnel archived", {
        description: "The funnel has been archived.",
      });
    } catch (error) {
      toast.error("Failed to archive", {
        description: "There was an error archiving your funnel.",
      });
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this funnel? This action cannot be undone."
      )
    ) {
      return;
    }

    deleteFunnel({ id: funnel.id });
  };

  const isPublished = funnel.status === FunnelStatus.PUBLISHED;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDomainSettingsOpen(true)}
      >
        <Globe className="mr-2 h-4 w-4" />
        Domain
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setIntegrationsOpen(true)}
      >
        <BarChart3 className="mr-2 h-4 w-4" />
        Tracking
      </Button>

      {isPublished ? (
        <Button variant="outline" size="sm" onClick={handleUnpublish}>
          <Save className="mr-2 h-4 w-4" />
          Save as Draft
        </Button>
      ) : (
        <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
          <Upload className="mr-2 h-4 w-4" />
          {isPublishing ? "Publishing..." : "Publish"}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={isPublished ? "default" : "secondary"}>
                {funnel.status}
              </Badge>
            </div>
          </div>

          <DropdownMenuSeparator />

          {funnel.status !== FunnelStatus.ARCHIVED && (
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive Funnel
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Funnel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DomainSettingsDialog
        open={domainSettingsOpen}
        onOpenChange={setDomainSettingsOpen}
        funnelId={funnel.id}
        currentDomainType={funnel.domainType}
        currentSubdomain={funnel.subdomain}
        currentCustomDomain={funnel.customDomain}
        domainVerified={funnel.domainVerified}
      />

      <PixelIntegrationsDialog
        open={integrationsOpen}
        onOpenChange={setIntegrationsOpen}
        funnelId={funnel.id}
      />
    </>
  );
}
