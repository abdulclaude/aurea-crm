"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Trash2, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface VisitorGDPRSettingsProps {
  funnelId: string;
  anonymousId: string;
  profile: {
    id: string;
    displayName: string;
    identifiedUserId: string | null;
    totalSessions: number;
    totalEvents: number;
  };
}

export function VisitorGDPRSettings({
  funnelId,
  anonymousId,
  profile,
}: VisitorGDPRSettingsProps) {
  const trpcClient = useTRPCClient();
  const trpc = useTRPC();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const permissions = useQuery(trpc.permissions.getCurrent.queryOptions());
  const canExport =
    permissions.data?.capabilities.includes("privacy.export") ?? false;
  const canErase =
    permissions.data?.capabilities.includes("privacy.erase") ?? false;

  const exportDataMutation = useMutation({
    mutationFn: async (input: { funnelId: string; anonymousId: string }) =>
      trpcClient.externalFunnels.exportVisitorData.mutate(input),
    onSuccess: (data) => {
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visitor-data-${anonymousId}-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const partial = Object.values(data.partial).some(Boolean);
      if (partial) {
        toast.warning("Export created with collection limits noted in the file");
      } else {
        toast.success("Visitor data exported");
      }
      setIsExporting(false);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
      setIsExporting(false);
    },
  });

  const deleteDataMutation = useMutation({
    mutationFn: async (input: { funnelId: string; anonymousId: string }) =>
      trpcClient.externalFunnels.deleteVisitorData.mutate(input),
    onSuccess: (result) => {
      toast.success(
        `Erased ${result.deleted.events} events and ${result.deleted.sessions} sessions`,
      );
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      
      // Redirect back to visitors list
      router.push(`/funnels/${funnelId}/analytics?tab=visitors`);
    },
    onError: (error) => {
      toast.error(`Deletion failed: ${error.message}`);
      setIsDeleting(false);
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    exportDataMutation.mutate({
      funnelId,
      anonymousId,
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    deleteDataMutation.mutate({
      funnelId,
      anonymousId,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle>Privacy & Data Management</CardTitle>
          </div>
          <CardDescription>
            Scoped visitor access and erasure controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tracking Status */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Visitor Status</h4>
            <div className="flex items-center gap-2">
              {profile.identifiedUserId ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <Badge variant="default">Identified</Badge>
                  <span className="text-sm text-muted-foreground">
                    Linked to user ID: {profile.identifiedUserId}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <Badge variant="outline">Anonymous</Badge>
                  <span className="text-sm text-muted-foreground">
                    Not linked to a user account
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Data Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Data Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{profile.totalSessions}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{profile.totalEvents}</p>
              </div>
            </div>
          </div>

          {/* GDPR Actions */}
          {(canExport || canErase) && <div className="space-y-3">
            <h4 className="text-sm font-medium">GDPR Rights</h4>
            
            {/* Export Data - Right to Access */}
            {canExport && <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Download className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1 space-y-1">
                <h5 className="text-sm font-medium">Right to Access (GDPR Art. 15)</h5>
                <p className="text-sm text-muted-foreground">
                  Export the visitor profiles, sessions, events, performance metrics,
                  and identity-linked external form submissions in this workspace.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="mt-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export All Data"}
                </Button>
              </div>
            </div>}

            {/* Delete Data - Right to Erasure */}
            {canErase && <div className="flex items-start gap-3 p-4 border border-red-200 rounded-lg bg-red-50/50">
              <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1 space-y-1">
                <h5 className="text-sm font-medium text-red-900">
                  Right to Erasure (GDPR Art. 17)
                </h5>
                <p className="text-sm text-red-700">
                  Erase scoped tracking and identity-linked external form data. This
                  action cannot be undone and will remove:
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside ml-2 mt-1">
                  <li>Identifying profile properties</li>
                  <li>Session records across this workspace</li>
                  <li>Tracked events and performance metrics</li>
                  <li>Geographic and device information</li>
                  <li>Identity-linked external form submissions</li>
                </ul>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="mt-2"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Erase Visitor Data
                </Button>
              </div>
            </div>}
          </div>}

          {/* Privacy Information */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy Information
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Browser telemetry is rejected when DNT or GPC is enabled.</li>
              <li>IP handling follows this funnel&apos;s tracking configuration.</li>
              <li>CRM clients, bookings, payments, provider copies, and backups are not removed here.</li>
              <li>Future activity may be collected again when tracking remains permitted.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. It will erase scoped telemetry and
              identity-linked external form data for <strong>{profile.displayName}</strong>
              ({anonymousId}), including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Sessions, tracked events, and performance metrics</li>
                <li>Identifying profile properties</li>
                <li>Geographic and device data</li>
                <li>Identity-linked external form submissions</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Erasing..." : "Erase Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
