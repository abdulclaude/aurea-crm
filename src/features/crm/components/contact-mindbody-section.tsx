"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Calendar, CreditCard, User, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ContactMindbodySectionProps {
  contact: {
    id: string;
    source?: string | null;
    metadata?: unknown;
  };
}

export function ContactMindbodySection({
  contact,
}: ContactMindbodySectionProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  // Parse Mindbody metadata
  const metadata = contact.metadata as any;
  const mindbodyData = metadata?.mindbody;
  const mindbodyId = mindbodyData?.id;

  // Only show if this is a Mindbody contact
  if (contact.source !== "mindbody" || !mindbodyId) {
    return null;
  }

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      // This would call a sync endpoint for this specific contact
      // await trpc.mindbody.syncContact.mutate({
      //   contactId: contact.id,
      //   mindbodyClientId: mindbodyId
      // });
      toast.success("Sync started", {
        description: "Syncing Mindbody data for this contact...",
      });
    } catch (error) {
      toast.error("Sync failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AccordionItem value="mindbody-data">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Mindbody Integration
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-6 space-y-4 pb-6">
        {/* Mindbody Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/20">
          <div className="space-y-1">
            <p className="text-sm font-medium">Mindbody Client</p>
            <p className="text-xs text-muted-foreground">
              ID: {mindbodyId}
            </p>
            {mindbodyData?.status && (
              <Badge variant="outline" className="mt-1">
                {mindbodyData.status}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RefreshCw className="h-4 w-4 mr-1" />
            Sync
          </Button>
        </div>

        {/* Metadata Details */}
        {(mindbodyData?.creationDate || mindbodyData?.lastModified) && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {mindbodyData.creationDate && (
              <div>
                <p className="text-muted-foreground text-xs">Created in Mindbody</p>
                <p className="font-medium">
                  {format(new Date(mindbodyData.creationDate), "PPP")}
                </p>
              </div>
            )}
            {mindbodyData.lastModified && (
              <div>
                <p className="text-muted-foreground text-xs">Last Modified</p>
                <p className="font-medium">
                  {format(new Date(mindbodyData.lastModified), "PPP")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats Placeholder */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="p-3 border rounded-lg text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Bookings</p>
            <p className="text-lg font-semibold">-</p>
          </div>
          <div className="p-3 border rounded-lg text-center">
            <CreditCard className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Memberships</p>
            <p className="text-lg font-semibold">-</p>
          </div>
          <div className="p-3 border rounded-lg text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Attended</p>
            <p className="text-lg font-semibold">-</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          View full Mindbody history in the Studio module
        </p>
      </AccordionContent>
    </AccordionItem>
  );
}
