"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckIcon, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput as TagsSearchInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from "@/components/ui/shadcn-io/tags";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import {
  ACCESS_TARGETS,
  BILLING_INTERVALS,
  optionalNumber,
  pricingOptionCreateSchema,
  PRICING_TYPES,
  type AccessTarget,
  type PricingOptionCreateInput,
  type PricingOptionCreateValues,
} from "./pricing-option-create-constants";
import {
  PricingOptionStepIndicator,
  type PricingOptionCreateStep,
} from "./pricing-option-step-indicator";

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -28 : 28 }),
};

const stepFields: Record<PricingOptionCreateStep, Array<keyof PricingOptionCreateInput>> = {
  0: ["name", "type", "price", "billingInterval"],
  1: ["accessTarget", "targetId"],
  2: ["isPublic", "showInPos", "directPurchaseEnabled"],
};

const stepContent = {
  0: {
    title: "Set the price",
    description:
      "Define what is being sold, how it is billed, and how it should be categorized.",
  },
  1: {
    title: "Define access",
    description:
      "Choose the services, categories, or class types this pricing option unlocks.",
  },
  2: {
    title: "Publish channels",
    description:
      "Control where this option appears and add customer-facing terms or confirmation copy.",
  },
} satisfies Record<PricingOptionCreateStep, { title: string; description: string }>;

