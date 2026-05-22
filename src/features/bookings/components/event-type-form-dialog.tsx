"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import { BOOKING_LOCATION_LABELS } from "@/features/bookings/constants";

interface EventTypeFormDialogProps {
  eventType?: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventTypeFormDialog({ eventType, open, onOpenChange }: EventTypeFormDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [locationType, setLocationType] = useState("GOOGLE_MEET");
  const [isActive, setIsActive] = useState(true);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [pricingModel, setPricingModel] = useState<"flat" | "duration">("flat");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [durationPricing, setDurationPricing] = useState<
    Array<{ duration: string; price: string }>
  >([]);

  const isEditing = !!eventType;

  // Reset form when eventType changes
  useEffect(() => {
    if (eventType) {
      setTitle(eventType.title || "");
      setSlug(eventType.slug || "");
      setDescription(eventType.description || "");
      setDuration(String(eventType.duration || 30));
      setLocationType(eventType.locationType || "GOOGLE_MEET");
      setIsActive(eventType.isActive ?? true);
      setRequiresPayment(eventType.requiresPayment ?? false);
      setPrice(
        eventType.price !== null && eventType.price !== undefined
          ? String(eventType.price)
          : ""
      );
      setCurrency(eventType.currency || "USD");

      const pricing = eventType.metadata?.pricing;
      const model = pricing?.model === "duration" ? "duration" : "flat";
      setPricingModel(model);
      if (pricing?.durationPricing?.length) {
        setDurationPricing(
          pricing.durationPricing.map((entry: { duration: number; price: number }) => ({
            duration: String(entry.duration),
            price: String(entry.price),
          }))
        );
      } else if (model === "duration") {
        setDurationPricing([{ duration: String(eventType.duration || 30), price: "" }]);
      } else {
        setDurationPricing([]);
      }
    } else {
      resetForm();
    }
  }, [eventType]);

  useEffect(() => {
    if (requiresPayment && pricingModel === "duration" && durationPricing.length === 0) {
      setDurationPricing([{ duration: duration || "30", price: "" }]);
    }
  }, [requiresPayment, pricingModel, duration, durationPricing.length]);

  const createMutation = useMutation(
    trpc.eventTypes.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.eventTypes.getMany.queryOptions({}));
        resetForm();
        onOpenChange(false);
      },
    })
  );

  const updateMutation = useMutation(
    trpc.eventTypes.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.eventTypes.getMany.queryOptions({}));
        onOpenChange(false);
      },
    })
  );

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setDescription("");
    setDuration("30");
    setLocationType("GOOGLE_MEET");
    setIsActive(true);
    setRequiresPayment(false);
    setPricingModel("flat");
    setPrice("");
    setCurrency("USD");
    setDurationPricing([]);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEditing) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async () => {
    if (!title || !slug || !duration) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setIsLoading(true);
      const normalizedPricing = durationPricing
        .map((entry) => ({
          duration: Number(entry.duration),
          price: Number(entry.price),
        }))
        .filter((entry) => Number.isFinite(entry.duration) && Number.isFinite(entry.price));
      const pricingPayload =
        requiresPayment && pricingModel === "duration"
          ? {
              pricingModel: "duration" as const,
              durationPricing: normalizedPricing,
              durationOptions: normalizedPricing.map((entry) => entry.duration),
            }
          : requiresPayment
            ? { pricingModel: "flat" as const }
            : {};
      const priceValue = price ? Number(price) : undefined;

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: eventType.id,
          title,
          slug,
          description: description || undefined,
          duration: parseInt(duration),
          locationType: locationType as any,
          isActive,
          requiresPayment,
          price: requiresPayment && pricingModel === "flat" ? priceValue : undefined,
          currency: requiresPayment ? currency : undefined,
          ...pricingPayload,
        });
      } else {
        await createMutation.mutateAsync({
          title,
          slug,
          description: description || undefined,
          duration: parseInt(duration),
          locationType: locationType as any,
          isActive,
          requiresPayment,
          price: requiresPayment && pricingModel === "flat" ? priceValue : undefined,
          currency: requiresPayment ? currency : undefined,
          ...pricingPayload,
        });
      }
    } catch (error: any) {
      alert(error.message || "Failed to save event type");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Event Type" : "Create Event Type"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update" : "Create"} a booking event type
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="30 Minute Consultation"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="30-minute-consultation"
            />
            <p className="text-xs text-muted-foreground">
              Used in booking URLs
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief consultation to discuss your needs..."
              rows={3}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes) *</Label>
            <Input
              id="duration"
              type="number"
              min="5"
              step="5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          {/* Location Type */}
          <div className="space-y-2">
            <Label htmlFor="locationType">Default Location Type</Label>
            <Select value={locationType} onValueChange={setLocationType}>
              <SelectTrigger id="locationType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BOOKING_LOCATION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active (available for booking)
            </Label>
          </div>

          <div className="space-y-3 border-t border-black/5 pt-4 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="requiresPayment">Payments</Label>
                <p className="text-xs text-muted-foreground">
                  Require payment to confirm bookings.
                </p>
              </div>
              <input
                type="checkbox"
                id="requiresPayment"
                checked={requiresPayment}
                onChange={(e) => setRequiresPayment(e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>

            {requiresPayment && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="pricingModel">Pricing Model</Label>
                  <Select
                    value={pricingModel}
                    onValueChange={(value) =>
                      setPricingModel(value as "flat" | "duration")
                    }
                  >
                    <SelectTrigger id="pricingModel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat rate per booking</SelectItem>
                      <SelectItem value="duration">Price by duration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pricingModel === "flat" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="150"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                        placeholder="USD"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Duration pricing</Label>
                      <p className="text-xs text-muted-foreground">
                        Set pricing for each duration option.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {durationPricing.map((entry, index) => (
                        <div key={`${entry.duration}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <Input
                            type="number"
                            min="5"
                            step="5"
                            value={entry.duration}
                            onChange={(e) => {
                              const next = [...durationPricing];
                              next[index] = { ...next[index], duration: e.target.value };
                              setDurationPricing(next);
                            }}
                            placeholder="Duration (min)"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entry.price}
                            onChange={(e) => {
                              const next = [...durationPricing];
                              next[index] = { ...next[index], price: e.target.value };
                              setDurationPricing(next);
                            }}
                            placeholder="Price"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDurationPricing((prev) =>
                                prev.filter((_, idx) => idx !== index)
                              );
                            }}
                          >
                            <Trash className="size-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDurationPricing((prev) => [
                          ...prev,
                          { duration: duration || "30", price: "" },
                        ])
                      }
                    >
                      <Plus className="size-3.5" />
                      Add duration
                    </Button>
                    <div className="space-y-2">
                      <Label htmlFor="currency-duration">Currency</Label>
                      <Input
                        id="currency-duration"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                        placeholder="USD"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
