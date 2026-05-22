"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function LaunchpadMembershipsPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");
  const [billingInterval, setBillingInterval] = useState("");

  const create = useMutation(
    trpc.membershipPlans.create.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries();
        toast.success("Membership plan created");
        router.push("/launchpad");
      },
    }),
  );

  return (
    <div className="flex-1 flex items-center justify-center p-6 mx-auto w-xl">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-primary">
              Create a membership plan
            </h1>
            <p className="text-xs text-primary/50">
              Set up pricing plans for your members.
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <form
          className="flex flex-col gap-4 w-full"
          onSubmit={(e) => {
            e.preventDefault();
            if (!type || !billingInterval) return;
            create.mutate({
              name,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: type as any,
              price: parseFloat(price),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              billingInterval: billingInterval as any,
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-3">
              <Label>Plan name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Monthly Unlimited"
                required
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNLIMITED">Unlimited</SelectItem>
                  <SelectItem value="CLASS_PACK">Class pack</SelectItem>
                  <SelectItem value="DROP_IN">Drop in</SelectItem>
                  <SelectItem value="TIME_BASED">Time based</SelectItem>
                  <SelectItem value="INTRO_OFFER">Intro offer</SelectItem>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-3">
              <Label>Price (USD)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., 99"
                required
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label>Billing interval</Label>
              <Select
                value={billingInterval}
                onValueChange={setBillingInterval}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="ANNUALLY">Annually</SelectItem>
                  <SelectItem value="ONE_TIME">One Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/launchpad")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || !type || !billingInterval}
            >
              {create.isPending ? "Creating..." : "Create plan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
