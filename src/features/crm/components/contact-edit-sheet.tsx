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
import { Textarea } from "@/components/ui/textarea";
import { ContactType, LifecycleStage } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { ContactMindbodySection } from "./contact-mindbody-section";

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
  type: z.enum(Object.values(ContactType) as [string, ...string[]]).optional(),
  lifecycleStage: z
    .enum(Object.values(LifecycleStage) as [string, ...string[]])
    .optional(),
  source: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ContactEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
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
    type: ContactType;
    lifecycleStage?: LifecycleStage | null;
    source?: string | null;
    website?: string | null;
    linkedin?: string | null;
    tags: string[];
    notes?: string | null;
    metadata?: unknown;
    assignees: Array<{ id: string; name: string | null; image: string | null }>;
  };
}

export function ContactEditSheet({
  open,
  onOpenChange,
  contact,
}: ContactEditSheetProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: membersData } = useQuery(
    trpc.contacts.getSubaccountMembers.queryOptions()
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: contact.name,
      logo: contact.logo ?? "",
      companyName: contact.companyName ?? "",
      email: contact.email ?? "",
      position: contact.position ?? "",
      phone: contact.phone ?? "",
      country: contact.country ?? "",
      city: contact.city ?? "",
      score: contact.score?.toString() ?? "",
      type: contact.type,
      lifecycleStage: contact.lifecycleStage ?? "",
      source: contact.source ?? "",
      website: contact.website ?? "",
      linkedin: contact.linkedin ?? "",
      tags: contact.tags ?? [],
      notes: contact.notes ?? "",
      assigneeIds: contact.assignees.map((a) => a.id),
    },
  });

  // Reset form when contact changes
  useEffect(() => {
    form.reset({
      name: contact.name,
      logo: contact.logo ?? "",
      companyName: contact.companyName ?? "",
      email: contact.email ?? "",
      position: contact.position ?? "",
      phone: contact.phone ?? "",
      country: contact.country ?? "",
      city: contact.city ?? "",
      score: contact.score?.toString() ?? "",
      type: contact.type,
      lifecycleStage: contact.lifecycleStage ?? "",
      source: contact.source ?? "",
      website: contact.website ?? "",
      linkedin: contact.linkedin ?? "",
      tags: contact.tags ?? [],
      notes: contact.notes ?? "",
      assigneeIds: contact.assignees.map((a) => a.id),
    });
  }, [contact, form]);

  const updateContact = useMutation(
    trpc.contacts.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        onOpenChange(false);
      },
    })
  );

  const onSubmit = async (values: FormValues) => {
    const clean = {
      id: contact.id,
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
      type: values.type as ContactType | undefined,
      lifecycleStage: values.lifecycleStage as LifecycleStage | undefined,
      source: values.source?.trim() ? values.source.trim() : undefined,
      website: values.website?.trim() ? values.website.trim() : undefined,
      linkedin: values.linkedin?.trim() ? values.linkedin.trim() : undefined,
      tags: values.tags,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
      assigneeIds: values.assigneeIds,
    };

    await updateContact.mutateAsync(clean);
  };

  const [tagInput, setTagInput] = useState("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader className="p-0">
        <SheetTitle className="text-xs hidden">Edit Contact</SheetTitle>
      </SheetHeader>

      <SheetContent className="flex flex-col gap-0 bg-background border-black/5 dark:border-white/5 sm:max-w-xl text-primary w-full">
        <div className="flex-1 overflow-y-auto">
          <Accordion type="single" collapsible>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-0 pb-4"
              >
                <AccordionItem value="company-info">
                  <AccordionTrigger>Company Info</AccordionTrigger>

                  <AccordionContent className="px-6 space-y-6 pb-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Contact name
                          </FormLabel>

                          <FormControl>
                            <Input
                              placeholder="John Doe"
                              className="rounded-xs"
                              {...field}
                            />
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
                              <Input placeholder="+44 7123 456789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Company name
                            </FormLabel>

                            <FormControl>
                              <Input placeholder="Acme Inc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ">Position</FormLabel>
                            <FormControl>
                              <Input placeholder="CEO" {...field} />
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
                            <FormLabel className="text-xs ">Country</FormLabel>
                            <FormControl>
                              <Input placeholder="United Kingdom" {...field} />
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

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Website</FormLabel>

                            <FormControl>
                              <Input
                                placeholder="https://example.com"
                                className="w-full"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ">Source</FormLabel>
                            <FormControl>
                              <Input placeholder="Referral" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="contact-info">
                  <AccordionTrigger>Contact Info</AccordionTrigger>
                  <AccordionContent className="px-6 space-y-4 pb-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Contact type
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
                                <SelectItem value={ContactType.LEAD}>
                                  Lead
                                </SelectItem>
                                <SelectItem value={ContactType.PROSPECT}>
                                  Prospect
                                </SelectItem>
                                <SelectItem value={ContactType.CUSTOMER}>
                                  Customer
                                </SelectItem>
                                <SelectItem value={ContactType.CHURN}>
                                  Churn
                                </SelectItem>
                                <SelectItem value={ContactType.CLOSED}>
                                  Closed
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                                <SelectItem value={LifecycleStage.SUBSCRIBER}>
                                  Subscriber
                                </SelectItem>
                                <SelectItem value={LifecycleStage.LEAD}>
                                  Lead
                                </SelectItem>
                                <SelectItem value={LifecycleStage.MQL}>
                                  MQL
                                </SelectItem>
                                <SelectItem value={LifecycleStage.SQL}>
                                  SQL
                                </SelectItem>
                                <SelectItem value={LifecycleStage.OPPORTUNITY}>
                                  Opportunity
                                </SelectItem>
                                <SelectItem value={LifecycleStage.CUSTOMER}>
                                  Customer
                                </SelectItem>
                                <SelectItem value={LifecycleStage.EVANGELIST}>
                                  Evangelist
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Mindbody Integration Section */}
                <ContactMindbodySection contact={contact} />

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
                            []
                        );
                      };

                      return (
                        <FormItem>
                          <FormLabel className="text-xs">Tags</FormLabel>
                          <FormControl>
                            <Tags>
                              <TagsTrigger>
                                {field.value && field.value.length > 0
                                  ? field.value.map((tag) => (
                                      <TagsValue
                                        key={tag}
                                        onRemove={() => handleRemoveTag(tag)}
                                      >
                                        {tag}
                                      </TagsValue>
                                    ))
                                  : null}
                              </TagsTrigger>

                              <TagsContent align="start">
                                <TagsSearchInput
                                  placeholder="Type to add tag..."
                                  className="text-xs text-white"
                                  value={tagInput}
                                  onValueChange={setTagInput}
                                  onKeyDown={(
                                    e: React.KeyboardEvent<HTMLInputElement>
                                  ) => {
                                    if (e.key === "Enter" && tagInput.trim()) {
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
                                        className="cursor-pointer px-4 py-1.5! h-max! text-xs text-primary hover:text-primary bg-primary-foreground/50 hover:bg-primary-foreground/75 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
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
                                        <p className="mb-2 text-[10px] text-primary/80 dark:text-white/50 uppercase tracking-wide">
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
                    name="assigneeIds"
                    render={({ field }) => {
                      const selectedMembers = membersData?.filter((m) =>
                        field.value?.includes(m.id)
                      );
                      return (
                        <FormItem>
                          <FormLabel className="text-xs ">
                            Assigned members
                          </FormLabel>

                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full justify-between text-xs h-10 bg-background hover:bg-primary-foreground/75 text-primary hover:text-primary px-2 rounded-sm"
                                >
                                  {selectedMembers &&
                                  selectedMembers.length > 0 ? (
                                    <div className="flex items-center gap-2">
                                      <div className="flex -space-x-2">
                                        {selectedMembers
                                          .slice(0, 3)
                                          .map((member) => (
                                            <Avatar
                                              key={member.id}
                                              className="size-6 "
                                            >
                                              {member.image ? (
                                                <AvatarImage
                                                  src={member.image}
                                                  alt={member.name}
                                                />
                                              ) : (
                                                <AvatarFallback className="bg-[#202e32] text-white text-[10px] rounded-sm">
                                                  {(
                                                    member.name?.[0] ?? "U"
                                                  ).toUpperCase()}
                                                </AvatarFallback>
                                              )}
                                            </Avatar>
                                          ))}
                                      </div>
                                      <span className="text-xs">
                                        {selectedMembers.length === 1
                                          ? selectedMembers[0].name
                                          : `${selectedMembers.length} members selected`}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-primary px-2 dark:text-white/50 text-xs">
                                      Select members
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
                                {membersData && membersData.length > 0 ? (
                                  membersData.map((member) => {
                                    const isSelected = field.value?.includes(
                                      member.id
                                    );
                                    return (
                                      <button
                                        key={member.id}
                                        type="button"
                                        className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left hover:bg-primary-foreground/75 text-primary hover:text-primary transition"
                                        onClick={() => {
                                          const current = field.value ?? [];
                                          if (isSelected) {
                                            field.onChange(
                                              current.filter(
                                                (id) => id !== member.id
                                              )
                                            );
                                          } else {
                                            field.onChange([
                                              ...current,
                                              member.id,
                                            ]);
                                          }
                                        }}
                                      >
                                        <div
                                          className={cn(
                                            "flex size-4 shrink-0 items-center justify-center rounded-xs border border-black/10 dark:border-white/5",
                                            isSelected
                                              ? "bg-background text-primary"
                                              : "bg-background"
                                          )}
                                        >
                                          {isSelected && (
                                            <CheckIcon className="size-3" />
                                          )}
                                        </div>

                                        <Avatar className="size-7 ">
                                          {member.image ? (
                                            <AvatarImage
                                              src={member.image}
                                              alt={member.name}
                                            />
                                          ) : (
                                            <AvatarFallback className="bg-[#202e32] brightness-120 text-[11px] text-white">
                                              {(
                                                member.name?.[0] ?? "U"
                                              ).toUpperCase()}
                                            </AvatarFallback>
                                          )}
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-primary dark:text-white truncate">
                                            {member.name}
                                          </p>
                                          <p className="text-[11px] text-primary/50 dark:text-white/50 truncate">
                                            {member.email ?? "No email"}
                                          </p>
                                        </div>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <p className="text-xs text-primary/50 dark:text-white/50 p-2">
                                    No members available
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

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs ">Note</FormLabel>

                        <FormControl>
                          <Textarea
                            placeholder="Add any additional notes about this contact..."
                            className="min-h-[100px] "
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </Accordion>
        </div>

        <SheetFooter className="pb-6 w-full">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-rose-500  text-rose-100 hover:bg-rose-500/95 hover:text-white text-xs rounded-sm border border-black/10 dark:border-white/5 transition duration-150"
          >
            Cancel
          </Button>

          <Button
            onClick={form.handleSubmit(onSubmit)}
            type="submit"
            disabled={updateContact.isPending}
            className="flex-1 bg-background hover:bg-primary-foreground/50 hover:text-black text-xs rounded-sm border border-black/10 dark:border-white/5 transition duration-150"
          >
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
