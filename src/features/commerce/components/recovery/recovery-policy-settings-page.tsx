"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  recoveryTargetSchema,
  recoveryTargets,
  type RecoveryTarget,
} from "@/features/commerce/recovery-contracts";
import { useTRPC } from "@/trpc/client";

import { RecoveryPolicyForm } from "./recovery-policy-form";
import {
  defaultRecoveryPolicy,
  TARGET_LABELS,
  type RecoveryPolicyEditorValue,
} from "./recovery-policy-types";

export function RecoveryPolicySettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const [target, setTarget] = useState<RecoveryTarget>("INVOICE");
  const permissions = useQuery({
    ...trpc.permissions.getCurrent.queryOptions(),
    enabled: hydrated,
    retry: false,
  });
  const policies = useQuery({
    ...trpc.paymentRecovery.listPolicies.queryOptions(),
    enabled: hydrated,
    retry: false,
  });
  const canInherit = Boolean(permissions.data?.locationId);
  const canManage = Boolean(
    permissions.data?.capabilities.includes("commerce.manage"),
  );
  const selected = policies.data?.find((policy) => policy.target === target);
  const initialValue = useMemo(
    () =>
      policyEditorValue(
        target,
        canInherit,
        selected?.exact ?? null,
        selected?.effective ?? null,
      ),
    [canInherit, selected?.effective, selected?.exact, target],
  );
  const [value, setValue] = useState<RecoveryPolicyEditorValue>(initialValue);

  useEffect(() => setHydrated(true), []);
  useEffect(() => setValue(initialValue), [initialValue]);

  const save = useMutation(
    trpc.paymentRecovery.versionPolicy.mutationOptions({
      onSuccess: async (policy) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.paymentRecovery.listPolicies.queryKey(),
        });
        toast.success(`Saved version ${policy.version}`);
      },
      onError: (error) =>
        toast.error("Policy was not saved", { description: error.message }),
    }),
  );

  return (
    <div className="min-w-0">
      <header className="p-8">
        <h1 className="text-xl font-semibold">Payment recovery</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Versioned retry, reminder, grace-period, and escalation policy.
        </p>
      </header>
      <Separator />
      <div className="p-4 sm:px-8">
        <Tabs
          value={target}
          onValueChange={(next) => {
            const parsed = recoveryTargetSchema.safeParse(next);
            if (parsed.success) setTarget(parsed.data);
          }}
        >
          <TabsList>
            {recoveryTargets.map((item) => (
              <TabsTrigger key={item} value={item}>
                {TARGET_LABELS[item]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <Separator />
      {policies.isError ? (
        <div className="p-8">
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Policies unavailable</AlertTitle>
            <AlertDescription>{policies.error.message}</AlertDescription>
          </Alert>
        </div>
      ) : policies.isPending || !hydrated ? (
        <p className="p-8 text-xs text-muted-foreground">Loading policies...</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 text-xs text-muted-foreground sm:px-8">
            <span>
              Current version: {selected?.exact?.version ?? "Not configured"}
            </span>
            {value.mode === "INHERIT" && (
              <span>
                Organization version:{" "}
                {selected?.inherited?.version ?? "Unavailable"}
              </span>
            )}
            {!canManage && <span>View only</span>}
          </div>
          <Separator />
          <RecoveryPolicyForm
            value={value}
            canInherit={canInherit}
            canManage={canManage}
            isPending={save.isPending}
            onChange={setValue}
            onSave={() =>
              save.mutate({
                target: value.target,
                mode: value.mode,
                name: value.name,
                gracePeriodDays: value.gracePeriodDays,
                maxActions: Math.max(value.maxActions, value.schedule.length),
                scheduleDays: value.schedule.map((step) => step.day),
                steps: value.schedule.map((step) => ({ type: step.type })),
              })
            }
          />
        </>
      )}
    </div>
  );
}

function policyEditorValue(
  target: RecoveryTarget,
  canInherit: boolean,
  exactPolicy: PolicyEditorSource | null,
  effectivePolicy: PolicyEditorSource | null,
): RecoveryPolicyEditorValue {
  const shouldInherit =
    canInherit && (!exactPolicy || exactPolicy.mode === "INHERIT");
  const policy = shouldInherit ? (effectivePolicy ?? exactPolicy) : exactPolicy;
  if (!policy) return defaultRecoveryPolicy(target, canInherit);
  return {
    target,
    mode: shouldInherit ? "INHERIT" : policy.mode,
    name: policy.name,
    gracePeriodDays: policy.gracePeriodDays,
    maxActions: policy.maxActions,
    schedule: policy.scheduleDays.map((day, index) => ({
      day,
      type: policy.steps[index]?.type ?? "SEND_EMAIL",
    })),
  };
}

type PolicyEditorSource = {
  mode: "INHERIT" | "ENABLED" | "DISABLED";
  name: string;
  gracePeriodDays: number;
  maxActions: number;
  scheduleDays: number[];
  steps: Array<{
    type: RecoveryPolicyEditorValue["schedule"][number]["type"];
  }>;
};
