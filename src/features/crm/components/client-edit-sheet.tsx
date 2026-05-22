"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsItem,
  TagsList,
  TagsInput as TagsSearchInput,
  TagsTrigger,
  TagsValue,
} from "@/components/ui/shadcn-io/tags";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { PageTabs } from "@/components/ui/page-tabs";
import type { AcquisitionStage, ClientType, LifecycleStage } from "@/db/enums";
import {
  ACQUISITION_STAGE_VALUES,
  CLIENT_TYPE_VALUES,
  LIFECYCLE_STAGE_VALUES,
} from "@/features/crm/constants";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { MemberLifecyclePanel } from "./member-lifecycle-panel";
import { NotesPanel } from "./notes-panel";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  logo: z.string().optional(),
  companyName: z.string().optional(),
  email: z.email("Invalid email").optional().or(z.literal("")),
  position: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  score: z.string().optional(),
  type: z.enum(CLIENT_TYPE_VALUES).optional(),
  lifecycleStage: z.enum(LIFECYCLE_STAGE_VALUES).optional(),
  acquisitionStage: z.enum(ACQUISITION_STAGE_VALUES).optional(),
  source: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assigneeIds: z.array(z.string()).optional(),
  instructorIds: z.array(z.string()).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  fitnessGoals: z.array(z.string()).optional(),
  healthNotes: z.string().optional(),
  contraindications: z.string().optional(),
  birthday: z.string().optional(),
  trustedMember: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const DETAIL_TABS = [
  { id: "profile", label: "Profile" },
  { id: "payments", label: "Payments" },
  { id: "waivers", label: "Waivers" },
  { id: "activity", label: "Activity" },
] as const;

interface ClientEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    name: string;
    logo?: string | null;
    companyName?: string | null;
    email?: string | null;
    position?: string | null;
    phone?: string | null;
    country?: string | null;
    city?: string | null;
    score?: number | null;
    type: ClientType;
    lifecycleStage?: LifecycleStage | null;
    acquisitionStage?: AcquisitionStage | null;
    acquiredAt?: Date | string | null;
    trialStartedAt?: Date | string | null;
    source?: string | null;
    website?: string | null;
    linkedin?: string | null;
    tags: string[];
    metadata?: unknown;
    assignees: Array<{ id: string; name: string | null; image: string | null }>;
    instructors: Array<{ id: string; name: string; image: string | null }>;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    fitnessGoals?: string[];
    healthNotes?: string | null;
    contraindications?: string | null;
    birthMonth?: number | null;
    birthDay?: number | null;
    trustedMember?: boolean | null;
    attendanceCount?: number | null;
    currentStreak?: number | null;
  };
  clientView?: "members" | "leads" | "all";
}

