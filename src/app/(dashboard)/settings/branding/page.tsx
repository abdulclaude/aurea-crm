"use client";

import { useState, useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function BrandingSettingsPage() {
  const trpc = useTRPC();

  const {
    data: workspace,
    isLoading,
    refetch,
  } = useQuery(trpc.organizations.getWorkspaceDetails.queryOptions());

  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [taxId, setTaxId] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  const isOrganization = workspace?.type === "organization";
  const isSubaccount = workspace?.type === "subaccount";

  // Update local state when workspace data is loaded
  useEffect(() => {
    if (workspace) {
      if (workspace.type === "organization") {
        const org = workspace.data;
        setBusinessEmail(org?.businessEmail || "");
        setBusinessPhone(org?.businessPhone || "");
        setWebsite(org?.website || "");
        setTaxId(org?.taxId || "");
        setBrandColor(org?.brandColor || "");
        setAccentColor(org?.accentColor || "");

        const address = org?.businessAddress as
          | {
              street?: string;
              city?: string;
              state?: string;
              zip?: string;
              country?: string;
            }
          | undefined;

        setStreet(address?.street || "");
        setCity(address?.city || "");
        setState(address?.state || "");
        setZip(address?.zip || "");
        setCountry(address?.country || "");
      } else if (workspace.type === "subaccount") {
        const sub = workspace.data;
        setBusinessEmail(sub?.businessEmail || "");
        setBusinessPhone(sub?.businessPhone || "");
        setWebsite(sub?.website || "");
        setTaxId(sub?.taxId || "");
        setBrandColor(sub?.brandColor || "");
        setAccentColor(sub?.accentColor || "");

        // Use existing address fields
        setStreet(sub?.addressLine1 || "");
        setCity(sub?.city || "");
        setState(sub?.state || "");
        setZip(sub?.postalCode || "");
        setCountry(sub?.country || "");
      }
    }
  }, [workspace]);

  const updateOrganization = useMutation(
    trpc.organizations.updateOrganization.mutationOptions()
  );

  const updateSubaccount = useMutation(
    trpc.organizations.updateSubaccount.mutationOptions()
  );

  const handleSave = async () => {
    try {
      if (workspace?.type === "organization") {
        await updateOrganization.mutateAsync({
          organizationId: workspace.data?.id || "",
          businessEmail: businessEmail || null,
          businessPhone: businessPhone || null,
          website: website || null,
          taxId: taxId || null,
          brandColor: brandColor || null,
          accentColor: accentColor || null,
          businessAddress: {
            street,
            city,
            state,
            zip,
            country,
          },
        });
        toast.success("Branding settings updated successfully");
        refetch();
      } else if (workspace?.type === "subaccount") {
        await updateSubaccount.mutateAsync({
          subaccountId: workspace.data?.id || "",
          businessEmail: businessEmail || null,
          businessPhone: businessPhone || null,
          website: website || null,
          taxId: taxId || null,
          brandColor: brandColor || null,
          accentColor: accentColor || null,
          addressLine1: street || null,
          city: city || null,
          state: state || null,
          postalCode: zip || null,
          country: country || null,
        });
        toast.success("Branding settings updated successfully");
        refetch();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update branding settings"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <p className="text-muted-foreground">No workspace selected</p>
      </div>
    );
  }

  const isPending = updateOrganization.isPending || updateSubaccount.isPending;
  const workspaceName =
    workspace.type === "organization"
      ? workspace.data?.name
      : workspace.data?.companyName;

  return (
    <div className="">
      <div className="p-6">
        <div className="flex flex-col justify-center gap-2">
          <Badge
            variant={isOrganization ? "gradient" : "secondary"}
            className="w-max rounded-full p-1 px-2.5"
          >
            {isOrganization ? "Agency" : "Client"}
          </Badge>

          <h1 className="text-lg font-bold">Branding Settings</h1>
        </div>

        <p className="text-muted-foreground text-xs">
          {isOrganization
            ? "Customize your organization's branding for invoices and emails"
            : "Customize your client workspace branding for invoices sent to your customers"}
        </p>
      </div>

      <Separator className="bg-black/10 dark:bg-white/5" />

      <div className="">
        {/* Brand Colors */}
        <div className="p-6">
          <h2 className="text-sm font-medium mb-4">Brand Colors</h2>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="brandColor" className="text-xs font-medium">
                Primary Brand Color
              </Label>
              <div className="flex gap-2">
                <Input
                  id="brandColor"
                  type="color"
                  value={brandColor || "#000000"}
                  onChange={(e) => setBrandColor(e.target.value)}
                  disabled={isPending}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={brandColor || ""}
                  onChange={(e) => setBrandColor(e.target.value)}
                  disabled={isPending}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor" className="text-xs font-medium">
                Accent Color
              </Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={accentColor || "#000000"}
                  onChange={(e) => setAccentColor(e.target.value)}
                  disabled={isPending}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={accentColor || ""}
                  onChange={(e) => setAccentColor(e.target.value)}
                  disabled={isPending}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        {/* Business Contact Information */}
        <div className="p-6">
          <h2 className="text-sm font-medium mb-4">
            Business Contact Information
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            This information appears on invoices you send to{" "}
            {isOrganization ? "clients" : "your customers"}
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="businessEmail" className="text-xs font-medium">
                Business Email
              </Label>
              <Input
                id="businessEmail"
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                disabled={isPending}
                placeholder="billing@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessPhone" className="text-xs font-medium">
                Business Phone
              </Label>
              <Input
                id="businessPhone"
                type="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                disabled={isPending}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="website" className="text-xs font-medium">
                Website
              </Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={isPending}
                placeholder="https://www.company.com"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="taxId" className="text-xs font-medium">
                Tax ID / VAT Number
              </Label>
              <Input
                id="taxId"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                disabled={isPending}
                placeholder="12-3456789 or VAT123456"
              />
            </div>
          </div>
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        {/* Business Address */}
        <div className="p-6">
          <h2 className="text-sm font-medium mb-4">Business Address</h2>
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="street" className="text-xs font-medium">
                Street Address
              </Label>
              <Input
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                disabled={isPending}
                placeholder="123 Main Street"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city" className="text-xs font-medium">
                City
              </Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={isPending}
                placeholder="San Francisco"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="text-xs font-medium">
                State / Province
              </Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={isPending}
                placeholder="CA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip" className="text-xs font-medium">
                ZIP / Postal Code
              </Label>
              <Input
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                disabled={isPending}
                placeholder="94102"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-xs font-medium">
                Country
              </Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={isPending}
                placeholder="United States"
              />
            </div>
          </div>
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        {/* Preview */}
        <div className="p-6">
          <h2 className="text-sm font-medium mb-4">Invoice Preview</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Your branding will appear on invoices like this:
          </p>
          <div className="border rounded-lg p-6 max-w-2xl space-y-4 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                {workspaceName && (
                  <h3
                    className="text-lg font-bold"
                    style={{
                      color: brandColor || undefined,
                    }}
                  >
                    {workspaceName}
                  </h3>
                )}
                {businessEmail && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {businessEmail}
                  </p>
                )}
                {businessPhone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {businessPhone}
                  </p>
                )}
                {website && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {website}
                  </p>
                )}
              </div>
              {(street || city || state || zip || country) && (
                <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                  {street && <p>{street}</p>}
                  {(city || state || zip) && (
                    <p>
                      {city}
                      {city && state ? ", " : ""}
                      {state} {zip}
                    </p>
                  )}
                  {country && <p>{country}</p>}
                </div>
              )}
            </div>

            <div
              className="h-px"
              style={{
                backgroundColor: accentColor || "#e5e7eb",
              }}
            />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Sample Service
                </span>
                <span className="font-medium">$100.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tax</span>
                <span className="font-medium">$10.00</span>
              </div>
              <div
                className="h-px"
                style={{
                  backgroundColor: accentColor || "#e5e7eb",
                }}
              />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span
                  style={{
                    color: brandColor || undefined,
                  }}
                >
                  $110.00
                </span>
              </div>
            </div>
          </div>

          {isSubaccount && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> As a client workspace, your invoices
                will use these settings. If a field is not set here, it will
                fall back to your agency's organization-level branding.
              </p>
            </div>
          )}
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        {/* Save Button */}
        <div className="flex justify-end p-6">
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="min-w-[120px] w-max"
            variant="gradient"
          >
            {isPending ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
