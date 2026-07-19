"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import {
  EMAIL_FONT_OPTIONS,
  emailDesignSettingsSchema,
  type EmailDesignSettings as EmailDesignSettingsValue,
} from "@/features/communications/email-settings-contracts";
import { WorkspaceLogoUploader } from "@/features/organizations/components/workspace-logo-uploader";
import { useTRPC } from "@/trpc/client";

import { EmailDesignColors } from "./email-design-colors";
import { EmailSocialLinksSettings } from "./email-social-links-settings";

export function EmailDesignSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const design = useQuery(trpc.emailSettings.getDesign.queryOptions());
  const [draft, setDraft] = React.useState<EmailDesignSettingsValue | null>(
    null,
  );
  const value = draft ?? design.data?.settings ?? null;

  const save = useMutation(
    trpc.emailSettings.updateDesign.mutationOptions({
      onSuccess: async (result) => {
        setDraft(result.settings);
        await queryClient.invalidateQueries({
          queryKey: trpc.emailSettings.getDesign.queryKey(),
        });
        toast.success("Email design saved");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (design.isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Email design could not be loaded</AlertTitle>
          <AlertDescription>{design.error?.message}</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (design.isLoading || !design.data || !value) {
    return (
      <div role="status" className="flex items-center gap-2 p-6 text-xs">
        <Loader2 className="animate-spin" />
        Loading email design
      </div>
    );
  }

  const submit = () => {
    const parsed = emailDesignSettingsSchema.safeParse(value);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the design fields.");
      return;
    }
    save.mutate(parsed.data);
  };
  const colorValues =
    value.colorMode === "WORKSPACE"
      ? {
          ...value,
          buttonColor: design.data.effective.buttonColor,
          backgroundColor: design.data.effective.backgroundColor,
        }
      : value;

  return (
    <div className="w-full min-w-0">
      <DesignSection
        title="Brand logo"
        description="Choose the logo used by email templates."
      >
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <Label htmlFor="email-logo-mode">Logo source</Label>
            <Select
              value={value.logoMode}
              onValueChange={(logoMode) =>
                setDraft({
                  ...value,
                  logoMode: logoMode as EmailDesignSettingsValue["logoMode"],
                })
              }
            >
              <SelectTrigger id="email-logo-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WORKSPACE">Use workspace logo</SelectItem>
                <SelectItem value="CUSTOM">
                  Upload a custom logo for emails
                </SelectItem>
                <SelectItem value="NONE">Do not show a logo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {value.logoMode === "CUSTOM" ? (
            <WorkspaceLogoUploader
              value={value.customLogoUrl}
              onChange={(customLogoUrl) =>
                setDraft({ ...value, customLogoUrl: customLogoUrl ?? null })
              }
              label="Email logo"
              uploadRoute="emailLogo"
            />
          ) : value.logoMode === "WORKSPACE" &&
            design.data.workspace.logoUrl ? (
            <LogoPreview src={design.data.workspace.logoUrl} />
          ) : null}
        </div>
      </DesignSection>

      <DesignSection
        title="Brand colors"
        description="Choose colors used by email templates."
      >
        <div className="mb-4 w-full sm:w-72">
          <Label htmlFor="email-color-mode">Color source</Label>
          <Select
            value={value.colorMode}
            onValueChange={(colorMode) =>
              setDraft({
                ...value,
                colorMode: colorMode as EmailDesignSettingsValue["colorMode"],
              })
            }
          >
            <SelectTrigger id="email-color-mode" className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WORKSPACE">Use workspace colors</SelectItem>
              <SelectItem value="CUSTOM">Define custom email colors</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <EmailDesignColors
          value={colorValues}
          onChange={setDraft}
          disabled={value.colorMode === "WORKSPACE"}
        />
      </DesignSection>

      <DesignSection
        title="Typography"
        description="Choose fonts for headings and body text."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FontSelect
            id="email-primary-font"
            label="Primary font"
            description="Headings and titles"
            value={value.primaryFont}
            onChange={(primaryFont) => setDraft({ ...value, primaryFont })}
          />
          <FontSelect
            id="email-secondary-font"
            label="Secondary font"
            description="Body text"
            value={value.secondaryFont}
            onChange={(secondaryFont) => setDraft({ ...value, secondaryFont })}
          />
        </div>
      </DesignSection>

      <DesignSection
        title="Company details"
        description="Pulled from Workspace settings and included in email footers."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField
            label="Address"
            value={design.data.workspace.companyAddress ?? "Not configured"}
          />
          <ReadOnlyField
            label="Website"
            value={design.data.workspace.website ?? "Not configured"}
          />
        </div>
      </DesignSection>

      <DesignSection
        title="Social media links"
        description="Add links displayed in email footers."
      >
        <EmailSocialLinksSettings value={value} onChange={setDraft} />
      </DesignSection>

      <div className="flex justify-end p-6">
        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
          Save email design
        </Button>
      </div>
    </div>
  );
}

function DesignSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="p-6">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <div className="mt-4">{children}</div>
      </section>
      <Separator />
    </>
  );
}

function FontSelect({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: EmailDesignSettingsValue["primaryFont"];
  onChange: (value: EmailDesignSettingsValue["primaryFont"]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-[11px] text-muted-foreground">{description}</p>
      <Select value={value} onValueChange={(font) => onChange(font as typeof value)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EMAIL_FONT_OPTIONS.map((font) => (
            <SelectItem key={font} value={font}>
              {font}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} readOnly aria-readonly="true" />
    </div>
  );
}

function LogoPreview({ src }: { src: string }) {
  return (
    <div className="w-64 overflow-hidden rounded-sm border bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Workspace email logo" className="h-28 w-full object-contain p-3" />
    </div>
  );
}
