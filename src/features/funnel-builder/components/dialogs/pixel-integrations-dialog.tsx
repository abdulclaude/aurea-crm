"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PixelProvider } from "@prisma/client";
import { Trash2, Plus, ExternalLink } from "lucide-react";

interface PixelIntegrationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnelId: string;
}

const PIXEL_PROVIDERS = [
  {
    value: PixelProvider.META_PIXEL,
    label: "Meta Pixel",
    description: "Track Facebook & Instagram ad conversions",
    placeholder: "123456789012345",
    helpUrl: "https://www.facebook.com/business/help/952192354843755",
  },
  {
    value: PixelProvider.GOOGLE_ANALYTICS,
    label: "Google Analytics 4",
    description: "Track website traffic and conversions",
    placeholder: "G-XXXXXXXXXX",
    helpUrl: "https://support.google.com/analytics/answer/9539598",
  },
  {
    value: PixelProvider.TIKTOK_PIXEL,
    label: "TikTok Pixel",
    description: "Track TikTok ad conversions",
    placeholder: "C1234ABCD5678EFGH90",
    helpUrl: "https://ads.tiktok.com/help/article/pixel",
  },
] as const;

export function PixelIntegrationsDialog({
  open,
  onOpenChange,
  funnelId,
}: PixelIntegrationsDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<PixelProvider>(
    PixelProvider.META_PIXEL
  );
  const [pixelId, setPixelId] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Fetch integrations
  const { data: integrations, isLoading } = useQuery({
    ...trpc.funnelIntegrations.listPixelIntegrations.queryOptions({
      funnelId,
    }),
    enabled: open,
  });

  // Upsert mutation
  const { mutate: upsertIntegration, isPending: isUpserting } = useMutation(
    trpc.funnelIntegrations.upsertPixelIntegration.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.funnelIntegrations.listPixelIntegrations.queryOptions({
            funnelId,
          }).queryKey,
        });
        toast.success("Integration saved", {
          description: "Pixel tracking has been configured.",
        });
        setPixelId("");
      },
      onError: (error) => {
        toast.error("Failed to save integration", {
          description: error.message,
        });
      },
    })
  );

  // Toggle mutation
  const { mutate: toggleIntegration } = useMutation(
    trpc.funnelIntegrations.togglePixelIntegration.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.funnelIntegrations.listPixelIntegrations.queryOptions({
            funnelId,
          }).queryKey,
        });
        toast.success("Integration updated");
      },
    })
  );

  // Delete mutation
  const { mutate: deleteIntegration } = useMutation(
    trpc.funnelIntegrations.deletePixelIntegration.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.funnelIntegrations.listPixelIntegrations.queryOptions({
            funnelId,
          }).queryKey,
        });
        toast.success("Integration deleted");
      },
    })
  );

  const handleAddIntegration = () => {
    if (!pixelId.trim()) {
      toast.error("Please enter a Pixel ID");
      return;
    }

    upsertIntegration({
      funnelId,
      provider: selectedProvider,
      pixelId: pixelId.trim(),
      enabled: true,
    });
  };

  const selectedProviderInfo = PIXEL_PROVIDERS.find(
    (p) => p.value === selectedProvider
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Pixel Tracking Integrations</DialogTitle>
          <DialogDescription>
            Connect tracking pixels to measure ad conversions and analyze funnel
            performance.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Add New Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add New Pixel</CardTitle>
                <CardDescription>
                  Configure a tracking pixel for this funnel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={selectedProvider}
                    onValueChange={(value) =>
                      setSelectedProvider(value as PixelProvider)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIXEL_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Pixel ID / Measurement ID</Label>
                    {selectedProviderInfo && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        asChild
                      >
                        <a
                          href={selectedProviderInfo.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Find my ID
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder={selectedProviderInfo?.placeholder}
                    value={pixelId}
                    onChange={(e) => setPixelId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddIntegration();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedProviderInfo?.description}
                  </p>
                </div>

                <Button
                  onClick={handleAddIntegration}
                  disabled={isUpserting || !pixelId.trim()}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isUpserting ? "Adding..." : "Add Pixel"}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Integrations */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading integrations...
              </div>
            ) : integrations && integrations.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Active Pixels</h3>
                  <Separator className="flex-1" />
                </div>

                {integrations.map((integration) => {
                  const providerInfo = PIXEL_PROVIDERS.find(
                    (p) => p.value === integration.provider
                  );

                  return (
                    <Card key={integration.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">
                                {providerInfo?.label}
                              </h4>
                              <Switch
                                checked={integration.enabled}
                                onCheckedChange={(enabled) =>
                                  toggleIntegration({
                                    id: integration.id,
                                    enabled,
                                  })
                                }
                              />
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">
                              {integration.pixelId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {providerInfo?.description}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              deleteIntegration({ id: integration.id })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-sm">No pixels configured yet</p>
                <p className="text-xs mt-1">
                  Add a pixel above to start tracking conversions
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
