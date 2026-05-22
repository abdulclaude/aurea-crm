"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Copy, Plus, RefreshCw, Trash2, Eye, EyeOff } from "lucide-react";

const SCOPES = [
  { value: "classes:read", label: "Read Classes" },
  { value: "bookings:read", label: "Read bookings" },
  { value: "bookings:write", label: "Create bookings" },
  { value: "members:read", label: "Read clients" },
  { value: "members:write", label: "Create clients" },
  { value: "memberships:read", label: "Read memberships" },
  { value: "instructors:read", label: "Read instructors" },
] as const;

type Scope = (typeof SCOPES)[number]["value"];

export default function DeveloperPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.apiKeys.list.queryOptions());
  const createMutation = useMutation(trpc.apiKeys.create.mutationOptions());
  const revokeMutation = useMutation(trpc.apiKeys.revoke.mutationOptions());
  const rotateMutation = useMutation(trpc.apiKeys.rotate.mutationOptions());
  const deleteMutation = useMutation(trpc.apiKeys.delete.mutationOptions());

  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<Scope[]>([
    "classes:read",
  ]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries(trpc.apiKeys.list.queryOptions());

  function toggleScope(scope: Scope) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function handleCreate() {
    if (!newKeyName.trim() || selectedScopes.length === 0) return;
    try {
      const result = await createMutation.mutateAsync({
        name: newKeyName.trim(),
        scopes: selectedScopes,
      });
      setRevealedKey(result.key);
      setShowKey(true);
      setCreateOpen(false);
      setNewKeyName("");
      setSelectedScopes(["classes:read"]);
      invalidate();
      toast.success("API key created — copy it now, it won't be shown again");
    } catch {
      toast.error("Failed to create API key");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">API Keys</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage API keys for the Aurea public REST API. Base URL:{" "}
          <code className="bg-muted px-1 rounded text-xs">
            {typeof window !== "undefined" ? window.location.origin : ""}/api/v1
          </code>
        </p>
      </div>

      {revealedKey && (
        <Card className="p-4 border-green-500/30 bg-green-500/5">
          <p className="text-sm font-medium text-green-400 mb-2">
            Your new API key — copy it now, it will never be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-background rounded px-3 py-2 border border-white/10">
              {showKey ? revealedKey : "ak_" + "•".repeat(60)}
            </code>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowKey((v) => !v)}
            >
              {showKey ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(revealedKey)}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-muted-foreground"
            onClick={() => setRevealedKey(null)}
          >
            Dismiss
          </Button>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Your API keys</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="size-4" />
              Create key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key name</Label>
                <Input
                  placeholder="e.g. Website widget, Zapier integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SCOPES.map((scope) => (
                    <label
                      key={scope.value}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope.value)}
                        onChange={() => toggleScope(scope.value)}
                        className="rounded"
                      />
                      {scope.label}
                    </label>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={
                  createMutation.isPending ||
                  !newKeyName.trim() ||
                  selectedScopes.length === 0
                }
              >
                {createMutation.isPending ? "Creating…" : "Create key"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.keys.length ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No API keys yet. Create one to get started.
        </Card>
      ) : (
        <div className="space-y-3">
          {data.keys.map((key) => (
            <Card key={key.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{key.name}</span>
                    <Badge
                      variant={key.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {key.isActive ? "Active" : "Revoked"}
                    </Badge>
                  </div>
                  <code className="text-xs text-muted-foreground font-mono">
                    {key.keyPrefix}••••••••
                  </code>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {key.scopes.map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="text-xs px-1.5"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {format(new Date(key.createdAt), "d MMM yyyy")}
                    {key.lastUsedAt &&
                      ` · Last used ${format(new Date(key.lastUsedAt), "d MMM yyyy")}`}
                    {key.expiresAt &&
                      ` · Expires ${format(new Date(key.expiresAt), "d MMM yyyy")}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Rotate key"
                    onClick={async () => {
                      try {
                        const r = await rotateMutation.mutateAsync({
                          id: key.id,
                        });
                        setRevealedKey(r.key);
                        setShowKey(true);
                        invalidate();
                        toast.success("Key rotated — copy the new key");
                      } catch {
                        toast.error("Failed to rotate key");
                      }
                    }}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                  {key.isActive && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Revoke key">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Any integrations using this key will stop working
                            immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await revokeMutation.mutateAsync({
                                  id: key.id,
                                });
                                invalidate();
                                toast.success("Key revoked");
                              } catch {
                                toast.error("Failed to revoke key");
                              }
                            }}
                          >
                            Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3 pt-4 border-t border-white/5">
        <h2 className="text-sm font-semibold">API Reference</h2>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Pass your key as a Bearer token:{" "}
            <code className="bg-muted px-1 rounded">
              Authorization: Bearer ak_…
            </code>
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              {
                method: "GET",
                path: "/api/v1/classes",
                desc: "List upcoming classes",
              },
              {
                method: "GET",
                path: "/api/v1/memberships",
                desc: "List membership plans",
              },
              {
                method: "GET",
                path: "/api/v1/instructors",
                desc: "List instructors",
              },
              {
                method: "GET",
                path: "/api/v1/members",
                desc: "List / search members",
              },
              {
                method: "POST",
                path: "/api/v1/members",
                desc: "Create member",
              },
              {
                method: "GET",
                path: "/api/v1/bookings",
                desc: "List bookings",
              },
              {
                method: "POST",
                path: "/api/v1/bookings",
                desc: "Create a booking",
              },
            ].map(({ method, path, desc }) => (
              <div
                key={path + method}
                className="flex items-start gap-2 bg-muted/40 rounded p-2"
              >
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${method === "POST" ? "border-green-500/40 text-green-400" : "border-blue-500/40 text-blue-400"}`}
                >
                  {method}
                </Badge>
                <div>
                  <code className="text-xs">{path}</code>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
