"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { WidgetType } from "@/db/enums";
import { BookingOptionList } from "@/features/studio/widgets/booking-option-list";
import { EventOptionList } from "@/features/studio/widgets/event-option-list";
import { InstructorOptionList } from "@/features/studio/widgets/instructor-option-list";
import { MembershipOptionList } from "@/features/studio/widgets/membership-option-list";
import { OnDemandOptionList } from "@/features/studio/widgets/on-demand-option-list";
import { ReferralProgramSelect } from "@/features/studio/widgets/referral-program-select";
import { useTRPC } from "@/trpc/client";

type CreatableWidgetType =
  | typeof WidgetType.SCHEDULE
  | typeof WidgetType.BOOKING
  | typeof WidgetType.INSTRUCTORS
  | typeof WidgetType.MEMBERSHIP
  | typeof WidgetType.INTRO_OFFER
  | typeof WidgetType.EVENT
  | typeof WidgetType.ON_DEMAND
  | typeof WidgetType.REFERRAL;

export function CreateWidgetDialog() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CreatableWidgetType>(WidgetType.SCHEDULE);
  const [instructorIds, setInstructorIds] = useState<string[]>([]);
  const [eventTypeIds, setEventTypeIds] = useState<string[]>([]);
  const [pricingOptionIds, setPricingOptionIds] = useState<string[]>([]);
  const [introOfferIds, setIntroOfferIds] = useState<string[]>([]);
  const [eventServiceTypeIds, setEventServiceTypeIds] = useState<string[]>([]);
  const [onDemandAssetIds, setOnDemandAssetIds] = useState<string[]>([]);
  const [referralProgramId, setReferralProgramId] = useState("");
  const instructors = useQuery(
    trpc.widgets.searchInstructorOptions.queryOptions({
      search: "",
      includeIds: instructorIds,
    }),
  );
  const memberships = useQuery(
    trpc.widgets.searchMembershipOptions.queryOptions({
      search: "",
      includeIds: pricingOptionIds,
    }),
  );
  const bookings = useQuery(
    trpc.widgets.searchBookingOptions.queryOptions({
      search: "",
      includeIds: eventTypeIds,
    }),
  );
  const introOffers = useQuery(
    trpc.widgets.searchIntroOfferOptions.queryOptions({
      search: "",
      includeIds: introOfferIds,
    }),
  );
  const events = useQuery(
    trpc.widgets.searchEventOptions.queryOptions({
      search: "",
      includeIds: eventServiceTypeIds,
    }),
  );
  const onDemandAssets = useQuery(
    trpc.widgets.searchOnDemandOptions.queryOptions({
      search: "",
      includeIds: onDemandAssetIds,
    }),
  );
  const referralPrograms = useQuery(
    trpc.widgets.searchReferralProgramOptions.queryOptions({
      search: "",
      includeIds: referralProgramId ? [referralProgramId] : [],
    }),
  );
  const create = useMutation(trpc.widgets.create.mutationOptions());

  async function handleCreate() {
    if (!name.trim()) return;
    if (type === WidgetType.INSTRUCTORS && instructorIds.length === 0) {
      toast.error("Select at least one instructor");
      return;
    }
    if (type === WidgetType.BOOKING && eventTypeIds.length === 0) {
      toast.error("Select at least one eligible appointment type");
      return;
    }
    if (type === WidgetType.MEMBERSHIP && pricingOptionIds.length === 0) {
      toast.error("Select at least one membership option");
      return;
    }
    if (type === WidgetType.INTRO_OFFER && introOfferIds.length === 0) {
      toast.error("Select at least one current published intro offer");
      return;
    }
    if (type === WidgetType.EVENT && eventServiceTypeIds.length === 0) {
      toast.error("Select at least one public event with an upcoming date");
      return;
    }
    if (type === WidgetType.ON_DEMAND && onDemandAssetIds.length === 0) {
      toast.error("Select at least one published public free video");
      return;
    }
    if (type === WidgetType.REFERRAL && !referralProgramId) {
      toast.error("Select an active referral program");
      return;
    }
    try {
      await create.mutateAsync(
        type === WidgetType.SCHEDULE
          ? { name: name.trim(), type }
          : type === WidgetType.BOOKING
            ? { name: name.trim(), type, config: { eventTypeIds } }
          : type === WidgetType.INSTRUCTORS
            ? { name: name.trim(), type, config: { instructorIds } }
            : type === WidgetType.MEMBERSHIP
              ? { name: name.trim(), type, config: { pricingOptionIds } }
              : type === WidgetType.INTRO_OFFER
                ? { name: name.trim(), type, config: { pricingOptionIds: introOfferIds } }
                : type === WidgetType.EVENT
                  ? { name: name.trim(), type, config: { serviceTypeIds: eventServiceTypeIds } }
                  : type === WidgetType.ON_DEMAND
                    ? { name: name.trim(), type, config: { assetIds: onDemandAssetIds } }
                    : { name: name.trim(), type, config: { programId: referralProgramId } },
      );
      await queryClient.invalidateQueries(trpc.widgets.list.queryOptions());
      setOpen(false);
      setName("");
      setType(WidgetType.SCHEDULE);
      setInstructorIds([]);
      setEventTypeIds([]);
      setPricingOptionIds([]);
      setIntroOfferIds([]);
      setEventServiceTypeIds([]);
      setOnDemandAssetIds([]);
      setReferralProgramId("");
      toast.success("Widget created");
    } catch {
      toast.error("Failed to create widget");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" />
          New widget
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create widget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="widget-name">Widget name</Label>
            <Input
              id="widget-name"
              className="shadow-none"
              placeholder="e.g. Homepage schedule"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="widget-type">Widget type</Label>
            <Select
              value={type}
              onValueChange={(value: CreatableWidgetType) => setType(value)}
            >
              <SelectTrigger id="widget-type" className="shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={WidgetType.SCHEDULE}>Class schedule</SelectItem>
                <SelectItem value={WidgetType.BOOKING}>Appointment booking</SelectItem>
                <SelectItem value={WidgetType.INSTRUCTORS}>Instructor gallery</SelectItem>
                <SelectItem value={WidgetType.MEMBERSHIP}>Membership plans</SelectItem>
                <SelectItem value={WidgetType.INTRO_OFFER}>Intro offers</SelectItem>
                <SelectItem value={WidgetType.EVENT}>Upcoming events</SelectItem>
                <SelectItem value={WidgetType.ON_DEMAND}>On-demand videos</SelectItem>
                <SelectItem value={WidgetType.REFERRAL}>Referral program</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === WidgetType.INSTRUCTORS ? (
            <div className="space-y-2">
              <Label>Instructors</Label>
              <InstructorOptionList
                options={instructors.data ?? []}
                selectedIds={instructorIds}
                loading={instructors.isLoading}
                onToggle={(id, selected) =>
                  setInstructorIds((current) =>
                    selected
                      ? [...current, id]
                      : current.filter((instructorId) => instructorId !== id),
                  )
                }
              />
            </div>
          ) : null}
          {type === WidgetType.BOOKING ? (
            <div className="space-y-2">
              <Label>Appointment types</Label>
              <BookingOptionList
                options={bookings.data ?? []}
                selectedIds={eventTypeIds}
                loading={bookings.isLoading}
                onToggle={(id, selected) =>
                  setEventTypeIds((current) =>
                    selected
                      ? [...current, id]
                      : current.filter((eventTypeId) => eventTypeId !== id),
                  )
                }
              />
            </div>
          ) : null}
          {type === WidgetType.MEMBERSHIP ? (
            <div className="space-y-2">
              <Label>Membership options</Label>
              <MembershipOptionList
                options={memberships.data ?? []}
                selectedIds={pricingOptionIds}
                loading={memberships.isLoading}
                onToggle={(id, selected) =>
                  setPricingOptionIds((current) =>
                    selected
                      ? [...current, id]
                      : current.filter((optionId) => optionId !== id),
                  )
                }
              />
            </div>
          ) : null}
          {type === WidgetType.INTRO_OFFER ? (
            <div className="space-y-2">
              <Label>Published intro offers</Label>
              <MembershipOptionList
                options={introOffers.data ?? []}
                selectedIds={introOfferIds}
                loading={introOffers.isLoading}
                emptyMessage="No current published intro offers found. Publish an intro pricing option first."
                onToggle={(id, selected) =>
                  setIntroOfferIds((current) =>
                    selected
                      ? [...current, id]
                      : current.filter((optionId) => optionId !== id),
                  )
                }
              />
            </div>
          ) : null}
          {type === WidgetType.EVENT ? (
            <div className="space-y-2">
              <Label>Upcoming events</Label>
              <EventOptionList
                options={events.data ?? []}
                selectedIds={eventServiceTypeIds}
                loading={events.isLoading}
                onToggle={(id, selected) =>
                  setEventServiceTypeIds((current) =>
                    selected
                      ? [...current, id]
                      : current.filter((serviceTypeId) => serviceTypeId !== id),
                  )
                }
              />
            </div>
          ) : null}
          {type === WidgetType.ON_DEMAND ? (
            <div className="space-y-2">
              <Label>Public free videos</Label>
              <OnDemandOptionList
                options={onDemandAssets.data ?? []}
                selectedIds={onDemandAssetIds}
                loading={onDemandAssets.isLoading}
                onToggle={(id, selected) =>
                  setOnDemandAssetIds((current) =>
                    selected
                      ? [...current, id]
                      : current.filter((assetId) => assetId !== id),
                  )
                }
              />
            </div>
          ) : null}
          {type === WidgetType.REFERRAL ? (
            <div className="space-y-2">
              <Label htmlFor="new-widget-referral-program">Referral program</Label>
              <ReferralProgramSelect
                id="new-widget-referral-program"
                value={referralProgramId}
                options={referralPrograms.data ?? []}
                loading={referralPrograms.isLoading}
                onChange={setReferralProgramId}
              />
              {!referralPrograms.isLoading && referralPrograms.data?.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No active referral program is available in this workspace.
                </p>
              ) : null}
            </div>
          ) : null}
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={
              create.isPending ||
              !name.trim() ||
              (type === WidgetType.INSTRUCTORS && instructorIds.length === 0) ||
              (type === WidgetType.BOOKING && eventTypeIds.length === 0) ||
              (type === WidgetType.MEMBERSHIP && pricingOptionIds.length === 0) ||
              (type === WidgetType.INTRO_OFFER && introOfferIds.length === 0) ||
              (type === WidgetType.EVENT && eventServiceTypeIds.length === 0) ||
              (type === WidgetType.ON_DEMAND && onDemandAssetIds.length === 0) ||
              (type === WidgetType.REFERRAL && !referralProgramId)
            }
          >
            {create.isPending ? "Creating..." : "Create widget"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
