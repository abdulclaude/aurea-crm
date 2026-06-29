"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

type PricingOptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PRICING_TYPES = [
  { value: "CLASS_PACK", label: "Class pack" },
  { value: "MEMBERSHIP", label: "Membership" },
  { value: "BUNDLE", label: "Bundle" },
  { value: "DROP_IN", label: "Drop-in" },
  { value: "INTRO_OFFER", label: "Intro offer" },
  { value: "ACCOUNT_CREDIT", label: "Account credit" },
] as const;

const BILLING_INTERVALS = [
  { value: "ONE_TIME", label: "One time" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY", label: "Annually" },
] as const;

const ACCESS_TARGETS = [
  { value: "ALL_SERVICES", label: "All services" },
  { value: "SERVICE_TYPE", label: "Service type" },
  { value: "SERVICE_CATEGORY", label: "Service category" },
  { value: "CLASS_TYPE", label: "Class type" },
] as const;

type PricingType = (typeof PRICING_TYPES)[number]["value"];
type BillingInterval = (typeof BILLING_INTERVALS)[number]["value"];
type AccessTarget = (typeof ACCESS_TARGETS)[number]["value"];

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  return Number(value);
}

export function PricingOptionDialog({
  open,
  onOpenChange,
}: PricingOptionDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: services = [] } = useQuery(
    trpc.serviceCatalog.list.queryOptions({ includeInactive: false }),
  );
  const { data: categories = [] } = useQuery(
    trpc.serviceCatalog.categories.queryOptions(),
  );
  const { data: classTypes = [] } = useQuery(
    trpc.classTypes.list.queryOptions({ includeInactive: false }),
  );

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<PricingType>("MEMBERSHIP");
  const [billingInterval, setBillingInterval] =
    React.useState<BillingInterval>("ONE_TIME");
  const [price, setPrice] = React.useState("");
  const [classCredits, setClassCredits] = React.useState("");
  const [durationDays, setDurationDays] = React.useState("");
  const [revenueCategory, setRevenueCategory] = React.useState("");
  const [accessTarget, setAccessTarget] =
    React.useState<AccessTarget>("ALL_SERVICES");
  const [targetId, setTargetId] = React.useState("none");
  const [accessSummary, setAccessSummary] = React.useState("");
  const [termsText, setTermsText] = React.useState("");
  const [confirmationEmail, setConfirmationEmail] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(true);
  const [showInPos, setShowInPos] = React.useState(true);
  const [directPurchaseEnabled, setDirectPurchaseEnabled] = React.useState(true);

  const createOption = useMutation(
    trpc.pricingOptions.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.pricingOptions.list.queryOptions({ includeInactive: true }),
        );
        toast.success("Pricing option created");
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const targetOptions = React.useMemo(() => {
    if (accessTarget === "SERVICE_TYPE") {
      return services.map((service) => ({ id: service.id, name: service.name }));
    }
    if (accessTarget === "SERVICE_CATEGORY") {
      return categories.map((category) => ({ id: category.id, name: category.name }));
    }
    if (accessTarget === "CLASS_TYPE") {
      return classTypes.map((item) => ({ id: item.id, name: item.name }));
    }
    return [];
  }, [accessTarget, categories, classTypes, services]);

  function handleCreate(): void {
    const grant =
      accessTarget === "ALL_SERVICES"
        ? { targetType: "ALL_SERVICES" as const }
        : {
            targetType: accessTarget,
            serviceTypeId: accessTarget === "SERVICE_TYPE" ? targetId : null,
            serviceCategoryId: accessTarget === "SERVICE_CATEGORY" ? targetId : null,
            classTypeId: accessTarget === "CLASS_TYPE" ? targetId : null,
          };

    createOption.mutate({
      name,
      description: description || null,
      type,
      price: optionalNumber(price) ?? 0,
      currency: "GBP",
      billingInterval,
      classCredits: optionalNumber(classCredits),
      durationDays: optionalNumber(durationDays),
      revenueCategory: revenueCategory || null,
      isIntroOffer: type === "INTRO_OFFER",
      isBundle: type === "BUNDLE",
      isPublic,
      isHidden: !isPublic,
      showInPos,
      directPurchaseEnabled,
      termsText: termsText || null,
      confirmationEmailBody: confirmationEmail || null,
      commissionMode: "NONE",
      accessSummary: accessSummary || null,
      accessGrants: [grant],
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create pricing option</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={type} onValueChange={(value) => setType(value as PricingType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRICING_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description" className="md:col-span-2">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </Field>
          <Field label="Price">
            <Input value={price} onChange={(event) => setPrice(event.target.value)} />
          </Field>
          <Field label="Billing">
            <Select
              value={billingInterval}
              onValueChange={(value) => setBillingInterval(value as BillingInterval)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_INTERVALS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Class credits">
            <Input value={classCredits} onChange={(event) => setClassCredits(event.target.value)} />
          </Field>
          <Field label="Expires after days">
            <Input value={durationDays} onChange={(event) => setDurationDays(event.target.value)} />
          </Field>
          <Field label="Revenue category">
            <Input value={revenueCategory} onChange={(event) => setRevenueCategory(event.target.value)} />
          </Field>
          <Field label="Access target">
            <Select
              value={accessTarget}
              onValueChange={(value) => {
                setAccessTarget(value as AccessTarget);
                setTargetId("none");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_TARGETS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {accessTarget !== "ALL_SERVICES" && (
            <Field label="Access item">
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select item</SelectItem>
                  {targetOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Access summary" className="md:col-span-2">
            <Input
              value={accessSummary}
              onChange={(event) => setAccessSummary(event.target.value)}
              placeholder="e.g., Unlimited reformer classes and video library access"
            />
          </Field>
          <Field label="Agreement terms" className="md:col-span-2">
            <Textarea value={termsText} onChange={(event) => setTermsText(event.target.value)} rows={3} />
          </Field>
          <Field label="Confirmation email" className="md:col-span-2">
            <Textarea
              value={confirmationEmail}
              onChange={(event) => setConfirmationEmail(event.target.value)}
              rows={3}
            />
          </Field>
          <Toggle label="Public buy page" checked={isPublic} onCheckedChange={setIsPublic} />
          <Toggle label="Show in POS" checked={showInPos} onCheckedChange={setShowInPos} />
          <Toggle
            label="Direct purchase"
            checked={directPurchaseEnabled}
            onCheckedChange={setDirectPurchaseEnabled}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              !name.trim() ||
              !price.trim() ||
              (accessTarget !== "ALL_SERVICES" && targetId === "none") ||
              createOption.isPending
            }
          >
            {createOption.isPending ? "Creating..." : "Create pricing option"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-black/10 p-3 dark:border-white/5">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
