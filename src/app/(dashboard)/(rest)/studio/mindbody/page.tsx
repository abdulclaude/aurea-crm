"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function MindbodyConnectionPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [siteId, setSiteId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch connection status
  const { data: connection, isLoading } = useQuery(
    trpc.mindbody.getConnection.queryOptions()
  );

  // Mutations
  const connectMutation = useMutation(
    trpc.mindbody.connect.mutationOptions({
      onSuccess: () => {
        toast.success("Connected successfully", {
          description: "Your Mindbody account has been connected.",
        });
        queryClient.invalidateQueries();
        setApiKey("");
        setSiteId("");
        setUsername("");
        setPassword("");
        setIsConnecting(false);
      },
      onError: (error) => {
        toast.error("Connection failed", {
          description: error.message,
        });
        setIsConnecting(false);
      },
    })
  );

  const disconnectMutation = useMutation(
    trpc.mindbody.disconnect.mutationOptions({
      onSuccess: () => {
        toast.success("Disconnected", {
          description: "Your Mindbody account has been disconnected.",
        });
        queryClient.invalidateQueries();
      },
    })
  );

  const testMutation = useMutation(
    trpc.mindbody.testConnection.mutationOptions({
      onSuccess: () => {
        toast.success("Connection is valid", {
          description: "Successfully connected to Mindbody API.",
        });
      },
      onError: () => {
        toast.error("Connection test failed", {
          description: "Unable to connect to Mindbody API.",
        });
      },
    })
  );

  const fullSyncMutation = useMutation(
    trpc.mindbody.triggerFullSync.mutationOptions({
      onSuccess: () => {
        toast.success("Sync started", {
          description: "Full sync job has been queued.",
        });
      },
    })
  );

  const clientsSyncMutation = useMutation(
    trpc.mindbody.triggerClientsSync.mutationOptions({
      onSuccess: () => {
        toast.success("Sync started", {
          description: "Clients sync job has been queued.",
        });
      },
    })
  );

  const classesSyncMutation = useMutation(
    trpc.mindbody.triggerClassesSync.mutationOptions({
      onSuccess: () => {
        toast.success("Sync started", {
          description: "Classes sync job has been queued.",
        });
      },
    })
  );

  const handleConnect = async () => {
    if (!apiKey || !siteId || !username || !password) {
      toast.error("Missing credentials", {
        description: "Please provide all required fields.",
      });
      return;
    }

    setIsConnecting(true);
    connectMutation.mutate({ apiKey, siteId, username, password });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mindbody Integration</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Mindbody account to sync clients, classes, and bookings.
        </p>
      </div>

      {/* Connection Status */}
      {connection ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Connected
            </CardTitle>
            <CardDescription>
              Your Mindbody account is connected and syncing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Site ID</p>
                <p className="font-medium">{connection.siteId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Connection Level</p>
                <p className="font-medium">
                  {connection.subaccountId ? "Subaccount" : "Organization"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Connected At</p>
                <p className="font-medium">
                  {new Date(connection.connectedAt).toLocaleDateString()}
                </p>
              </div>
              {connection.lastClientSync && (
                <div>
                  <p className="text-muted-foreground">Last Client Sync</p>
                  <p className="font-medium">
                    {new Date(connection.lastClientSync).toLocaleString()}
                  </p>
                </div>
              )}
              {connection.lastClassSync && (
                <div>
                  <p className="text-muted-foreground">Last Class Sync</p>
                  <p className="font-medium">
                    {new Date(connection.lastClassSync).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Test Connection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              Not Connected
            </CardTitle>
            <CardDescription>
              Connect your Mindbody account to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                You'll need your Mindbody API credentials and staff login. Get your API key from
                the Mindbody developer portal and use your staff username/password.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your Mindbody API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isConnecting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteId">Site ID</Label>
                <Input
                  id="siteId"
                  placeholder="Enter your Mindbody Site ID (e.g., -99)"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  disabled={isConnecting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Staff Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your staff username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isConnecting}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Staff Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your staff password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isConnecting}
                  autoComplete="current-password"
                />
              </div>

              <Button
                onClick={handleConnect}
                disabled={isConnecting || !apiKey || !siteId || !username || !password}
                className="w-full"
              >
                {isConnecting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Connect Mindbody
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Sync Controls */}
      {connection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Manual Sync
            </CardTitle>
            <CardDescription>
              Trigger manual syncs to update your data from Mindbody.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Full Sync</p>
                <p className="text-sm text-muted-foreground">
                  Sync all clients, classes, bookings, and memberships
                </p>
              </div>
              <Button
                onClick={() => fullSyncMutation.mutate()}
                disabled={fullSyncMutation.isPending}
                size="sm"
              >
                {fullSyncMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sync All
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Clients Only</p>
                <p className="text-sm text-muted-foreground">
                  Sync only client information
                </p>
              </div>
              <Button
                onClick={() => clientsSyncMutation.mutate()}
                disabled={clientsSyncMutation.isPending}
                variant="outline"
                size="sm"
              >
                {clientsSyncMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sync Clients
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Classes Only</p>
                <p className="text-sm text-muted-foreground">
                  Sync class schedule and availability
                </p>
              </div>
              <Button
                onClick={() => classesSyncMutation.mutate()}
                disabled={classesSyncMutation.isPending}
                variant="outline"
                size="sm"
              >
                {classesSyncMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sync Classes
              </Button>
            </div>

            <Alert>
              <AlertDescription>
                Syncs run in the background and may take a few minutes to complete.
                Automatic syncs occur every 4 hours.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
