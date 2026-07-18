"use client";

import { useState, Suspense } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CheckIcon, ChevronsUpDown, X } from "lucide-react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IntroOffersTable } from "@/features/intro-offers/components/intro-offers-table";

const OFFER_TYPES = [
  { value: "TRIAL_CLASSES", label: "Trial classes" },
  { value: "UNLIMITED_TRIAL", label: "Unlimited trial" },
  { value: "DISCOUNTED_PACK", label: "Discounted pack" },
  { value: "FREE_CLASS", label: "Free class" },
  { value: "FIRST_MONTH_DISCOUNT", label: "First month discount" },
] as const;

type OfferType = (typeof OFFER_TYPES)[number]["value"];

export default function IntroOffersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [classTypesOpen, setClassTypesOpen] = useState(false);

  const [name, setName] = useState("");
  const [offerType, setOfferType] = useState<OfferType>("TRIAL_CLASSES");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [classCredits, setClassCredits] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [allowedClassTypeIds, setAllowedClassTypeIds] = useState<string[]>([]);

  const { data: classTypes } = useQuery(trpc.classTypes.list.queryOptions({}));

  const createMutation = useMutation(trpc.introOffers.create.mutationOptions());

  function resetForm() {
    setName("");
    setOfferType("TRIAL_CLASSES");
    setPrice("");
    setDurationDays("7");
    setClassCredits("");
    setMaxRedemptions("");
    setAllowedClassTypeIds([]);
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Offer name is required");
      return;
    }
    const selectedNames = allowedClassTypeIds
      .map((id) => classTypes?.find((ct) => ct.id === id)?.name)
      .filter(Boolean) as string[];

    createMutation.mutate(
      {
        name: name.trim(),
        offerType,
        price: Number(price) || 0,
        durationDays: Number(durationDays) || 7,
        classCredits: classCredits ? Number(classCredits) : undefined,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        allowedClassTypes: selectedNames,
      },
      {
        onSuccess: () => {
          toast.success("Intro offer created");
          queryClient.invalidateQueries(trpc.introOffers.list.queryOptions());
          resetForm();
          setDialogOpen(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function toggleClassType(id: string) {
    setAllowedClassTypeIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Intro offers</h1>
          <p className="text-xs text-primary/70">
            Create promotional offers to attract new members.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-3" />
          Create offer
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12 text-sm text-primary/40">
            Loading offers...
          </div>
        }
      >
        <IntroOffersTable />
      </Suspense>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create intro offer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Offer name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 3 Classes for £29"
              />
            </div>

            <div className="space-y-2">
              <Label>Offer type</Label>
              <Select
                value={offerType}
                onValueChange={(v) => setOfferType(v as OfferType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Class credits</Label>
                <Input
                  type="number"
                  min={1}
                  value={classCredits}
                  onChange={(e) => setClassCredits(e.target.value)}
                  placeholder="Unlimited if empty"
                />
              </div>
              <div className="space-y-2">
                <Label>Max redemptions</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  placeholder="Unlimited if empty"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Allowed class types</Label>
              <Popover open={classTypesOpen} onOpenChange={setClassTypesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal h-9 text-xs"
                  >
                    {allowedClassTypeIds.length === 0 ? (
                      <span className="text-primary/50">
                        All class types allowed
                      </span>
                    ) : (
                      <span className="truncate">
                        {allowedClassTypeIds.length} selected
                      </span>
                    )}
                    <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search class types..."
                      className="text-xs h-8"
                    />
                    <CommandList>
                      <CommandEmpty className="text-xs text-primary/50 py-3 text-center">
                        No class types found.
                      </CommandEmpty>
                      <CommandGroup>
                        {classTypes?.map((ct) => (
                          <CommandItem
                            key={ct.id}
                            value={ct.name}
                            onSelect={() => toggleClassType(ct.id)}
                            className="text-xs"
                          >
                            <CheckIcon
                              className={cn(
                                "size-3.5 mr-2 shrink-0",
                                allowedClassTypeIds.includes(ct.id)
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <span className="flex items-center gap-2">
                              {ct.color && (
                                <span
                                  className="size-2 rounded-full shrink-0"
                                  style={{ backgroundColor: ct.color }}
                                />
                              )}
                              {ct.name}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {allowedClassTypeIds.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {allowedClassTypeIds.map((id) => {
                    const ct = classTypes?.find((c) => c.id === id);
                    if (!ct) return null;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="text-[10px] gap-1 pr-1"
                      >
                        {ct.color && (
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: ct.color }}
                          />
                        )}
                        {ct.name}
                        <button
                          type="button"
                          onClick={() => toggleClassType(id)}
                          className="ml-0.5 hover:text-destructive"
                        >
                          <X className="size-2.5" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="w-max" variant="gradient" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
