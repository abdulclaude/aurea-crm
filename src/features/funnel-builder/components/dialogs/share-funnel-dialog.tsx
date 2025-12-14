"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { Copy, ExternalLink, QrCode, Globe, AlertCircle } from "lucide-react";
import { getPublicFunnelPageUrl } from "../../lib/funnel-urls";
import type { FunnelPage, Funnel } from "@prisma/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ShareFunnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnel: Funnel;
  pages: FunnelPage[];
}

export function ShareFunnelDialog({
  open,
  onOpenChange,
  funnel,
  pages,
}: ShareFunnelDialogProps) {
  const [selectedPageId, setSelectedPageId] = useState<string>(
    pages[0]?.id || ""
  );

  const selectedPage = pages.find((p) => p.id === selectedPageId);
  const publicUrl = selectedPage
    ? getPublicFunnelPageUrl(
        funnel.id,
        selectedPage.slug,
        {
          domainType: funnel.domainType,
          subdomain: funnel.subdomain,
          customDomain: funnel.customDomain,
        }
      )
    : "";

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("URL copied to clipboard");
  };

  const handleOpenUrl = () => {
    window.open(publicUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Funnel</DialogTitle>
          <DialogDescription>
            Copy the public URL to share this funnel page with visitors
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Domain Type Info */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <Globe className="h-4 w-4 text-blue-400" />
            <span className="text-sm">
              {funnel.domainType === "CUSTOM" && funnel.customDomain
                ? `Custom Domain: ${funnel.customDomain}`
                : funnel.domainType === "SUBDOMAIN" && funnel.subdomain
                ? `Subdomain: ${funnel.subdomain}`
                : "Default Path"}
            </span>
          </div>

          {/* Warning for unverified custom domain */}
          {funnel.domainType === "CUSTOM" && funnel.customDomain && !funnel.domainVerified && (
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-xs text-yellow-400">
                Your custom domain is not verified yet. The funnel may not be accessible until DNS configuration is complete.
              </AlertDescription>
            </Alert>
          )}

          {pages.length > 1 && (
            <div className="space-y-2">
              <Label>Select Page</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
              >
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Public URL</Label>
            <div className="flex gap-2">
              <Input value={publicUrl} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                title="Copy URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenUrl}
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-md">
            <div className="flex items-start gap-3">
              <QrCode className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Pro Tip</p>
                <p className="text-xs text-muted-foreground">
                  Share this URL on social media, in emails, or embed it on your
                  website. All configured tracking pixels will automatically fire
                  when visitors interact with your funnel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
