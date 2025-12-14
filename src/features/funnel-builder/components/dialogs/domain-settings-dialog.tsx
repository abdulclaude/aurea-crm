"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FunnelDomainType } from "@prisma/client";
import {
  validateSubdomain,
  validateCustomDomain,
  PLATFORM_BASE_DOMAIN,
} from "@/features/funnel-builder/lib/funnel-urls";
import {
  Globe,
  Lock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface DomainSettingsDialogProps {
  funnelId: string;
  currentDomainType: FunnelDomainType;
  currentSubdomain?: string | null;
  currentCustomDomain?: string | null;
  domainVerified: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DomainSettingsDialog({
  funnelId,
  currentDomainType,
  currentSubdomain,
  currentCustomDomain,
  domainVerified,
  open,
  onOpenChange,
}: DomainSettingsDialogProps) {
  const [domainType, setDomainType] =
    useState<FunnelDomainType>(currentDomainType);
  const [subdomain, setSubdomain] = useState(currentSubdomain || "");
  const [customDomain, setCustomDomain] = useState(currentCustomDomain || "");
  const [subdomainError, setSubdomainError] = useState<string | null>(null);
  const [customDomainError, setCustomDomainError] = useState<string | null>(
    null
  );

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Fetch funnel with pages to show the first page in preview
  const { data: funnel } = useQuery({
    ...trpc.funnels.getById.queryOptions({ id: funnelId }),
    enabled: open,
  });

  const firstPage = funnel?.funnelPage?.[0];

  const { mutate: updateFunnel, isPending } = useMutation(
    trpc.funnels.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.funnels.getById.queryOptions({ id: funnelId }).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.funnels.list.queryOptions({}).queryKey,
        });
        toast.success("Domain settings updated successfully");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update domain settings");
      },
    })
  );

  const handleSubdomainChange = (value: string) => {
    const normalized = value.toLowerCase().trim();
    setSubdomain(normalized);

    if (normalized) {
      const validation = validateSubdomain(normalized);
      setSubdomainError(validation.valid ? null : validation.error || null);
    } else {
      setSubdomainError(null);
    }
  };

  const handleCustomDomainChange = (value: string) => {
    const normalized = value.toLowerCase().trim();
    setCustomDomain(normalized);

    if (normalized) {
      const validation = validateCustomDomain(normalized);
      setCustomDomainError(validation.valid ? null : validation.error || null);
    } else {
      setCustomDomainError(null);
    }
  };

  const handleSave = () => {
    // Validate based on selected domain type
    if (domainType === FunnelDomainType.SUBDOMAIN) {
      if (!subdomain) {
        setSubdomainError("Subdomain is required");
        return;
      }
      const validation = validateSubdomain(subdomain);
      if (!validation.valid) {
        setSubdomainError(validation.error || "Invalid subdomain");
        return;
      }
    }

    if (domainType === FunnelDomainType.CUSTOM) {
      if (!customDomain) {
        setCustomDomainError("Custom domain is required");
        return;
      }
      const validation = validateCustomDomain(customDomain);
      if (!validation.valid) {
        setCustomDomainError(validation.error || "Invalid domain");
        return;
      }
    }

    // Update funnel
    updateFunnel({
      id: funnelId,
      domainType,
      subdomain: domainType === FunnelDomainType.SUBDOMAIN ? subdomain : null,
      customDomain:
        domainType === FunnelDomainType.CUSTOM ? customDomain : null,
    });
  };

  // Generate full preview URL with page slug
  const getPreviewUrl = () => {
    if (!firstPage) return null;

    const protocol = PLATFORM_BASE_DOMAIN.includes("localhost") ? "http" : "https";

    if (domainType === FunnelDomainType.SUBDOMAIN && subdomain) {
      return `${protocol}://${subdomain}.${PLATFORM_BASE_DOMAIN}/${firstPage.slug}`;
    }

    if (domainType === FunnelDomainType.CUSTOM && customDomain) {
      return `${protocol}://${customDomain}/${firstPage.slug}`;
    }

    return null;
  };

  const previewUrl = getPreviewUrl();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Domain Settings</DialogTitle>
          <DialogDescription>
            Choose how users will access your funnel - via a subdomain or your
            own custom domain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            value={domainType}
            onValueChange={(v) => setDomainType(v as FunnelDomainType)}
          >
            {/* Subdomain Option */}
            <div className="flex items-start space-x-3 rounded-lg border border-white/10 p-4 hover:bg-white/5">
              <RadioGroupItem
                value={FunnelDomainType.SUBDOMAIN}
                id="subdomain"
                className="mt-1"
              />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <Label
                    htmlFor="subdomain"
                    className="cursor-pointer font-medium"
                  >
                    Platform Subdomain
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your funnel will be accessible at a subdomain of our platform.
                  Easy to set up, no DNS configuration required.
                </p>

                {domainType === FunnelDomainType.SUBDOMAIN && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="subdomain-input"
                      className="text-xs text-muted-foreground"
                    >
                      Your Subdomain
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="subdomain-input"
                        placeholder="clientname"
                        value={subdomain}
                        onChange={(e) => handleSubdomainChange(e.target.value)}
                        className={subdomainError ? "border-red-500" : ""}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        .{PLATFORM_BASE_DOMAIN}
                      </span>
                    </div>
                    {subdomainError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {subdomainError}
                      </p>
                    )}
                    {!subdomainError && subdomain && (
                      <p className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Subdomain is available
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Domain Option */}
            <div className="flex items-start space-x-3 rounded-lg border border-white/10 p-4 hover:bg-white/5">
              <RadioGroupItem
                value={FunnelDomainType.CUSTOM}
                id="custom"
                className="mt-1"
              />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-purple-400" />
                  <Label
                    htmlFor="custom"
                    className="cursor-pointer font-medium"
                  >
                    Custom Domain
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use your own domain name. Requires DNS configuration and
                  domain verification.
                </p>

                {domainType === FunnelDomainType.CUSTOM && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label
                        htmlFor="custom-domain-input"
                        className="text-xs text-muted-foreground"
                      >
                        Your Domain
                      </Label>
                      <Input
                        id="custom-domain-input"
                        placeholder="www.yourdomain.com"
                        value={customDomain}
                        onChange={(e) =>
                          handleCustomDomainChange(e.target.value)
                        }
                        className={customDomainError ? "border-red-500" : ""}
                      />
                      {customDomainError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {customDomainError}
                        </p>
                      )}
                    </div>

                    {customDomain && !customDomainError && (
                      <Alert className="bg-blue-500/10 border-blue-500/20">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-xs space-y-2">
                          <p className="font-medium">
                            DNS Configuration Required
                          </p>
                          <p>
                            Add the following DNS record to your domain
                            provider:
                          </p>
                          <div className="bg-black/20 p-2 rounded font-mono text-xs">
                            <p>Type: CNAME</p>
                            <p>
                              Name:{" "}
                              {customDomain.replace(/^www\./, "") ===
                              customDomain
                                ? "@"
                                : "www"}
                            </p>
                            <p>Value: {PLATFORM_BASE_DOMAIN}</p>
                          </div>
                          {domainVerified ? (
                            <p className="text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Domain verified
                            </p>
                          ) : (
                            <p className="text-yellow-400 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Domain not verified - it may take up to 48 hours
                              for DNS changes to propagate
                            </p>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>

          {/* Preview URL */}
          {previewUrl && firstPage && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
              <Label className="text-xs text-muted-foreground block">
                Your funnel will be accessible at:
              </Label>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-black/20 px-3 py-1.5 rounded flex-1 truncate">
                  {previewUrl}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(previewUrl, "_blank")}
                  title="Open preview in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Landing page: <span className="text-white font-medium">{firstPage.name}</span> ({firstPage.slug})
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isPending ||
              (domainType === FunnelDomainType.SUBDOMAIN &&
                (!subdomain || !!subdomainError)) ||
              (domainType === FunnelDomainType.CUSTOM &&
                (!customDomain || !!customDomainError))
            }
          >
            {isPending ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
