import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContentLibraryPayload } from "@/features/content-settings/contracts";

type Payload = Extract<ContentLibraryPayload, { kind: "PUBLIC_PROFILE" }>;

function nullable(value: string): string | null {
  return value.trim() || null;
}

export function ProfileEditor({ value, onChange }: { value: Payload; onChange: (value: Payload) => void }): React.JSX.Element {
  const address = value.address;
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Public profile details</legend>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="profile-display-name">Display name</Label>
        <Input id="profile-display-name" value={value.displayName} onChange={(event) => onChange({ ...value, displayName: event.target.value })} required />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="profile-summary">Summary</Label>
        <Textarea id="profile-summary" value={value.summary ?? ""} onChange={(event) => onChange({ ...value, summary: nullable(event.target.value) })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="profile-email">Public email</Label>
        <Input id="profile-email" type="email" value={value.email ?? ""} onChange={(event) => onChange({ ...value, email: nullable(event.target.value) })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="profile-phone">Public phone</Label>
        <Input id="profile-phone" value={value.phone ?? ""} onChange={(event) => onChange({ ...value, phone: nullable(event.target.value) })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="profile-website">Website</Label>
        <Input id="profile-website" type="url" value={value.websiteUrl ?? ""} onChange={(event) => onChange({ ...value, websiteUrl: nullable(event.target.value) })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="profile-booking">Booking link</Label>
        <Input id="profile-booking" type="url" value={value.bookingUrl ?? ""} onChange={(event) => onChange({ ...value, bookingUrl: nullable(event.target.value) })} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="profile-address">Address</Label>
        <Input id="profile-address" value={address.line1 ?? ""} onChange={(event) => onChange({ ...value, address: { ...address, line1: nullable(event.target.value) } })} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="profile-address-line-2">Address line 2</Label>
        <Input id="profile-address-line-2" value={address.line2 ?? ""} onChange={(event) => onChange({ ...value, address: { ...address, line2: nullable(event.target.value) } })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="profile-city">City</Label>
        <Input id="profile-city" value={address.city ?? ""} onChange={(event) => onChange({ ...value, address: { ...address, city: nullable(event.target.value) } })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="profile-region">Region</Label>
        <Input id="profile-region" value={address.region ?? ""} onChange={(event) => onChange({ ...value, address: { ...address, region: nullable(event.target.value) } })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="profile-postal-code">Postal code</Label>
        <Input id="profile-postal-code" value={address.postalCode ?? ""} onChange={(event) => onChange({ ...value, address: { ...address, postalCode: nullable(event.target.value) } })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="profile-country">Country code</Label>
        <Input id="profile-country" maxLength={2} value={address.countryCode ?? ""} onChange={(event) => onChange({ ...value, address: { ...address, countryCode: nullable(event.target.value.toUpperCase()) } })} />
      </div>
      <div className="space-y-2 border-t pt-3 sm:col-span-2">
        <div className="flex items-center justify-between"><Label>Social links</Label><Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...value, socialLinks: [...value.socialLinks, { platform: "", url: "" }] })}><Plus className="size-4" /> Add link</Button></div>
        {value.socialLinks.map((link, index) => <div key={`${index}-${link.platform}`} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]"><Input aria-label={`Social platform ${index + 1}`} placeholder="Platform" value={link.platform} onChange={(event) => onChange({ ...value, socialLinks: value.socialLinks.map((candidate, linkIndex) => linkIndex === index ? { ...candidate, platform: event.target.value } : candidate) })} required /><Input aria-label={`Social URL ${index + 1}`} type="url" placeholder="https://" value={link.url} onChange={(event) => onChange({ ...value, socialLinks: value.socialLinks.map((candidate, linkIndex) => linkIndex === index ? { ...candidate, url: event.target.value } : candidate) })} required /><Button type="button" size="icon" variant="ghost" aria-label={`Remove social link ${index + 1}`} onClick={() => onChange({ ...value, socialLinks: value.socialLinks.filter((_, linkIndex) => linkIndex !== index) })}><Trash2 className="size-4" /></Button></div>)}
      </div>
    </fieldset>
  );
}
