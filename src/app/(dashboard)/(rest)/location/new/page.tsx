"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { City, Country, State } from "country-state-city";
import { allTimezones, useTimezoneSelect } from "react-timezone-select";
import { Button } from "@/components/ui/button";
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
import {
  LocationPhoneInput,
  SearchCombobox,
} from "@/features/organizations/components/location-form-controls";
import { useTRPC } from "@/trpc/client";

const formSchema = z.object({
  companyName: z.string().min(2, "Location name is required"),
  billingEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
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
  const [selectedCountryCode, setSelectedCountryCode] = useState("");

  const { options: timezoneOptions } = useTimezoneSelect({
    labelStyle: "original",
    timezones: allTimezones,
  });
  const countryOptions = Country.getAllCountries().map((country) => ({
    value: country.isoCode,
    label: country.name,
  }));
  const stateOptions = selectedCountryCode
    ? State.getStatesOfCountry(selectedCountryCode).map((state) => ({
        value: state.name,
        label: state.name,
        isoCode: state.isoCode,
      }))
    : [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      billingEmail: "",
      phone: "",
      website: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      industry: "",
    },
  });

  const selectedState = form.watch("state");
  const selectedStateCode = stateOptions.find(
    (state) => state.value === selectedState,
  )?.isoCode;
  const cityOptions = selectedCountryCode
    ? (selectedStateCode
        ? City.getCitiesOfState(selectedCountryCode, selectedStateCode)
        : (City.getCitiesOfCountry(selectedCountryCode) ?? [])
      ).map((city) => ({ value: city.name, label: city.name }))
    : [];

  const createLocation = useMutation(
    trpc.organizations.createLocation.mutationOptions(),
  );

  const setActiveLocation = useMutation(
    trpc.organizations.setActiveLocation.mutationOptions(),
  );

  const onSubmit = async (values: FormValues) => {
    try {
      const sub = await createLocation.mutateAsync({
        companyName: values.companyName.trim(),
        billingEmail: values.billingEmail?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        website: values.website?.trim() || undefined,
        addressLine1: values.addressLine1?.trim() || undefined,
        addressLine2: values.addressLine2?.trim() || undefined,
        city: values.city?.trim() || undefined,
        state: values.state?.trim() || undefined,
        postalCode: values.postalCode?.trim() || undefined,
        country: values.country?.trim() || undefined,
        timezone: values.timezone?.trim() || undefined,
        industry: values.industry?.trim() || undefined,
      });

      if (!sub) {
        throw new Error("Location was not created");
      }

      await setActiveLocation.mutateAsync({ locationId: sub.id });
      toast.success("Location created successfully");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create location",
      );
    }
  };

  const isPending = createLocation.isPending || setActiveLocation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary">
            Add new location
          </h1>
          <p className="text-xs text-primary/75">
            Create a new location for your studio.
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-white/5">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75">
                      Location name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Downtown Studio"
                        className="border-black/10 dark:border-white/5 text-primary text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="billingEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Billing email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="billing@studio.com"
                          className="border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Phone number
                      </FormLabel>
                      <FormControl>
                        <LocationPhoneInput
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75">
                      Website
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://studio.com"
                        className="border-black/10 dark:border-white/5 text-primary text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <Separator className="bg-black/5 dark:bg-white/5" />

              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75">
                      Address line 1
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main Street"
                        className="border-black/10 dark:border-white/5 text-primary text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75">
                      Address line 2
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Suite 100"
                        className="border-black/10 dark:border-white/5 text-primary text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        City
                      </FormLabel>
                      <FormControl>
                        {cityOptions.length > 0 ? (
                          <SearchCombobox
                            value={field.value}
                            onChange={field.onChange}
                            options={cityOptions}
                            placeholder="Select city..."
                            searchPlaceholder="Search cities..."
                            emptyText="No city found."
                          />
                        ) : (
                          <Input
                            placeholder="London"
                            className="border-black/10 dark:border-white/5 text-primary text-xs"
                            {...field}
                          />
                        )}
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        State / Region
                      </FormLabel>
                      <FormControl>
                        {stateOptions.length > 0 ? (
                          <SearchCombobox
                            value={field.value}
                            onChange={(state) => {
                              field.onChange(state);
                              form.setValue("city", "");
                            }}
                            options={stateOptions}
                            placeholder="Select state..."
                            searchPlaceholder="Search states..."
                            emptyText="No state found."
                          />
                        ) : (
                          <Input
                            placeholder="Greater London"
                            className="border-black/10 dark:border-white/5 text-primary text-xs"
                            {...field}
                          />
                        )}
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Postal code
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="SW1A 1AA"
                          className="border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Country
                      </FormLabel>
                      <FormControl>
                        <SearchCombobox
                          value={field.value}
                          onChange={(countryCode) => {
                            field.onChange(countryCode);
                            setSelectedCountryCode(countryCode);
                            form.setValue("state", "");
                            form.setValue("city", "");
                          }}
                          options={countryOptions}
                          placeholder="Select country..."
                          searchPlaceholder="Search countries..."
                          emptyText="No country found."
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="bg-black/5 dark:bg-white/5" />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Timezone
                      </FormLabel>
                      <FormControl>
                        <SearchCombobox
                          value={field.value}
                          onChange={field.onChange}
                          options={timezoneOptions.map((option) => ({
                            value: option.value,
                            label: option.label,
                          }))}
                          placeholder="Select timezone..."
                          searchPlaceholder="Search timezones..."
                          emptyText="No timezone found."
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Industry
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Fitness, Yoga, Pilates..."
                          className="border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6">
              <Button
                type="button"
                variant="destructive"
                onClick={() => router.back()}
                disabled={isPending}
                className="w-max"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gradient"
                disabled={isPending}
                className="w-max"
              >
                {isPending ? "Creating..." : "Add location"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
