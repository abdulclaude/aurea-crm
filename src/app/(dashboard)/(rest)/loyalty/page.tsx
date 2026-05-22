"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { Trophy, Gift, Plus, Crown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIER_COLORS: Record<string, string> = {
  BRONZE: "#CD7F32",
  SILVER: "#C0C0C0",
  GOLD: "#FFD700",
  PLATINUM: "#E5E4E2",
};

export default function LoyaltyPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showRewardDialog, setShowRewardDialog] = useState(false);

  const { data: program, isLoading } = useQuery(trpc.loyalty.getProgram.queryOptions());

  const { data: leaderboard = [] } = useQuery({
    ...trpc.loyalty.getLeaderboard.queryOptions({ limit: 10 }),
    enabled: !!program,
  });

  const [config, setConfig] = useState({
    name: "Rewards",
    pointsPerClass: 10,
    pointsPerReferral: 50,
    pointsPerPurchase: 1,
    purchasePointsUnit: 1,
  });

  const [reward, setReward] = useState({
    name: "",
    description: "",
    pointsCost: 100,
    type: "FREE_CLASS" as const,
    value: "",
    stock: "",
  });

  const setupMutation = useMutation({
    ...trpc.loyalty.setupProgram.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.loyalty.getProgram.queryKey() });
      toast.success("Program saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    ...trpc.loyalty.toggleProgram.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.loyalty.getProgram.queryKey() });
      toast.success("Program toggled");
    },
    onError: (err) => toast.error(err.message),
  });

  const createRewardMutation = useMutation({
    ...trpc.loyalty.createReward.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.loyalty.getProgram.queryKey() });
      setShowRewardDialog(false);
      setReward({ name: "", description: "", pointsCost: 100, type: "FREE_CLASS", value: "", stock: "" });
      toast.success("Reward created");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return null;

  if (!program) {
    return (
      <div className="space-y-0">
        <div className="flex items-end justify-between gap-4 p-6">
          <div>
            <h1 className="text-lg font-semibold text-primary">Loyalty Rewards</h1>
            <p className="text-xs text-primary/70">
              Reward members for attendance, referrals, and purchases.
            </p>
          </div>
        </div>

        <Separator className="bg-black/5 dark:bg-white/5" />

        <div className="p-6 max-w-lg space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-primary/75">Program name</Label>
              <Input value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-primary/75">Points per class</Label>
              <Input type="number" value={config.pointsPerClass} onChange={(e) => setConfig({ ...config, pointsPerClass: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-primary/75">Points per referral</Label>
              <Input type="number" value={config.pointsPerReferral} onChange={(e) => setConfig({ ...config, pointsPerReferral: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-primary/75">Points per purchase (per unit)</Label>
              <Input type="number" value={config.pointsPerPurchase} onChange={(e) => setConfig({ ...config, pointsPerPurchase: Number(e.target.value) })} />
            </div>
          </div>
          <Button onClick={() => setupMutation.mutate(config)} disabled={setupMutation.isPending}>
            {setupMutation.isPending ? "Creating..." : "Create program"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Loyalty Rewards</h1>
          <p className="text-xs text-primary/70">
            Reward members for attendance, referrals, and purchases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-primary/40">{program.isActive ? "Active" : "Inactive"}</span>
          <Switch checked={program.isActive} onCheckedChange={(checked) => toggleMutation.mutate({ isActive: checked })} />
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="p-6 space-y-6">
        {/* Program config */}
        <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-[#202e32] p-1 shadow-xs">
          <div className="rounded-[calc(var(--radius-xl)-4px)] border border-black/[0.04] dark:border-white/[0.04] p-4">
            <p className="text-xs font-medium text-primary mb-3">Program settings</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="space-y-0.5">
                <p className="text-[11px] text-primary/40">Per class</p>
                <p className="text-xs font-medium text-primary">{program.pointsPerClass} pts</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] text-primary/40">Per referral</p>
                <p className="text-xs font-medium text-primary">{program.pointsPerReferral} pts</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] text-primary/40">Per purchase</p>
                <p className="text-xs font-medium text-primary">{program.pointsPerPurchase} pts</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] text-primary/40">Purchase unit</p>
                <p className="text-xs font-medium text-primary">${String(program.purchasePointsUnit)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary">Rewards</h2>
            <Button variant="outline" size="sm" onClick={() => setShowRewardDialog(true)}>
              <Plus className="size-3.5" /> Add reward
            </Button>
          </div>
          {program.rewards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 dark:border-white/10 py-10 text-center">
              <Gift className="size-6 mx-auto mb-2 text-primary/20" />
              <p className="text-sm text-primary/40">No rewards yet. Add one to get started.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {program.rewards.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-[#202e32] p-1 shadow-xs"
                >
                  <div className="flex items-center justify-between rounded-[calc(var(--radius-xl)-4px)] border border-black/[0.04] dark:border-white/[0.04] px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-primary">{r.name}</p>
                      {r.description && <p className="text-[11px] text-primary/40">{r.description}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs">{r.pointsCost} pts</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="bg-black/5 dark:bg-white/5" />

        {/* Leaderboard */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-1.5">
            <Crown className="size-3.5" /> Leaderboard
          </h2>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-primary/40">No members yet.</p>
          ) : (
            <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-[#202e32] p-1 shadow-xs">
              <div className="rounded-[calc(var(--radius-xl)-4px)] border border-black/[0.04] dark:border-white/[0.04] divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {leaderboard.map((entry, idx) => (
                  <div key={entry.clientId} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-primary/40 w-5">#{idx + 1}</span>
                      <span className="text-xs font-medium text-primary">
                        {entry.client?.name ?? entry.client?.email ?? "Unknown member"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-primary/60">{entry.lifetimePoints} pts</span>
                      <Badge
                        style={{
                          backgroundColor: TIER_COLORS[entry.tier],
                          color: entry.tier === "PLATINUM" ? "#333" : "#fff",
                        }}
                        className="text-[10px] px-1.5 py-0 border-0"
                      >
                        {entry.tier}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add reward dialog */}
      <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add reward</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={reward.name} onChange={(e) => setReward({ ...reward, name: e.target.value })} placeholder="Free class pass" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={reward.description} onChange={(e) => setReward({ ...reward, description: e.target.value })} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Points cost</Label>
                <Input type="number" value={reward.pointsCost} onChange={(e) => setReward({ ...reward, pointsCost: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={reward.type} onValueChange={(v) => setReward({ ...reward, type: v as typeof reward.type })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE_CLASS">Free class</SelectItem>
                    <SelectItem value="DISCOUNT_PERCENT">Discount %</SelectItem>
                    <SelectItem value="DISCOUNT_FIXED">Discount fixed</SelectItem>
                    <SelectItem value="MERCHANDISE">Merchandise</SelectItem>
                    <SelectItem value="EXPERIENCE">Experience</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Value (optional)</Label>
                <Input value={reward.value} onChange={(e) => setReward({ ...reward, value: e.target.value })} placeholder="e.g. 10%" />
              </div>
              <div className="space-y-1.5">
                <Label>Stock (optional)</Label>
                <Input type="number" value={reward.stock} onChange={(e) => setReward({ ...reward, stock: e.target.value })} placeholder="Unlimited" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRewardDialog(false)}>Cancel</Button>
            <Button
              disabled={!reward.name || createRewardMutation.isPending}
              onClick={() => createRewardMutation.mutate({
                name: reward.name,
                pointsCost: reward.pointsCost,
                type: reward.type,
                description: reward.description || undefined,
                value: reward.value || undefined,
                stock: reward.stock ? Number(reward.stock) : undefined,
              })}
            >
              Create reward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