export function ClientEditSheet({
  open,
  onOpenChange,
  client,
  clientView = "all",
}: ClientEditSheetProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeDetailTab, setActiveDetailTab] = useState("profile");

  const { data: membersData } = useQuery(
    trpc.clients.getLocationMembers.queryOptions(),
  );

  const { data: instructorsData } = useQuery(
    trpc.clients.getInstructors.queryOptions(),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: client.name,
      logo: client.logo ?? "",
      companyName: client.companyName ?? "",
      email: client.email ?? "",
      position: client.position ?? "",
      phone: client.phone ?? "",
      country: client.country ?? "",
      city: client.city ?? "",
      score: client.score?.toString() ?? "",
      type: client.type,
      lifecycleStage: client.lifecycleStage ?? undefined,
      acquisitionStage: client.acquisitionStage ?? "INQUIRY",
      source: client.source ?? "",
      website: client.website ?? "",
      linkedin: client.linkedin ?? "",
      tags: client.tags ?? [],
      assigneeIds: client.assignees.map((a) => a.id),
      instructorIds: client.instructors.map((i) => i.id),
      emergencyContactName: client.emergencyContactName ?? "",
      emergencyContactPhone: client.emergencyContactPhone ?? "",
      fitnessGoals: client.fitnessGoals ?? [],
      healthNotes: client.healthNotes ?? "",
      contraindications: client.contraindications ?? "",
      birthday:
        client.birthMonth && client.birthDay
          ? `2000-${String(client.birthMonth).padStart(2, "0")}-${String(client.birthDay).padStart(2, "0")}`
          : "",
      trustedMember: client.trustedMember ?? false,
    },
  });

  // Reset form when client changes
  useEffect(() => {
    setActiveDetailTab("profile");
    form.reset({
      name: client.name,
      logo: client.logo ?? "",
      companyName: client.companyName ?? "",
      email: client.email ?? "",
      position: client.position ?? "",
      phone: client.phone ?? "",
      country: client.country ?? "",
      city: client.city ?? "",
      score: client.score?.toString() ?? "",
      type: client.type,
      lifecycleStage: client.lifecycleStage ?? undefined,
      acquisitionStage: client.acquisitionStage ?? "INQUIRY",
      source: client.source ?? "",
      website: client.website ?? "",
      linkedin: client.linkedin ?? "",
      tags: client.tags ?? [],
      assigneeIds: client.assignees.map((a) => a.id),
      instructorIds: client.instructors.map((i) => i.id),
      emergencyContactName: client.emergencyContactName ?? "",
      emergencyContactPhone: client.emergencyContactPhone ?? "",
      fitnessGoals: client.fitnessGoals ?? [],
      healthNotes: client.healthNotes ?? "",
      contraindications: client.contraindications ?? "",
      birthday:
        client.birthMonth && client.birthDay
          ? `2000-${String(client.birthMonth).padStart(2, "0")}-${String(client.birthDay).padStart(2, "0")}`
          : "",
      trustedMember: client.trustedMember ?? false,
    });
  }, [client, form]);

  const updateClient = useMutation(
    trpc.clients.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        onOpenChange(false);
      },
    }),
  );

  const onSubmit = async (values: FormValues) => {
    const clean = {
      id: client.id,
      name: values.name.trim(),
      logo: values.logo?.trim() ? values.logo.trim() : undefined,
      companyName: values.companyName?.trim()
        ? values.companyName.trim()
        : undefined,
      email: values.email?.trim() ? values.email.trim() : undefined,
      position: values.position?.trim() ? values.position.trim() : undefined,
      phone: values.phone?.trim() ? values.phone.trim() : undefined,
      country: values.country?.trim() ? values.country.trim() : undefined,
      city: values.city?.trim() ? values.city.trim() : undefined,
      score: values.score?.trim()
        ? Number.parseInt(values.score.trim(), 10)
        : undefined,
      type: values.type as ClientType | undefined,
      lifecycleStage: values.lifecycleStage as LifecycleStage | undefined,
      acquisitionStage: values.acquisitionStage,
      source: values.source?.trim() ? values.source.trim() : undefined,
      website: values.website?.trim() ? values.website.trim() : undefined,
      linkedin: values.linkedin?.trim() ? values.linkedin.trim() : undefined,
      tags: values.tags,
      assigneeIds: values.assigneeIds,
      instructorIds: values.instructorIds,
      emergencyContactName: values.emergencyContactName?.trim() || undefined,
      emergencyContactPhone: values.emergencyContactPhone?.trim() || undefined,
      fitnessGoals: values.fitnessGoals,
      healthNotes: values.healthNotes?.trim() || undefined,
      contraindications: values.contraindications?.trim() || undefined,
      birthMonth: values.birthday
        ? new Date(values.birthday).getMonth() + 1
        : undefined,
      birthDay: values.birthday
        ? new Date(values.birthday).getDate()
        : undefined,
      trustedMember: values.trustedMember,
    };

    await updateClient.mutateAsync(clean);
  };

  const [tagInput, setTagInput] = useState("");
  const isLeadView =
    clientView === "leads" ||
    client.type === "LEAD" ||
    client.type === "PROSPECT";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader className="p-0">
        <SheetTitle className="text-xs hidden">Edit Member</SheetTitle>
      </SheetHeader>

      <SheetContent className="flex flex-col gap-0 bg-background border-black/5 dark:border-white/5 sm:max-w-xl text-primary w-full">
        <div className="border-b border-black/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              {client.logo ? (
                <AvatarImage src={client.logo} alt={client.name} />
              ) : (
                <AvatarFallback className="bg-muted text-[11px] text-muted-foreground">
                  {client.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-primary">
                {client.name}
              </p>
              <p className="truncate text-xs text-primary/55">
                {client.email ?? client.phone ?? "No client details"}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {client.type.toLowerCase().replace("_", " ")}
            </Badge>
          </div>
        </div>

        <PageTabs
          tabs={[...DETAIL_TABS]}
          activeTab={activeDetailTab}
          onTabChange={setActiveDetailTab}
          className="px-4"
        />

        <div className="flex-1 overflow-y-auto">
          {activeDetailTab === "profile" ? (
            <Accordion type="single" collapsible>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-0 pb-4"
                >
                  <AccordionItem value="company-info">
                    <AccordionTrigger>Personal info</AccordionTrigger>

                    <AccordionContent className="px-6 space-y-6 pb-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Full name</FormLabel>

                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="john@acme.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Phone</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="+44 7123 456789"
                                  {...field}
                                />
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
                              <FormLabel className="text-xs ">
                                Country
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="United Kingdom"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs ">City</FormLabel>
                              <FormControl>
                                <Input placeholder="London" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Source</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Referral, Instagram, Walk-in..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="client-info">
                    <AccordionTrigger>Member info</AccordionTrigger>
                    <AccordionContent className="px-6 space-y-4 pb-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Member type
                              </FormLabel>

                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full text-xs">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>

                                <SelectContent>
                                  <SelectItem value="LEAD">Lead</SelectItem>
                                  <SelectItem value="PROSPECT">
                                    Trial Member
                                  </SelectItem>
                                  <SelectItem value="CUSTOMER">
                                    Active Member
                                  </SelectItem>
                                  <SelectItem value="CHURN">
                                    Lapsed / At-Risk
                                  </SelectItem>
                                  <SelectItem value="CLOSED">
                                    Former Member
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="lifecycleStage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs w-full">
                                Lifecycle stage
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full text-xs">
                                    <SelectValue placeholder="Select stage" />
                                  </SelectTrigger>
                                </FormControl>

                                <SelectContent>
                                  <SelectItem value="SUBSCRIBER">
                                    Prospect
                                  </SelectItem>
                                  <SelectItem value="LEAD">Lead</SelectItem>
                                  <SelectItem value="MQL">Trial</SelectItem>
                                  <SelectItem value="SQL">
                                    Onboarding
                                  </SelectItem>
                                  <SelectItem value="OPPORTUNITY">
                                    Ready to Join
                                  </SelectItem>
                                  <SelectItem value="CUSTOMER">
                                    Active Member
                                  </SelectItem>
                                  <SelectItem value="EVANGELIST">
                                    Ambassador
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="acquisitionStage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs w-full">
                                Acquisition stage
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full text-xs">
                                    <SelectValue placeholder="Select stage" />
                                  </SelectTrigger>
                                </FormControl>

                                <SelectContent>
                                  <SelectItem value="INQUIRY">
                                    Inquiry
                                  </SelectItem>
                                  <SelectItem value="TRIAL">Trial</SelectItem>
                                  <SelectItem value="ACTIVE">Active</SelectItem>
                                  <SelectItem value="LOST">Lost</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {!isLeadView ? (
                    <AccordionItem value="fitness-health">
                      <AccordionTrigger>
                        Fitness & health
                        {client.attendanceCount ? (
                          <span className="ml-auto mr-2 text-[10px] text-primary/40 font-normal">
                            {client.attendanceCount} visits ·{" "}
                            {client.currentStreak ?? 0} streak
                          </span>
                        ) : null}
                      </AccordionTrigger>
                      <AccordionContent className="px-6 space-y-4 pb-6">
                        <FormField
                          control={form.control}
                          name="birthday"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Birthday
                              </FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="emergencyContactName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Emergency Client
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="Full name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="emergencyContactPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Emergency Phone
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="+1 555 123 4567"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="healthNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Health Notes
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Injuries, conditions, limitations..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contraindications"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Contraindications
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Exercises or movements to avoid..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="trustedMember"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value ?? false}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-xs !mt-0">
                                VIP / Trusted member (skip cancellation fees,
                                priority waitlist)
                              </FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ) : null}

                  <div className="px-6 space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => {
                        const handleAddTag = (tag: string) => {
                          const trimmed = tag.trim();
                          if (trimmed && !field.value?.includes(trimmed)) {
                            field.onChange([...(field.value ?? []), trimmed]);
                            setTagInput("");
                          }
                        };

                        const handleRemoveTag = (tagToRemove: string) => {
                          field.onChange(
                            field.value?.filter((tag) => tag !== tagToRemove) ??
                              [],
                          );
                        };

                        return (
                          <FormItem>
                            <FormLabel className="text-xs">Tags</FormLabel>
                            <FormControl>
                              <Tags>
                                <TagsTrigger className="gap-1 shadow-none">
                                  {field.value && field.value.length > 0
                                    ? field.value.map((tag) => (
                                        <TagsValue
                                          key={tag}
                                          onRemove={() => handleRemoveTag(tag)}
                                          className="w-max text-[11px] brightness-100 border border-violet-300 bg-violet-100 text-violet-600 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400"
                                        >
                                          {tag}
                                        </TagsValue>
                                      ))
                                    : null}
                                </TagsTrigger>

                                <TagsContent
                                  align="start"
                                  className="ring ring-black/10"
                                >
                                  <TagsSearchInput
                                    placeholder="Type to add tag..."
                                    className="text-xs text-white"
                                    value={tagInput}
                                    onValueChange={setTagInput}
                                    onKeyDown={(
                                      e: React.KeyboardEvent<HTMLInputElement>,
                                    ) => {
                                      if (
                                        e.key === "Enter" &&
                                        tagInput.trim()
                                      ) {
                                        e.preventDefault();
                                        handleAddTag(tagInput);
                                      }
                                    }}
                                  />

                                  <TagsList>
                                    <TagsEmpty>
                                      {tagInput.trim() ? (
                                        <Button
                                          type="button"
                                          className="cursor-pointer px-4 py-1.5! h-max! text-xs border border-violet-300 bg-violet-100 text-violet-600 hover:bg-violet-100 hover:text-violet-500"
                                          onClick={() => handleAddTag(tagInput)}
                                        >
                                          Add &quot;{tagInput}&quot;
                                        </Button>
                                      ) : (
                                        <p className="text-primary/80 dark:text-white/50 text-xs">
                                          Type to add a tag
                                        </p>
                                      )}
                                    </TagsEmpty>

                                    {field.value && field.value.length > 0 && (
                                      <TagsGroup>
                                        <div className="p-2 px-3">
                                          <p className="mb-2 text-[10px] text-primary/80 dark:text-white/50 tracking-wide">
                                            Existing tags
                                          </p>

                                          <div className="space-y-1">
                                            {field.value.map((tag) => (
                                              <TagsItem
                                                key={tag}
                                                value={tag}
                                                onSelect={() =>
                                                  handleRemoveTag(tag)
                                                }
                                                className="bg-primary-foreground/75! hover:bg-primary-foreground/75! text-primary! text-[11px] rounded-sm px-4"
                                              >
                                                {tag}
                                                <CheckIcon className="size-3" />
                                              </TagsItem>
                                            ))}
                                          </div>
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

                    <FormField
                      control={form.control}
                      name="instructorIds"
                      render={({ field }) => {
                        const selectedInstructors = instructorsData?.filter(
                          (i) => field.value?.includes(i.id),
                        );
                        return (
                          <FormItem>
                            <FormLabel className="text-xs ">
                              Assigned instructors
                            </FormLabel>

                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-between text-xs h-10 bg-background hover:bg-primary-foreground/75 text-primary hover:text-primary px-2 shadow-none"
                                  >
                                    {selectedInstructors &&
                                    selectedInstructors.length > 0 ? (
                                      <div className="flex items-center gap-2">
                                        <div className="flex -space-x-2">
                                          {selectedInstructors
                                            .slice(0, 3)
                                            .map((instructor) => (
                                              <Avatar
                                                key={instructor.id}
                                                className="size-6 "
                                              >
                                                {instructor.image ? (
                                                  <AvatarImage
                                                    src={instructor.image}
                                                    alt={instructor.name}
                                                  />
                                                ) : (
                                                  <AvatarFallback className="bg-[#202e32] text-white text-[10px] rounded-sm">
                                                    {(
                                                      instructor.name?.[0] ??
                                                      "U"
                                                    ).toUpperCase()}
                                                  </AvatarFallback>
                                                )}
                                              </Avatar>
                                            ))}
                                        </div>
                                        <span className="text-xs">
                                          {selectedInstructors.length === 1
                                            ? selectedInstructors[0].name
                                            : `${selectedInstructors.length} instructors selected`}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-primary px-2 dark:text-white/50 text-xs">
                                        Select instructors
                                      </span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>

                              <PopoverContent
                                className="w-80 p-0 bg-background border-black/5 dark:border-white/5 rounded-sm"
                                align="start"
                              >
                                <div className="max-h-64 overflow-y-auto p-2">
                                  {instructorsData &&
                                  instructorsData.length > 0 ? (
                                    instructorsData.map((instructor) => {
                                      const isSelected = field.value?.includes(
                                        instructor.id,
                                      );
                                      return (
                                        <button
                                          key={instructor.id}
                                          type="button"
                                          className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left hover:bg-primary-foreground/75 text-primary hover:text-primary transition"
                                          onClick={() => {
                                            const current = field.value ?? [];
                                            if (isSelected) {
                                              field.onChange(
                                                current.filter(
                                                  (id) => id !== instructor.id,
                                                ),
                                              );
                                            } else {
                                              field.onChange([
                                                ...current,
                                                instructor.id,
                                              ]);
                                            }
                                          }}
                                        >
                                          <div
                                            className={cn(
                                              "flex size-4 shrink-0 items-center justify-center rounded-xs border border-black/10 dark:border-white/5",
                                              isSelected
                                                ? "bg-background text-primary"
                                                : "bg-background",
                                            )}
                                          >
                                            {isSelected && (
                                              <CheckIcon className="size-3" />
                                            )}
                                          </div>

                                          <Avatar className="size-7 ">
                                            {instructor.image ? (
                                              <AvatarImage
                                                src={instructor.image}
                                                alt={instructor.name}
                                              />
                                            ) : (
                                              <AvatarFallback className="bg-muted text-muted-foreground text-[11px]">
                                                {(
                                                  instructor.name?.[0] ?? "U"
                                                ).toUpperCase()}
                                              </AvatarFallback>
                                            )}
                                          </Avatar>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs text-primary dark:text-white truncate">
                                              {instructor.name}
                                            </p>
                                            <p className="text-[11px] text-primary/50 dark:text-white/50 truncate">
                                              {instructor.email ?? "No email"}
                                            </p>
                                          </div>
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <p className="text-xs text-primary/50 dark:text-white/50 p-2">
                                      No instructors available
                                    </p>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <div className="pt-2">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-medium text-primary dark:text-white">
                            Notes
                          </h3>
                          <p className="text-[11px] text-primary/60 dark:text-white/40">
                            Keep a running log with mentions and pins.
                          </p>
                        </div>
                      </div>
                      <NotesPanel
                        clientId={client.id}
                        members={membersData ?? []}
                      />
                    </div>
                  </div>
                </form>
              </Form>
            </Accordion>
          ) : (
            <MemberLifecyclePanel
              clientId={client.id}
              view={
                activeDetailTab === "payments"
                  ? "payments"
                  : activeDetailTab === "waivers"
                    ? "waivers"
                    : activeDetailTab === "activity"
                      ? "activity"
                      : "overview"
              }
            />
          )}
        </div>

        {activeDetailTab === "profile" ? (
          <SheetFooter className="pb-6 w-full justify-end">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="destructive"
              className="w-max"
            >
              Cancel
            </Button>

            <Button
              onClick={form.handleSubmit(onSubmit)}
              type="submit"
              disabled={updateClient.isPending}
              variant="success"
              className=" w-max"
            >
              Save changes
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
