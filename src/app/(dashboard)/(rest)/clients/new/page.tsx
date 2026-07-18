"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  formatDateValue,
  parseDateValue,
} from "@/components/ui/date-picker-utils";
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
import { Separator } from "@/components/ui/separator";
import { TagsInput } from "@/components/ui/tags-input";
import type { ClientType, LifecycleStage } from "@/db/enums";
import {
  ACQUISITION_STAGE_VALUES,
  CLIENT_TYPE_VALUES,
  LIFECYCLE_STAGE_VALUES,
} from "@/features/crm/constants";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  type: z.enum(CLIENT_TYPE_VALUES).optional(),
  lifecycleStage: z.enum(LIFECYCLE_STAGE_VALUES).optional(),
  acquisitionStage: z.enum(ACQUISITION_STAGE_VALUES).optional(),
  birthday: z.string().optional(),
  source: z.string().optional(),
  linkedin: z.string().optional(),
  tags: z.array(z.string()).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  healthNotes: z.string().optional(),
  contraindications: z.string().optional(),
  trustedMember: z.boolean().optional(),
  instructorIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewClientPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      country: "",
      city: "",
      type: "LEAD",
      lifecycleStage: undefined,
      acquisitionStage: "INQUIRY",
      birthday: "",
      source: "",
      linkedin: "",
      tags: [],
      emergencyContactName: "",
      emergencyContactPhone: "",
      healthNotes: "",
      contraindications: "",
      trustedMember: false,
      instructorIds: [],
    },
  });

  const { data: instructorsData } = useQuery(
    trpc.clients.getInstructors.queryOptions(),
  );

  const createClient = useMutation(
    trpc.clients.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Member created successfully");
        router.push("/clients");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create member");
      },
    }),
  );

  const onSubmit = async (values: FormValues) => {
    let birthMonth: number | undefined;
    let birthDay: number | undefined;
    if (values.birthday?.trim()) {
      const d = new Date(values.birthday);
      if (!Number.isNaN(d.getTime())) {
        birthMonth = d.getMonth() + 1;
        birthDay = d.getDate();
      }
    }

    await createClient.mutateAsync({
      name: values.name.trim(),
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      country: values.country?.trim() || undefined,
      city: values.city?.trim() || undefined,
      type: values.type as ClientType | undefined,
      lifecycleStage: values.lifecycleStage as LifecycleStage | undefined,
      acquisitionStage: values.acquisitionStage,
      birthMonth,
      birthDay,
      source: values.source?.trim() || undefined,
      linkedin: values.linkedin?.trim() || undefined,
      tags: values.tags ?? [],
      emergencyContactName: values.emergencyContactName?.trim() || undefined,
      emergencyContactPhone: values.emergencyContactPhone?.trim() || undefined,
      healthNotes: values.healthNotes?.trim() || undefined,
      contraindications: values.contraindications?.trim() || undefined,
      trustedMember: values.trustedMember,
      instructorIds: values.instructorIds,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary">Add member</h1>
          <p className="text-xs text-primary/75">
            Add a new member to your studio.
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-white/5">
              {/* Full name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75">
                      Full name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        className="border-black/10 dark:border-white/5 text-primary text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Email + Phone */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="john@example.com"
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
                        Phone
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+44 7123 456789"
                          className="border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Member type + Lifecycle stage */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Member type
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          <SelectItem value="LEAD">Lead</SelectItem>
                          <SelectItem value="PROSPECT">Trial Member</SelectItem>
                          <SelectItem value="CUSTOMER">
                            Active Member
                          </SelectItem>
                          <SelectItem value="CHURN">
                            Lapsed / At-Risk
                          </SelectItem>
                          <SelectItem value="CLOSED">Former Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lifecycleStage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Lifecycle stage
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          <SelectItem value="SUBSCRIBER">Prospect</SelectItem>
                          <SelectItem value="LEAD">Lead</SelectItem>
                          <SelectItem value="MQL">Trial</SelectItem>
                          <SelectItem value="SQL">Onboarding</SelectItem>
                          <SelectItem value="OPPORTUNITY">
                            Ready to Join
                          </SelectItem>
                          <SelectItem value="CUSTOMER">
                            Active Member
                          </SelectItem>
                          <SelectItem value="EVANGELIST">Ambassador</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Acquisition stage + Birthday */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="acquisitionStage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Acquisition stage
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          <SelectItem value="INQUIRY">Inquiry</SelectItem>
                          <SelectItem value="TRIAL">Trial</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="LOST">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Birthday
                      </FormLabel>
                      <FormControl>
                        <DatePicker
                          date={parseDateValue(field.value)}
                          onSelect={(date) =>
                            field.onChange(formatDateValue(date))
                          }
                          placeholder="Pick a birthday"
                          ariaLabel="Birthday"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75">
                      Tags
                    </FormLabel>
                    <FormControl>
                      <TagsInput
                        value={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="vip, intro, at-risk..."
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* City + Country */}
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
                        <Input
                          placeholder="London"
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
                        <Input
                          placeholder="United Kingdom"
                          className="border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Source + LinkedIn */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Source
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Referral, Instagram, Walk-in..."
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
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        LinkedIn
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://linkedin.com/in/..."
                          className="bg-background border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Emergency contact */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Emergency contact
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jane Doe"
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
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Emergency phone
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1 555 123 4567"
                          className="border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Health Notes + Contraindications */}
              <FormField
                control={form.control}
                name="healthNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75">
                      Health notes
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Injuries, conditions, limitations..."
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
                name="contraindications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75">
                      Contraindications
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Exercises or movements to avoid..."
                        className="border-black/10 dark:border-white/5 text-primary text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* VIP checkbox */}
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
                    <FormLabel className="text-xs text-primary/75 !mt-0">
                      VIP / Trusted member (skip cancellation fees, priority
                      waitlist)
                    </FormLabel>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Instructor assignment */}
              <FormField
                control={form.control}
                name="instructorIds"
                render={({ field }) => {
                  const selectedInstructors = instructorsData?.filter((i) =>
                    field.value?.includes(i.id),
                  );
                  return (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75">
                        Assigned instructors
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-between text-xs h-10 bg-background hover:bg-primary-foreground/75 text-primary hover:text-primary px-2 rounded-sm"
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
                                          className="size-6"
                                        >
                                          {instructor.image ? (
                                            <AvatarImage
                                              src={instructor.image}
                                              alt={instructor.name}
                                            />
                                          ) : (
                                            <AvatarFallback className="bg-[#202e32] text-white text-[10px] rounded-sm">
                                              {(
                                                instructor.name?.[0] ?? "U"
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
                            {instructorsData && instructorsData.length > 0 ? (
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
                                    <Avatar className="size-7">
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
                      <FormMessage className="text-xs" />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 px-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={createClient.isPending}
                className="bg-rose-500 text-rose-100 hover:bg-rose-500/95 hover:text-white text-xs rounded-lg border border-black/10 dark:border-white/5 transition duration-150"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createClient.isPending}
                className="bg-background hover:bg-primary-foreground/50 hover:text-black text-xs rounded-lg border border-black/10 dark:border-white/5 transition duration-150"
              >
                {createClient.isPending ? "Creating..." : "Add member"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
