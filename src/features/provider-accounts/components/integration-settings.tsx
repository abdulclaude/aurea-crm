"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Pause, Pencil, Plus, RefreshCw, Trash2, Unplug } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  emptyIntegrationForm,
  IntegrationAccountFormDialog,
  type IntegrationAccountFormState,
} from "@/features/provider-accounts/components/integration-account-form-dialog";
import {
  type IntegrationProviderConfig,
  type IntegrationProviderFamily,
} from "@/features/provider-accounts/contracts";
import type { IntegrationProviderDefinition } from "@/features/provider-accounts/integration-catalog";
import { useTRPC } from "@/trpc/client";

type FamilyFilter = "ALL" | IntegrationProviderFamily;

export function IntegrationSettings() {
  const trpc = useTRPC();
  const catalogQuery = useQuery(trpc.providerAccounts.integrationCatalog.queryOptions());
  const accountsQuery = useQuery(trpc.providerAccounts.listIntegrations.queryOptions());
  const definitions = catalogQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const [family, setFamily] = useState<FamilyFilter>("ALL");
  const [form, setForm] = useState<IntegrationAccountFormState | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const filteredDefinitions = useMemo(
    () => definitions.filter((item) => family === "ALL" || item.family === family),
    [definitions, family],
  );

  const refresh = async () => accountsQuery.refetch();
  const saveMutation = useMutation(trpc.providerAccounts.saveIntegration.mutationOptions({
    onSuccess: async () => {
      toast.success("Integration saved; remote verification is still required");
      setForm(null);
      setValidationIssues([]);
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  }));
  const validationMutation = useMutation(trpc.providerAccounts.validateIntegration.mutationOptions({
    onSuccess: (result) => {
      setValidationIssues(result.issues);
      toast[result.valid ? "success" : "error"](
        result.valid ? "Local validation passed" : "Integration needs attention",
      );
    },
    onError: (error) => toast.error(error.message),
  }));
  const pauseMutation = useMutation(trpc.providerAccounts.pauseIntegration.mutationOptions({
    onSuccess: async () => { toast.success("Integration paused"); await refresh(); },
    onError: (error) => toast.error(error.message),
  }));
  const reconnectMutation = useMutation(trpc.providerAccounts.reconnectIntegration.mutationOptions({
    onSuccess: async () => { toast.success("Integration queued for verification"); await refresh(); },
    onError: (error) => toast.error(error.message),
  }));
  const disconnectMutation = useMutation(trpc.providerAccounts.disconnectIntegration.mutationOptions({
    onSuccess: async () => { toast.success("Integration disconnected"); await refresh(); },
    onError: (error) => toast.error(error.message),
  }));
  const deleteMutation = useMutation(trpc.providerAccounts.deleteIntegration.mutationOptions({
    onSuccess: async () => {
      toast.success("Disconnected integration removed");
      setDeleteId(null);
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  }));

  if (catalogQuery.isLoading || accountsQuery.isLoading) {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  }

  const startCreate = (definition: IntegrationProviderDefinition) => {
    setValidationIssues([]);
    setForm(emptyIntegrationForm(definition));
  };
  const editAccount = (
    account: NonNullable<typeof accountsQuery.data>[number],
    definition: IntegrationProviderDefinition,
  ) => {
    setValidationIssues([]);
    setForm({
      id: account.id,
      provider: account.provider,
      displayName: account.displayName,
      inheritToLocations: account.config.inheritToLocations,
      syncDirection: account.config.syncDirection,
      settings: settingsFromConfig(account.config),
      credentials: {},
    });
  };
  const submit = (mode: "validate" | "save") => {
    if (!form) return;
    const credentials = Object.fromEntries(
      Object.entries(form.credentials).filter(([, value]) => value.trim()),
    );
    const input = {
      ...form,
      credentials: Object.keys(credentials).length ? credentials : undefined,
    };
    if (mode === "validate") validationMutation.mutate(input);
    else saveMutation.mutate(input);
  };

  return (
    <div className="space-y-4">
      <Tabs value={family} onValueChange={(value) => setFamily(value as FamilyFilter)}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="ALL">All</TabsTrigger>
          {(["MARKETPLACE", "ACCESS_CONTROL", "MARKETING_SYNC", "VIDEO_MEETING", "FITNESS_DISPLAY"] as const).map((item) => (
            <TabsTrigger key={item} value={item}>{item.toLowerCase().replaceAll("_", " ")}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-x-auto border-y">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Family</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Sync</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-44 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDefinitions.map((definition) => {
              const local = accounts.find((account) => account.provider === definition.provider && !account.inherited);
              const inherited = accounts.find((account) => account.provider === definition.provider && account.inherited);
              const account = local ?? inherited;
              return (
                <TableRow key={definition.provider}>
                  <TableCell><div className="font-medium">{definition.label}</div><div className="text-xs text-muted-foreground">{definition.description}</div></TableCell>
                  <TableCell className="text-xs">{definition.family.toLowerCase().replaceAll("_", " ")}</TableCell>
                  <TableCell>{account ? <Badge variant="outline">{account.inherited ? "Inherited" : account.locationId ? "Location" : "Organization"}</Badge> : "—"}</TableCell>
                  <TableCell className="text-xs">{account?.config.syncDirection.toLowerCase() ?? "—"}</TableCell>
                  <TableCell><div className="flex max-w-64 flex-wrap gap-1">{definition.capabilities.map((capability) => <Badge key={capability} variant="outline">{capability}</Badge>)}</div></TableCell>
                  <TableCell><StatusBadge status={account?.status ?? "NOT_CONFIGURED"} readiness={account?.config.readiness} /></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {!local && <Button size="sm" variant="outline" onClick={() => startCreate(definition)}><Plus className="size-4" />{inherited ? "Override" : "Configure"}</Button>}
                      {local && <>
                        <IconButton label="Edit" icon={Pencil} onClick={() => editAccount(local, definition)} />
                        {local.status === "PAUSED" || local.status === "DISCONNECTED" ? <IconButton label="Reconnect" icon={RefreshCw} onClick={() => reconnectMutation.mutate({ id: local.id })} /> : <IconButton label="Pause" icon={Pause} onClick={() => pauseMutation.mutate({ id: local.id })} />}
                        {local.status !== "DISCONNECTED" && <IconButton label="Disconnect" icon={Unplug} onClick={() => disconnectMutation.mutate({ id: local.id })} />}
                        {local.status === "DISCONNECTED" && <IconButton label="Delete" icon={Trash2} onClick={() => setDeleteId(local.id)} />}
                      </>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {form && <IntegrationAccountFormDialog open form={form} definitions={definitions} hasSecret={Boolean(form.id && accounts.find((account) => account.id === form.id)?.hasSecret)} pending={saveMutation.isPending || validationMutation.isPending} validationIssues={validationIssues} onOpenChange={(open) => !open && setForm(null)} onChange={setForm} onValidate={() => submit("validate")} onSave={() => submit("save")} />}
      <DeleteIntegrationDialog id={deleteId} pending={deleteMutation.isPending} onOpenChange={(open) => !open && setDeleteId(null)} onDelete={() => deleteId && deleteMutation.mutate({ id: deleteId })} />
    </div>
  );
}

function settingsFromConfig(config: IntegrationProviderConfig): Record<string, string> {
  switch (config.provider) {
    case "CLASSPASS": return { partnerId: config.partnerId ?? "" };
    case "WELLHUB": return { gymId: config.gymId ?? "" };
    case "KISI": return { placeId: config.placeId ?? "" };
    case "MAILCHIMP": return { audienceId: config.audienceId ?? "", serverPrefix: config.serverPrefix ?? "" };
    case "ZOOM": return { hostEmail: config.hostEmail ?? "" };
    case "SPIVI": return { studioId: config.studioId ?? "" };
  }
}

function StatusBadge({ status, readiness }: { status: string; readiness?: string }) {
  return <div className="space-y-1"><Badge variant={status === "PENDING_VERIFICATION" ? "secondary" : "outline"}>{status.toLowerCase().replaceAll("_", " ")}</Badge>{readiness && <div className="text-xs text-muted-foreground">{readiness.toLowerCase().replaceAll("_", " ")}</div>}</div>;
}

function IconButton({ label, icon: Icon, onClick }: { label: string; icon: typeof Pencil; onClick: () => void }) {
  return <Button size="icon" variant="ghost" title={label} aria-label={label} onClick={onClick}><Icon className="size-4" /></Button>;
}

function DeleteIntegrationDialog({ id, pending, onOpenChange, onDelete }: { id: string | null; pending: boolean; onOpenChange: (open: boolean) => void; onDelete: () => void }) {
  return <AlertDialog open={Boolean(id)} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete disconnected integration?</AlertDialogTitle><AlertDialogDescription>This removes its saved configuration and resource mappings.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={onDelete}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
