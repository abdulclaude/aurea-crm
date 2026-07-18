"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InboxRouteField as Field,
  InboxRouteToggle as Toggle,
} from "@/features/inbox/components/inbox-route-settings-fields";
import { useTRPC } from "@/trpc/client";

const NEW_ROUTE = "__new__";

type RouteForm = {
  id?: string;
  providerAccountId: string;
  name: string;
  inboundAddress: string;
  isDefault: boolean;
  isActive: boolean;
};

const emptyForm: RouteForm = {
  providerAccountId: "",
  name: "Primary inbox",
  inboundAddress: "",
  isDefault: true,
  isActive: true,
};

export function InboxRouteSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const routes = useQuery(trpc.inbox.listRoutes.queryOptions());
  const accounts = useQuery(trpc.providerAccounts.list.queryOptions());
  const [form, setForm] = useState<RouteForm>(emptyForm);
  const resendAccounts =
    accounts.data?.filter(
      (account) => account.provider === "RESEND" && account.status === "ACTIVE",
    ) ?? [];

  useEffect(() => {
    if (form.providerAccountId || resendAccounts.length !== 1) return;
    const account = resendAccounts[0];
    if (account) {
      setForm((current) => ({ ...current, providerAccountId: account.id }));
    }
  }, [form.providerAccountId, resendAccounts]);

  const saveRoute = useMutation(
    trpc.inbox.upsertRoute.mutationOptions({
      onSuccess: async (saved) => {
        toast.success("Inbox route saved");
        setForm({
          id: saved.id,
          providerAccountId: saved.providerAccountId,
          name: saved.name,
          inboundAddress: saved.inboundAddress,
          isDefault: saved.isDefault,
          isActive: saved.isActive,
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.inbox.listRoutes.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const selectRoute = (id: string) => {
    if (id === NEW_ROUTE) {
      setForm({
        ...emptyForm,
        providerAccountId: resendAccounts[0]?.id ?? "",
      });
      return;
    }
    const route = routes.data?.find((candidate) => candidate.id === id);
    if (route) {
      setForm({
        id: route.id,
        providerAccountId: route.providerAccountId,
        name: route.name,
        inboundAddress: route.inboundAddress,
        isDefault: route.isDefault,
        isActive: route.isActive,
      });
    }
  };

  if (routes.isLoading || accounts.isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Loading inbox routes
      </div>
    );
  }
  if (routes.isError || accounts.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Inbox routes could not be loaded</AlertTitle>
        <AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => Promise.all([routes.refetch(), accounts.refetch()])}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const missingFields = [
    !form.providerAccountId ? "Resend account" : null,
    !form.name.trim() ? "route name" : null,
    !form.inboundAddress.trim() ? "inbound address" : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-medium">Inbound email routes</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Route received email through an exact Resend account in this workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field id="inbox-route-select" label="Route">
          <Select value={form.id ?? NEW_ROUTE} onValueChange={selectRoute}>
            <SelectTrigger id="inbox-route-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NEW_ROUTE}>New route</SelectItem>
              {routes.data?.map((route) => (
                <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="inbox-route-account" label="Resend account" required>
          <Select
            value={form.providerAccountId}
            onValueChange={(providerAccountId) =>
              setForm((current) => ({ ...current, providerAccountId }))
            }
          >
            <SelectTrigger id="inbox-route-account" aria-required="true">
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {resendAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.displayName}{account.inherited ? " (organization)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="inbox-route-name" label="Route name" required>
          <Input
            id="inbox-route-name"
            required
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />
        </Field>
        <Field id="inbox-route-address" label="Inbound address" required>
          <Input
            id="inbox-route-address"
            type="email"
            required
            placeholder="inbox@example.com"
            value={form.inboundAddress}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                inboundAddress: event.target.value,
              }))
            }
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-3 border-y py-4">
        <Toggle
          id="inbox-route-active"
          label="Active"
          checked={form.isActive}
          onCheckedChange={(isActive) =>
            setForm((current) => ({ ...current, isActive }))
          }
        />
        <Toggle
          id="inbox-route-default"
          label="Default reply route"
          checked={form.isDefault}
          onCheckedChange={(isDefault) =>
            setForm((current) => ({ ...current, isDefault }))
          }
        />
      </div>

      {missingFields.length > 0 ? (
        <p id="inbox-route-save-requirements" className="text-xs text-muted-foreground">
          Required: {missingFields.join(", ")}.
        </p>
      ) : null}
      <Button
        disabled={
          saveRoute.isPending ||
          !form.providerAccountId ||
          !form.name.trim() ||
          !form.inboundAddress.trim()
        }
        aria-describedby={
          missingFields.length > 0 ? "inbox-route-save-requirements" : undefined
        }
        onClick={() => saveRoute.mutate(form)}
      >
        {saveRoute.isPending && <Loader2 className="size-4 animate-spin" />}
        Save inbox route
      </Button>
    </div>
  );
}
