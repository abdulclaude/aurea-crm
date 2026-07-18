"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { uploadFiles } from "@/utils/uploadthing";
import {
  Building2,
  ChevronLeft,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { City, Country, State } from "country-state-city";
import { useTimezoneSelect, allTimezones } from "react-timezone-select";
import { OnboardingPreloader } from "@/components/onboarding-preloader";
import { toast } from "sonner";
import { MindbodyExportUploadStep } from "@/features/onboarding/components/mindbody-export-upload-step";
import {
  MINDBODY_IMPORT_PRELOADER_STEPS,
  MINDBODY_PRELOADER_PHASES,
  mindbodyPreloaderStepForJob,
} from "@/features/onboarding/lib/mindbody-import-progress";
import {
  uploadKey,
  uploadUrl,
} from "@/features/studio/import/lib/upload-responses";
import {
  LocationPhoneInput,
  SearchCombobox,
} from "@/features/organizations/components/location-form-controls";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  companyName: z.string().min(2, "Studio name is required"),
  logo: z.string().optional(),
  website: z.string().optional(),
});

const step2Schema = z.object({
  locationName: z.string().min(2, "Location name is required"),
  billingEmail: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type OnboardingMode = "mindbody" | "scratch";

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  current,
  mode,
}: {
  current: 0 | 1 | 2;
  mode: OnboardingMode;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {([0, 1, 2] as const).map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center">
            <div
              className={cn(
                "flex aspect-square shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                step === current
                  ? "size-7 bg-linear-to-b from-sky-400 to-sky-500 border border-sky-300/20 border-b-sky-500/70 shadow-sm text-primary-foreground"
                  : step < current
                    ? "size-6 bg-primary/20 text-primary"
                    : "size-6 bg-muted text-muted-foreground",
              )}
            >
              {step + 1}
            </div>
          </div>

          <motion.span
            className={cn(
              "text-[12px] font-medium",
              step === current ? "text-black" : "text-muted-foreground",
            )}
            animate={{ opacity: step === current ? 1 : 0.5 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0
              ? "Import path"
              : step === 1
                ? "Your studio"
                : mode === "mindbody"
                  ? "Mindbody export"
                  : "First location"}
          </motion.span>
          {step < 2 && (
            <div className="relative w-8 h-px bg-border mx-1 overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-primary origin-left"
                animate={{ scaleX: current > step ? 1 : 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Animation variants ───────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -28 : 28 }),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudioOnboardingPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [direction, setDirection] = useState(1);
  const [onboardingMode, setOnboardingMode] =
    useState<OnboardingMode>("scratch");
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  const [pendingLogoFiles, setPendingLogoFiles] = useState<File[]>([]);
  const [mindbodyZipFile, setMindbodyZipFile] = useState<File | null>(null);
  const [mindbodyJobId, setMindbodyJobId] = useState<string | null>(null);
  const [mindbodyPreloaderStep, setMindbodyPreloaderStep] = useState<number>(
    MINDBODY_PRELOADER_PHASES.upload,
  );
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [showPreloader, setShowPreloader] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode via .dark class on <html>
  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const apiReadyRef = useRef(false);
  const navigateCallbackRef = useRef<(() => void) | null>(null);
  const mindbodyTerminalHandledRef = useRef(false);

  const { data: session, isPending: isSessionLoading } =
    authClient.useSession();

  const { options: timezoneOptions } = useTimezoneSelect({
    labelStyle: "original",
    timezones: allTimezones,
  });

  const countryOptions = Country.getAllCountries().map((c) => ({
    value: c.isoCode,
    label: c.name,
  }));

  const stateOptions = selectedCountryCode
    ? State.getStatesOfCountry(selectedCountryCode).map((s) => ({
        value: s.name,
        label: s.name,
        isoCode: s.isoCode,
      }))
    : [];

  useEffect(() => {
    if (!isSessionLoading && !session) {
      router.replace("/login?callbackUrl=/onboarding/studio");
    }
  }, [session, isSessionLoading, router]);

  const step1Form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { companyName: "", logo: "", website: "" },
  });

  const step2Form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      locationName: "",
      billingEmail: "",
      phone: "",
      country: "",
      timezone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
    },
  });

  const selectedState = step2Form.watch("state");
  const selectedStateCode = stateOptions.find(
    (state) => state.value === selectedState,
  )?.isoCode;
  const cityOptions = selectedCountryCode
    ? (selectedStateCode
        ? City.getCitiesOfState(selectedCountryCode, selectedStateCode)
        : City.getCitiesOfCountry(selectedCountryCode) ?? []
      ).map((city) => ({ value: city.name, label: city.name }))
    : [];

  const createAgency = useMutation(
    trpc.organizations.createAgency.mutationOptions(),
  );
  const createMindbodyImport = useMutation(
    trpc.studioImport.createMindbodyImport.mutationOptions(),
  );
  const deleteUploadedMindbodyFile = useMutation(
    trpc.studioImport.deleteUploadedMindbodyFile.mutationOptions(),
  );
  const mindbodyJobQuery = useQuery({
    ...trpc.studioImport.getJob.queryOptions({ id: mindbodyJobId ?? "" }),
    enabled: Boolean(mindbodyJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.job.status;
      return status === "COMPLETED" ||
        status === "FAILED" ||
        status === "ROLLED_BACK"
        ? false
        : 1500;
    },
  });

  // Called by OnboardingPreloader when its animation sequence ends.
  // Hard-navigate so Next.js doesn't briefly show the onboarding form underneath.
  const handlePreloaderComplete = useCallback(() => {
    const target = "/dashboard";
    const go = () => window.location.replace(target);
    if (apiReadyRef.current) {
      go();
    } else {
      navigateCallbackRef.current = go;
    }
  }, []);

  useEffect(() => {
    const job = mindbodyJobQuery.data?.job;
    if (!job || !showPreloader || onboardingMode !== "mindbody") return;

    setMindbodyPreloaderStep(mindbodyPreloaderStepForJob(job));

    if (
      mindbodyTerminalHandledRef.current ||
      (job.status !== "COMPLETED" &&
        job.status !== "FAILED" &&
        job.status !== "ROLLED_BACK")
    ) {
      return;
    }

    mindbodyTerminalHandledRef.current = true;
    const target =
      job.status === "COMPLETED"
        ? "/dashboard"
        : "/studio/import?source=mindbody&onboarding=1";

    if (job.status !== "COMPLETED") {
      toast.error("Mindbody import needs review before continuing.");
    }

    window.setTimeout(() => window.location.replace(target), 1400);
  }, [mindbodyJobQuery.data?.job, onboardingMode, showPreloader]);

  const chooseMode = (mode: OnboardingMode) => {
    setOnboardingMode(mode);
    setMindbodyZipFile(null);
    setMindbodyJobId(null);
    setMindbodyPreloaderStep(MINDBODY_PRELOADER_PHASES.upload);
    mindbodyTerminalHandledRef.current = false;
    setDirection(1);
    setStep(1);
  };

  const handleStep1 = (values: Step1Values) => {
    setStep1Data(values);
    setDirection(1);
    setStep(2);
  };

  const goBack = () => {
    setDirection(-1);
    setStep(step === 2 ? 1 : 0);
  };

  const opt = (v: string | undefined) => (v?.trim() ? v.trim() : undefined);

  const normalizeUrl = (v: string | undefined): string | undefined => {
    const trimmed = v?.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const resolveLogo = async (): Promise<string | undefined> => {
    if (!step1Data) return;

    let logo = step1Data.logo || undefined;
    if (!logo && pendingLogoFiles.length > 0) {
      const res = await uploadFiles("orgLogo", { files: pendingLogoFiles });
      const url = uploadUrl(res?.[0]);
      if (url) logo = url;
    }

    return logo;
  };

  const handleStep2 = async (values: Step2Values) => {
    if (!step1Data) return;

    const logo = await resolveLogo();
    const countryName = values.country
      ? (Country.getCountryByCode(values.country)?.name ?? values.country)
      : undefined;

    setShowPreloader(true);

    try {
      await createAgency.mutateAsync({
        companyName: step1Data.companyName.trim(),
        logo,
        setupMode: "scratch",
        website: normalizeUrl(step1Data.website),
        locationName: `${step1Data.companyName.trim()} — ${values.locationName.trim()}`,
        billingEmail: opt(values.billingEmail),
        phone: opt(values.phone),
        country: countryName,
        timezone: opt(values.timezone),
        addressLine1: opt(values.addressLine1),
        addressLine2: opt(values.addressLine2),
        city: opt(values.city),
        state: opt(values.state),
        postalCode: opt(values.postalCode),
      });
      apiReadyRef.current = true;
      navigateCallbackRef.current?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create your studio.",
      );
      setShowPreloader(false);
      apiReadyRef.current = false;
      navigateCallbackRef.current = null;
    }
  };

  const startMindbodyImport = async () => {
    if (!step1Data) return;
    if (!mindbodyZipFile) {
      toast.error("Choose the full Mindbody ZIP export first.");
      return;
    }
    if (!mindbodyZipFile.name.toLowerCase().endsWith(".zip")) {
      toast.error("Mindbody onboarding only accepts a .zip export.");
      return;
    }

    setMindbodyJobId(null);
    setMindbodyPreloaderStep(MINDBODY_PRELOADER_PHASES.upload);
    mindbodyTerminalHandledRef.current = false;
    setShowPreloader(true);

    let studioCreated = false;
    let uploadedZipRef: { url: string; uploadKey?: string } | null = null;
    try {
      const [uploadedZip] = await uploadFiles("mindbodyImportFile", {
        files: [mindbodyZipFile],
      });
      const zipUrl = uploadUrl(uploadedZip);
      if (!zipUrl) {
        throw new Error("The Mindbody ZIP did not upload cleanly.");
      }
      uploadedZipRef = { url: zipUrl, uploadKey: uploadKey(uploadedZip) };

      setMindbodyPreloaderStep(MINDBODY_PRELOADER_PHASES.createStudio);
      const logo = await resolveLogo();
      await createAgency.mutateAsync({
        companyName: step1Data.companyName.trim(),
        logo,
        setupMode: "mindbody",
        website: normalizeUrl(step1Data.website),
      });
      studioCreated = true;

      setMindbodyPreloaderStep(MINDBODY_PRELOADER_PHASES.queued);
      const { job } = await createMindbodyImport.mutateAsync({
        files: [
          {
            name: mindbodyZipFile.name,
            relativePath: mindbodyZipFile.name,
            url: zipUrl,
            uploadKey: uploadedZipRef.uploadKey,
            size: mindbodyZipFile.size,
            type: mindbodyZipFile.type || "application/zip",
          },
        ],
        dryRun: false,
        source: "onboarding",
      });
      setMindbodyJobId(job.id);
      uploadedZipRef = null;
    } catch (error) {
      if (uploadedZipRef) {
        await deleteUploadedMindbodyFile
          .mutateAsync({ file: uploadedZipRef })
          .catch(() => undefined);
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start the Mindbody import.",
      );
      if (studioCreated) {
        setMindbodyPreloaderStep(MINDBODY_PRELOADER_PHASES.failed);
        window.setTimeout(
          () =>
            window.location.replace(
              "/studio/import?source=mindbody&onboarding=1",
            ),
          1400,
        );
        return;
      }
      setShowPreloader(false);
      setMindbodyJobId(null);
      setMindbodyPreloaderStep(MINDBODY_PRELOADER_PHASES.upload);
      mindbodyTerminalHandledRef.current = false;
    }
  };

  if (isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <>
      {showPreloader && (
        <OnboardingPreloader
          isDark={isDark}
          activeStep={
            onboardingMode === "mindbody" ? mindbodyPreloaderStep : undefined
          }
          steps={
            onboardingMode === "mindbody"
              ? MINDBODY_IMPORT_PRELOADER_STEPS
              : undefined
          }
          holdUntilComplete={onboardingMode !== "mindbody"}
          onComplete={
            onboardingMode === "mindbody" ? undefined : handlePreloaderComplete
          }
        />
      )}

      <div className="mx-auto max-w-2xl px-6 py-12 min-h-screen flex flex-col items-center justify-center">
        <StepIndicator current={step} mode={onboardingMode} />

        <Card className="shadow-none min-w-128 w-full overflow-hidden">
          <CardHeader className="gap-0">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-1"
              >
                {step === 1 ? (
                  <>
                    <CardTitle>How do you want to start?</CardTitle>
                    <CardDescription className="text-xs mt-2">
                      Import a Mindbody export or set up your studio manually.
                    </CardDescription>
                  </>
                ) : step === 2 ? (
                  <>
                    <CardTitle>Create your studio</CardTitle>
                    <CardDescription className="text-xs mt-2">
                      Tell us about your business — this is your top-level
                      workspace.
                    </CardDescription>
                  </>
                ) : (
                  <>
                    <CardTitle>
                      {onboardingMode === "mindbody"
                        ? "Upload your Mindbody export"
                        : "Set up your first location"}
                    </CardTitle>

                    <CardDescription className="text-xs mt-2">
                      {onboardingMode === "mindbody"
                        ? "Use the full ZIP export so Aurea can create locations from Mindbody before importing the rest of your data."
                        : "Locations are the physical spaces or branches you manage. You can add more later from the Locations page."}
                    </CardDescription>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </CardHeader>

          <Separator />
          <CardContent>
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {/* ── Step 0: Import path ── */}
                {step === 0 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button
                      type="button"
                      variant="gradient"
                      className="h-auto w-full min-w-0 items-start gap-3 whitespace-normal p-4 text-left"
                      onClick={() => chooseMode("scratch")}
                    >
                      <span className="min-w-0 flex-1 space-y-1 text-center">
                        <span className="block text-sm font-medium">
                          Start from scratch
                        </span>

                        <span className="block whitespace-normal break-words text-xs font-normal leading-relaxed text-white">
                          Use the existing setup flow and add members, products,
                          and classes later.
                        </span>
                      </span>
                    </Button>

                    <Button
                      type="button"
                      variant="gradient"
                      className="h-auto w-full min-w-0 items-start gap-3 whitespace-normal p-4 text-left"
                      onClick={() => chooseMode("mindbody")}
                    >
                      <span className="min-w-0 flex-1 space-y-1 text-center">
                        <span className="block text-sm font-medium">
                          Import from Mindbody
                        </span>

                        <span className="block whitespace-normal break-words text-xs font-normal leading-relaxed text-white">
                          Create the workspace first, then upload the full
                          Mindbody export.
                        </span>
                      </span>
                    </Button>
                  </div>
                )}

                {/* ── Step 1: Studio ── */}
                {step === 1 && (
                  <Form {...step1Form}>
                    <form
                      onSubmit={step1Form.handleSubmit(handleStep1)}
                      className="space-y-6"
                    >
                      <FormField
                        control={step1Form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Studio name</FormLabel>
                            <FormControl>
                              <Input placeholder="Elevate Fitness" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={step1Form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://elevate.co.uk"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={step1Form.control}
                        name="logo"
                        render={() => (
                          <FormItem>
                            <FormLabel>Studio logo</FormLabel>
                            <OrgLogoUploader
                              value={step1Form.watch("logo")}
                              onChange={(url) =>
                                step1Form.setValue("logo", url, {
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

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={goBack}
                          className="gap-1.5"
                        >
                          <ChevronLeft className="size-3.5" />
                          Back
                        </Button>

                        <Button
                          type="submit"
                          variant="gradient"
                          className="flex-1"
                        >
                          Continue
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}

                {/* ── Step 2: Mindbody ZIP upload ── */}
                {step === 2 && onboardingMode === "mindbody" && (
                  <MindbodyExportUploadStep
                    file={mindbodyZipFile}
                    isSubmitting={
                      showPreloader ||
                      createAgency.isPending ||
                      createMindbodyImport.isPending
                    }
                    onBack={goBack}
                    onFileChange={setMindbodyZipFile}
                    onSubmit={startMindbodyImport}
                  />
                )}

                {/* ── Step 2: First location ── */}
                {step === 2 && onboardingMode === "scratch" && (
                  <Form {...step2Form}>
                    <form
                      onSubmit={step2Form.handleSubmit(handleStep2)}
                      className="space-y-5"
                    >
                      {/* Location name — full width with studio prefix */}
                      <FormField
                        control={step2Form.control}
                        name="locationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location name</FormLabel>
                            <FormControl>
                              <div className="flex items-stretch rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring overflow-hidden">
                                <span className="flex items-center px-3 text-sm text-muted-foreground bg-muted border-r border-input select-none whitespace-nowrap shrink-0">
                                  {step1Data?.companyName} —
                                </span>
                                <Input
                                  className="h-9 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                                  placeholder="London"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Email + Phone */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={step2Form.control}
                          name="billingEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="hello@elevate.co.uk"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={step2Form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <LocationPhoneInput
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Country + Timezone */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={step2Form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <SearchCombobox
                                  value={field.value}
                                  onChange={(code) => {
                                    field.onChange(code);
                                    setSelectedCountryCode(code);
                                    step2Form.setValue("state", "");
                                    step2Form.setValue("city", "");
                                  }}
                                  options={countryOptions}
                                  placeholder="Select country…"
                                  searchPlaceholder="Search countries…"
                                  emptyText="No country found."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={step2Form.control}
                          name="timezone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Timezone</FormLabel>
                              <FormControl>
                                <SearchCombobox
                                  value={field.value}
                                  onChange={field.onChange}
                                  options={timezoneOptions.map((o) => ({
                                    value: o.value,
                                    label: o.label,
                                  }))}
                                  placeholder="Select timezone…"
                                  searchPlaceholder="Search timezones…"
                                  emptyText="No timezone found."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Address line 1 + 2 */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={step2Form.control}
                          name="addressLine1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address line 1</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="14 King's Road"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={step2Form.control}
                          name="addressLine2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address line 2</FormLabel>
                              <FormControl>
                                <Input placeholder="Suite 4" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* City + State/County + Postal code */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={step2Form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
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
                                  <Input placeholder="London" {...field} />
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={step2Form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormLabel>State / County</FormLabel>
                              <FormControl>
                                {stateOptions.length > 0 ? (
                                  <SearchCombobox
                                    value={field.value}
                                    onChange={(state) => {
                                      field.onChange(state);
                                      step2Form.setValue("city", "");
                                    }}
                                    options={stateOptions}
                                    placeholder="Select state…"
                                    searchPlaceholder="Search states…"
                                    emptyText="No state found."
                                  />
                                ) : (
                                  <Input
                                    placeholder="Greater London"
                                    {...field}
                                  />
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={step2Form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postal code</FormLabel>
                              <FormControl>
                                <Input placeholder="SW1A 1AA" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Back + Submit */}
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={goBack}
                          className="gap-1.5"
                        >
                          <ChevronLeft className="size-3.5" />
                          Back
                        </Button>
                        <Button
                          type="submit"
                          variant="gradient"
                          className="flex-1"
                          disabled={createAgency.isPending}
                        >
                          {createAgency.isPending
                            ? "Creating…"
                            : "Create studio"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
