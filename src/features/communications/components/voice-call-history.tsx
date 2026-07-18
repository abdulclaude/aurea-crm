"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";

export function VoiceCallHistory() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const calls = useQuery(trpc.communications.listVoiceCalls.queryOptions());
  const [providerCallSids, setProviderCallSids] = useState<Record<string, string>>({});
  const resolve = useMutation(
    trpc.communications.resolveAmbiguousVoiceCall.mutationOptions({
      onSuccess: async (_data, variables) => {
        setProviderCallSids((current) => ({ ...current, [variables.id]: "" }));
        toast.success("Voice call reconciled");
        await queryClient.invalidateQueries({
          queryKey: trpc.communications.listVoiceCalls.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  if (calls.isLoading)
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Loading calls
      </div>
    );
  if (!calls.data?.length) return null;
  return (
    <div className="border-t pt-5">
      <h2 className="text-sm font-medium">Recent calls</h2>
      <div className="mt-3">
        {calls.data.map((call) => (
          <div
            key={call.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">
                {call.direction === "INBOUND" ? call.fromNumber : call.toNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {call.durationSeconds ?? 0}s · {call.currency}{" "}
                {call.customerCharge}
              </p>
              {call.failureCode === "TWILIO_CALL_RECONCILIATION_REQUIRED" ? (
                <div className="mt-2 flex max-w-md flex-wrap gap-2">
                  <Input
                    aria-label={`Twilio call SID for reconciling ${call.toNumber ?? call.fromNumber}`}
                    placeholder="CA..."
                    value={providerCallSids[call.id] ?? ""}
                    onChange={(event) =>
                      setProviderCallSids((current) => ({
                        ...current,
                        [call.id]: event.target.value,
                      }))
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      resolve.isPending ||
                      !/^CA[a-fA-F0-9]{32}$/.test(
                        providerCallSids[call.id] ?? "",
                      )
                    }
                    onClick={() =>
                      resolve.mutate({
                        id: call.id,
                        resolution: "CORRELATE",
                        providerCallSid: providerCallSids[call.id] ?? "",
                      })
                    }
                  >
                    Match call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolve.isPending}
                    onClick={() =>
                      resolve.mutate({ id: call.id, resolution: "NOT_CREATED" })
                    }
                  >
                    Mark not created
                  </Button>
                </div>
              ) : null}
            </div>
            <Badge variant="outline" className="h-fit capitalize">
              {call.status.replaceAll("_", " ").toLowerCase()}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