export function NewPricingOptionPageClient() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState<PricingOptionCreateStep>(0);
  const [direction, setDirection] = React.useState(1);

  const form = useForm<
    PricingOptionCreateInput,
    unknown,
    PricingOptionCreateValues
  >({
    resolver: zodResolver(pricingOptionCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "MEMBERSHIP",
      price: 0,
      billingInterval: "ONE_TIME",
      classCredits: "",
      durationDays: "",
      revenueCategory: "",
      accessTarget: "ALL_SERVICES",
      targetId: "none",
      accessSummary: "",
      termsText: "",
      confirmationEmail: "",
      isPublic: true,
      showInPos: true,
      directPurchaseEnabled: true,
    },
  });

  const accessTarget = form.watch("accessTarget");
  const selectedType = form.watch("type");
  const isPublic = form.watch("isPublic");
  const showInPos = form.watch("showInPos");
  const directPurchaseEnabled = form.watch("directPurchaseEnabled");

  React.useEffect(() => {
    form.setValue("targetId", "none");
  }, [accessTarget, form]);

  const { data: services = [] } = useQuery(
    trpc.serviceCatalog.list.queryOptions({ includeInactive: false }),
  );
  const { data: categories = [] } = useQuery(
    trpc.serviceCatalog.categories.queryOptions(),
  );
  const { data: classTypes = [] } = useQuery(
    trpc.classTypes.list.queryOptions({ includeInactive: false }),
  );
  const { data: revenueCategories = [] } = useQuery(
    trpc.pricingOptions.revenueCategories.queryOptions(),
  );
  const { data: createDefaults } = useQuery(
    trpc.pricingOptions.getCreateDefaults.queryOptions(),
  );

  const createOption = useMutation(
    trpc.pricingOptions.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.pricingOptions.list.queryOptions({ includeInactive: true }),
        );
        toast.success("Pricing option created");
        router.push("/studio/pricing-options");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const targetOptions = React.useMemo(() => {
    if (accessTarget === "SERVICE_TYPE") {
      return services.map((service) => ({ id: service.id, name: service.name }));
    }
    if (accessTarget === "SERVICE_CATEGORY") {
      return categories.map((category) => ({
        id: category.id,
        name: category.name,
      }));
    }
    if (accessTarget === "CLASS_TYPE") {
      return classTypes.map((classType) => ({
        id: classType.id,
        name: classType.name,
      }));
    }
    return [];
  }, [accessTarget, categories, classTypes, services]);

  async function goNext(): Promise<void> {
    const isValid = await form.trigger(stepFields[step]);
    if (!isValid) return;
    setDirection(1);
    setStep((current) => Math.min(2, current + 1) as PricingOptionCreateStep);
  }

  function goBack(): void {
    setDirection(-1);
    setStep((current) => Math.max(0, current - 1) as PricingOptionCreateStep);
  }

  function handleCreate(values: PricingOptionCreateValues): void {
    if (!createDefaults) {
      toast.error("Set a valid workspace currency before creating pricing.");
      return;
    }
    const grant =
      values.accessTarget === "ALL_SERVICES"
        ? { targetType: "ALL_SERVICES" as const }
        : {
            targetType: values.accessTarget,
            serviceTypeId:
              values.accessTarget === "SERVICE_TYPE" ? values.targetId : null,
            serviceCategoryId:
              values.accessTarget === "SERVICE_CATEGORY" ? values.targetId : null,
            classTypeId:
              values.accessTarget === "CLASS_TYPE" ? values.targetId : null,
          };

    createOption.mutate({
      name: values.name,
      description: values.description || null,
      type: values.type,
      price: values.price,
      currency: createDefaults.currency,
      billingInterval: values.billingInterval,
      classCredits: optionalNumber(values.classCredits),
      durationDays: optionalNumber(values.durationDays),
      revenueCategory: values.revenueCategory || null,
      isIntroOffer: values.type === "INTRO_OFFER",
      isBundle: values.type === "BUNDLE",
      isPublic: values.isPublic,
      isHidden: !values.isPublic,
      showInPos: values.showInPos,
      directPurchaseEnabled: values.directPurchaseEnabled,
      termsText: values.termsText || null,
      confirmationEmailBody: values.confirmationEmail || null,
      commissionMode: "NONE",
      accessSummary: values.accessSummary || null,
      accessGrants: [grant],
    });
  }

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-10">
      <div className="mb-5">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/studio/pricing-options">
            <ArrowLeft className="size-3.5" />
            Pricing options
          </Link>
        </Button>
      </div>

      <PricingOptionStepIndicator current={step} />

      <Card className="overflow-hidden shadow-none">
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
              <CardTitle>{stepContent[step].title}</CardTitle>
              <CardDescription className="mt-2 text-xs">
                {stepContent[step].description}
              </CardDescription>
            </motion.div>
          </AnimatePresence>
        </CardHeader>

        <Separator />

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCreate)}
              className="space-y-6"
            >
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="space-y-5"
                >
                  {step === 0 && (
                    <PricingStep
                      revenueCategories={revenueCategories}
                      selectedType={selectedType}
                      currency={createDefaults?.currency ?? null}
                    />
                  )}
                  {step === 1 && (
                    <AccessStep
                      accessTarget={accessTarget}
                      targetOptions={targetOptions}
                    />
                  )}
                  {step === 2 && (
                    <PublishStep
                      isPublic={isPublic}
                      showInPos={showInPos}
                      directPurchaseEnabled={directPurchaseEnabled}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-3">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={goBack}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="size-3.5" />
                    Back
                  </Button>
                ) : (
                  <Button asChild variant="ghost">
                    <Link href="/studio/pricing-options">Cancel</Link>
                  </Button>
                )}

                {step < 2 ? (
                  <Button
                    type="button"
                    variant="gradient"
                    className="flex-1"
                    onClick={goNext}
                  >
                    Continue
                    <ChevronRight className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="gradient"
                    className="flex-1"
                    disabled={createOption.isPending || !createDefaults}
                  >
                    {createOption.isPending
                      ? "Creating..."
                      : "Create pricing option"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function PricingStep({
  revenueCategories,
  selectedType,
  currency,
}: {
  revenueCategories: string[];
  selectedType: string;
  currency: string | null;
}) {
  return (
    <>
      <FormField
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Unlimited Monthly" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRICING_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="billingInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BILLING_INTERVALS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder="Short member-facing description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price{currency ? ` (${currency})` : ""}</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="classCredits"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credits</FormLabel>
              <FormControl>
                <Input type="number" min="1" placeholder="Unlimited" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="durationDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration days</FormLabel>
              <FormControl>
                <Input type="number" min="1" placeholder="No expiry" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <RevenueCategoryField
        fallbackPlaceholder={
          selectedType === "ACCOUNT_CREDIT" ? "Account credit" : "Memberships"
        }
        options={revenueCategories}
      />
    </>
  );
}

function RevenueCategoryField({
  fallbackPlaceholder,
  options,
}: {
  fallbackPlaceholder: string;
  options: string[];
}) {
  const [search, setSearch] = React.useState("");

  return (
    <FormField
      name="revenueCategory"
      render={({ field }) => {
        const selected = field.value?.trim() ?? "";
        const normalizedSearch = search.trim();
        const visibleOptions = options.filter((option) =>
          option.toLowerCase().includes(search.toLowerCase().trim()),
        );
        const canAdd =
          normalizedSearch.length > 0 &&
          !options.some(
            (option) => option.toLowerCase() === normalizedSearch.toLowerCase(),
          );

        function selectCategory(value: string): void {
          field.onChange(value);
          setSearch("");
        }

        return (
          <FormItem>
            <FormLabel>Revenue category</FormLabel>
            <FormControl>
              <Tags>
                <TagsTrigger className="gap-1 shadow-none">
                  {selected ? (
                    <TagsValue
                      onRemove={() => field.onChange("")}
                      className="w-max border border-violet-300 bg-violet-100 text-[11px] text-violet-600 brightness-100 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400"
                    >
                      {selected}
                    </TagsValue>
                  ) : (
                    <span className="px-2 py-px text-xs text-primary/50">
                      {fallbackPlaceholder}
                    </span>
                  )}
                </TagsTrigger>
                <TagsContent align="start" className="ring ring-black/10">
                  <TagsSearchInput
                    placeholder="Search or add category..."
                    className="text-xs text-primary"
                    value={search}
                    onValueChange={setSearch}
                    onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter" && normalizedSearch) {
                        event.preventDefault();
                        selectCategory(normalizedSearch);
                      }
                    }}
                  />
                  <TagsList>
                    <TagsEmpty>
                      {canAdd ? (
                        <Button
                          type="button"
                          className="h-max cursor-pointer border border-violet-300 bg-violet-100 px-4 py-1.5! text-xs text-violet-600 hover:bg-violet-100 hover:text-violet-500"
                          onClick={() => selectCategory(normalizedSearch)}
                        >
                          Add &quot;{normalizedSearch}&quot;
                        </Button>
                      ) : (
                        <p className="text-xs text-primary/50">
                          Type to add a category
                        </p>
                      )}
                    </TagsEmpty>
                    {visibleOptions.length > 0 && (
                      <TagsGroup>
                        <div className="space-y-1 p-2 px-3">
                          <p className="mb-2 text-[10px] tracking-wide text-primary/50">
                            Existing categories
                          </p>
                          {visibleOptions.map((option) => (
                            <TagsItem
                              key={option}
                              value={option}
                              onSelect={() =>
                                selected === option
                                  ? selectCategory("")
                                  : selectCategory(option)
                              }
                              className="rounded-sm bg-primary-foreground/75! px-4 text-[11px] text-primary!"
                            >
                              {option}
                              {selected === option && (
                                <CheckIcon className="size-3" />
                              )}
                            </TagsItem>
                          ))}
                        </div>
                      </TagsGroup>
                    )}
                  </TagsList>
                </TagsContent>
              </Tags>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function AccessStep({
  accessTarget,
  targetOptions,
}: {
  accessTarget: AccessTarget;
  targetOptions: Array<{ id: string; name: string }>;
}) {
  return (
    <>
      <FormField
        name="accessTarget"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Access target</FormLabel>
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                field.onBlur();
              }}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ACCESS_TARGETS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {accessTarget !== "ALL_SERVICES" && (
        <FormField
          name="targetId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Access item</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Select item</SelectItem>
                  {targetOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        name="accessSummary"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Access summary</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Unlimited reformer classes and video library access"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function PublishStep({
  directPurchaseEnabled,
  isPublic,
  showInPos,
}: {
  directPurchaseEnabled: boolean;
  isPublic: boolean;
  showInPos: boolean;
}) {
  return (
    <>
      <ToggleField
        name="isPublic"
        label="Public buy page"
        description="Show this option on public pricing pages."
        checked={isPublic}
      />
      <ToggleField
        name="showInPos"
        label="Show in POS"
        description="Let staff sell this option from the studio POS."
        checked={showInPos}
      />
      <ToggleField
        name="directPurchaseEnabled"
        label="Direct purchase"
        description="Allow checkout from the public buy page."
        checked={directPurchaseEnabled}
      />
      <FormField
        name="termsText"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Agreement terms</FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="confirmationEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirmation email</FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function ToggleField({
  checked,
  description,
  label,
  name,
}: {
  checked: boolean;
  description: string;
  label: string;
  name: "isPublic" | "showInPos" | "directPurchaseEnabled";
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4 rounded-sm border border-black/10 p-3 dark:border-white/5">
          <div className="space-y-1">
            <FormLabel>{label}</FormLabel>
            <p className="text-xs text-primary/50">{description}</p>
          </div>
          <FormControl>
            <Switch checked={checked} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
