"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { OrgLogoUploader } from "@/components/uploader/orgLogo";
import { useState } from "react";
import { uploadFiles } from "@/utils/uploadthing";

const formSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  logo: z.string().optional(),
  // Accept free-form in the form; coerce to undefined on submit
  website: z.string().optional(),
  billingEmail: z.string().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AgencyOnboardingPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [pendingLogoFiles, setPendingLogoFiles] = useState<File[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      logo: undefined,
      website: undefined,
      billingEmail: undefined,
      phone: undefined,
      addressLine1: undefined,
      addressLine2: undefined,
      city: undefined,
      state: undefined,
      postalCode: undefined,
      country: undefined,
      timezone: undefined,
    },
  });

  const createAgency = useMutation(
    trpc.organizations.createAgency.mutationOptions({
      onSuccess: async ({ organizationId }) => {
        await authClient.organization.setActive({ organizationId });
        router.replace("/clients");
      },
    })
  );

  const onSubmit = async (values: FormValues) => {
    const clean = {
      companyName: values.companyName.trim(),
      logo:
        values.logo && values.logo.trim().length
          ? values.logo.trim()
          : undefined,
      website:
        values.website && values.website.trim().length
          ? values.website.trim()
          : undefined,
      billingEmail:
        values.billingEmail && values.billingEmail.trim().length
          ? values.billingEmail.trim()
          : undefined,
      phone:
        values.phone && values.phone.trim().length
          ? values.phone.trim()
          : undefined,
      addressLine1:
        values.addressLine1 && values.addressLine1.trim().length
          ? values.addressLine1.trim()
          : undefined,
      addressLine2:
        values.addressLine2 && values.addressLine2.trim().length
          ? values.addressLine2.trim()
          : undefined,
      city:
        values.city && values.city.trim().length
          ? values.city.trim()
          : undefined,
      state:
        values.state && values.state.trim().length
          ? values.state.trim()
          : undefined,
      postalCode:
        values.postalCode && values.postalCode.trim().length
          ? values.postalCode.trim()
          : undefined,
      country:
        values.country && values.country.trim().length
          ? values.country.trim()
          : undefined,
      timezone:
        values.timezone && values.timezone.trim().length
          ? values.timezone.trim()
          : undefined,
    };

    // If no logo URL yet but user selected a file, upload now (deferred upload)
    if (!clean.logo && pendingLogoFiles.length > 0) {
      const res = await uploadFiles("orgLogo", { files: pendingLogoFiles });
      const url = res?.[0]?.url as string | undefined;
      if (url) clean.logo = url;
    }

    await createAgency.mutateAsync(clean);
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Create your agency</CardTitle>
          <CardDescription>
            Set up your organization to start onboarding clients.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agency name</FormLabel>
                    <FormControl>
                      <Input placeholder="AureaCRM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="billingEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing email</FormLabel>
                      <FormControl>
                        <Input placeholder="billing@aurea.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://aurea.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 555 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <FormControl>
                        <Input placeholder="UTC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address line 1</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="San Francisco" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="CA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal code</FormLabel>
                      <FormControl>
                        <Input placeholder="94107" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="USA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="">
                <FormField
                  control={form.control}
                  name="logo"
                  render={() => (
                    <FormItem>
                      <FormLabel>Agency logo </FormLabel>
                      {/* Defer upload: only select file, upload on submit */}
                      <OrgLogoUploader
                        value={form.watch("logo")}
                        onChange={(url) =>
                          form.setValue("logo", url, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        defer
                        onFilesChange={setPendingLogoFiles}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createAgency.isPending}>
                  Create agency
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
