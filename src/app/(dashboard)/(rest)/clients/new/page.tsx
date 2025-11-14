"use client";

import React from "react";
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
import { OrgLogoUploader } from "@/components/uploader/orgLogo";
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
  industry: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewClientPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [pendingLogoFiles, setPendingLogoFiles] = React.useState<File[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      logo: "",
      website: "",
      billingEmail: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      timezone: "",
      industry: "",
    },
  });

  const createClient = useMutation(
    trpc.organizations.createSubaccount.mutationOptions({
      onSuccess: async () => {
        router.replace("/clients");
      },
    })
  );

  const onSubmit = async (values: FormValues) => {
    const clean = {
      companyName: values.companyName.trim(),
      logo: values.logo?.trim() ? values.logo.trim() : undefined,
      website: values.website?.trim() ? values.website.trim() : undefined,
      billingEmail: values.billingEmail?.trim()
        ? values.billingEmail.trim()
        : undefined,
      phone: values.phone?.trim() ? values.phone.trim() : undefined,
      addressLine1: values.addressLine1?.trim()
        ? values.addressLine1.trim()
        : undefined,
      addressLine2: values.addressLine2?.trim()
        ? values.addressLine2.trim()
        : undefined,
      city: values.city?.trim() ? values.city.trim() : undefined,
      state: values.state?.trim() ? values.state.trim() : undefined,
      postalCode: values.postalCode?.trim()
        ? values.postalCode.trim()
        : undefined,
      country: values.country?.trim() ? values.country.trim() : undefined,
      timezone: values.timezone?.trim() ? values.timezone.trim() : undefined,
      industry: values.industry?.trim() ? values.industry.trim() : undefined,
      // organizationId left undefined -> server uses active org (ctx.orgId)
    };

    // If logo not set but a file is selected, upload now
    if (!clean.logo && pendingLogoFiles.length > 0) {
      const res = await uploadFiles("orgLogo", { files: pendingLogoFiles });
      const url = (res?.[0]?.url as string) || undefined;
      if (url) clean.logo = url;
    }

    await createClient.mutateAsync(clean);
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card className="shadow-none">
        <CardHeader className="gap-y-0.5">
          <CardTitle className="text-sm">Create client</CardTitle>
          <CardDescription className="text-xs">
            Add a new client (subaccount) to your agency.
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
                    <FormLabel className="text-xs text-muted-foreground">
                      Client name
                    </FormLabel>
                    <FormControl>
                      <Input className="" placeholder="Acme Inc." {...field} />
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
                      <FormLabel className="text-xs text-muted-foreground">
                        Billing email
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="billing@client.com" {...field} />
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
                      <FormLabel className="text-xs text-muted-foreground">
                        Website
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://client.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-2">
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Logo
                      </FormLabel>
                      <OrgLogoUploader
                        value={field.value}
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

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Phone
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+44 7123 456789" {...field} />
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
                      <FormLabel className="text-xs text-muted-foreground">
                        Timezone
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="GMT" {...field} />
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
                      <FormLabel className="text-xs text-muted-foreground">
                        Address line 1
                      </FormLabel>
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
                      <FormLabel className="text-xs text-muted-foreground">
                        Address line 2
                      </FormLabel>
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
                      <FormLabel className="text-xs text-muted-foreground">
                        City
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="London" {...field} />
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
                      <FormLabel className="text-xs text-muted-foreground">
                        State
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Barking and Dagenham" {...field} />
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
                      <FormLabel className="text-xs text-muted-foreground">
                        Postal code
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="RM8 1LA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Country
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="United Kingdom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Industry
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Healthcare / Retail / SaaS ..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createClient.isPending}>
                  Create client
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
