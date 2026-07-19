"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { Loader2, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Separator } from "@/components/ui/separator"

import { createEmailSenderAddressSchema } from "@/features/communications/email-settings-contracts";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type SenderAddressRow =
  RouterOutput["emailSettings"]["listSenderAddresses"][number];

const EMPTY_FORM = {
  emailDomainId: "",
  email: "",
  displayName: "",
  replyTo: "",
  isDefault: false,
  isDisabled: false,
};

export function SenderAddressDialog({
  address,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  address?: SenderAddressRow | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const domains = useQuery(trpc.emailDomains.list.queryOptions());

  React.useEffect(() => {
    if (!open) return;
    setForm(
      address
        ? {
            emailDomainId: address.emailDomainId,
            email: address.email,
            displayName: address.displayName,
            replyTo: address.replyTo ?? "",
            isDefault: address.isDefault,
            isDisabled: address.isDisabled,
          }
        : EMPTY_FORM,
    );
  }, [address, open]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.emailSettings.listSenderAddresses.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.emailDomains.list.queryKey(),
      }),
    ]);
  };
  const create = useMutation(
    trpc.emailSettings.createSenderAddress.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Sender address created");
        setOpen(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const update = useMutation(
    trpc.emailSettings.updateSenderAddress.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Sender address updated");
        setOpen(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const submit = () => {
    const parsed = createEmailSenderAddressSchema.safeParse({
      ...form,
      replyTo: form.replyTo.trim() || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the sender details.");
      return;
    }
    if (address) {
      update.mutate({
        id: address.id,
        ...parsed.data,
        isDisabled: form.isDisabled,
      });
    } else {
      create.mutate(parsed.data);
    }
  };
  const pending = create.isPending || update.isPending;
  const activeDomains = (domains.data ?? []).filter(
    (domain) => !domain.isDisabled && !domain.removedAt,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined ? (
        <DialogTrigger asChild>
          <Button size="sm" className="w-max" variant="gradient">
            <Plus className="size-3" />
            Add sender address
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {address ? "Edit sender address" : "Add sender address"}
          </DialogTitle>
        </DialogHeader>

        <Separator />


        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 sm:col-span-2">
            <Label htmlFor="sender-domain">Sender domain</Label>
            <Select
              value={form.emailDomainId}
              onValueChange={(emailDomainId) =>
                setForm((current) => ({ ...current, emailDomainId }))
              }
            >
              <SelectTrigger id="sender-domain" className="w-full">
                <SelectValue placeholder="Select a domain" />
              </SelectTrigger>
              <SelectContent>
                {activeDomains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.domain} · {domain.status.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Field
            id="sender-email"
            label="Email address"
            type="email"
            value={form.email}
            placeholder="hello@example.com"
            onChange={(email) => setForm((current) => ({ ...current, email }))}
          />

          <Field
            id="sender-name"
            label="Display name"
            value={form.displayName}
            placeholder="Your company"
            onChange={(displayName) =>
              setForm((current) => ({ ...current, displayName }))
            }
          />
          <div className="sm:col-span-2">
            <Field
              id="sender-reply-to"
              label="Reply-to address"
              type="email"
              value={form.replyTo}
              placeholder="support@example.com"
              onChange={(replyTo) =>
                setForm((current) => ({ ...current, replyTo }))
              }
            />
          </div>
          <label className="flex items-center gap-2 text-xs sm:col-span-2">
            <Checkbox
              checked={form.isDefault}
              disabled={form.isDisabled}
              onCheckedChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  isDefault: checked === true,
                }))
              }
            />
            Use as the default sender address
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending} className="w-max" variant="gradient">
            {pending ? <Loader2 className="animate-spin" /> : null}
            {address ? "Save changes" : "Add sender"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  ...inputProps
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "id" | "value" | "onChange">) {
  return (
    <div className="space-y-3">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
      />
    </div>
  );
}
