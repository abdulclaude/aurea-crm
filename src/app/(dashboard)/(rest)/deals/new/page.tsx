"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { useTRPC } from "@/trpc/client";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  contactIds: z.array(z.string()).min(1, "At least one contact is required"),
  pipelineId: z.string().optional(),
  pipelineStageId: z.string().optional(),
  value: z.string().optional(),
  currency: z.string().optional(),
  deadline: z.date().optional(),
  source: z.string().optional(),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewDealPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const { data: contactCount, isLoading: isLoadingContacts } = useQuery(
    trpc.contacts.count.queryOptions()
  );

  const { data: contactsData, isLoading: isLoadingContactsList } = useQuery(
    trpc.contacts.list.queryOptions()
  );

  const { data: pipelinesData, isLoading: isLoadingPipelines } = useQuery(
    trpc.pipelines.list.queryOptions()
  );

  const { data: membersData, isLoading: isLoadingMembers } = useQuery(
    trpc.organizations.listSubaccountMembers.queryOptions()
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contactIds: [],
      pipelineId: "",
      pipelineStageId: "",
      value: "",
      currency: "USD",
      deadline: undefined,
      source: "",
      description: "",
      memberIds: [],
    },
  });

  const selectedPipelineId = form.watch("pipelineId");
  const selectedPipeline = pipelinesData?.items.find(
    (p) => p.id === selectedPipelineId
  );

  // Auto-select first stage when pipeline changes
  React.useEffect(() => {
    if (selectedPipeline && selectedPipeline.stages.length > 0) {
      form.setValue("pipelineStageId", selectedPipeline.stages[0].id);
    }
  }, [selectedPipeline, form]);

  const createDeal = useMutation(
    trpc.deals.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Deal created successfully");
        router.push("/deals");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create deal");
      },
    })
  );

  const onSubmit = async (values: FormValues) => {
    const clean = {
      name: values.name.trim(),
      contactIds: values.contactIds,
      pipelineId: values.pipelineId?.trim() || undefined,
      pipelineStageId: values.pipelineStageId?.trim() || undefined,
      value: values.value?.trim()
        ? Number.parseFloat(values.value.trim())
        : undefined,
      currency: values.currency?.trim() ? values.currency.trim() : undefined,
      deadline: values.deadline,
      source: values.source?.trim() ? values.source.trim() : undefined,
      description: values.description?.trim()
        ? values.description.trim()
        : undefined,
      memberIds:
        values.memberIds && values.memberIds.length > 0
          ? values.memberIds
          : undefined,
    };

    await createDeal.mutateAsync(clean);
  };

  if (
    isLoadingContacts ||
    isLoadingContactsList ||
    isLoadingPipelines ||
    isLoadingMembers
  ) {
    return (
      <div className="flex items-center justify-center gap-3 py-12">
        <LoaderCircle className="size-4 animate-spin text-white/70" />
        <span className="text-sm text-white/70">Loading...</span>
      </div>
    );
  }

  if (!contactCount || contactCount === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-2 p-6 pb-0">
          <div>
            <h1 className="text-lg font-semibold text-primary dark:text-white">
              Create Deal
            </h1>
            <p className="text-xs text-primary/75 dark:text-white/50">
              Add a new deal to your client workspace.
            </p>
          </div>
        </div>

        <Separator className="bg-white/5" />

        <div className="py-12 px-6 text-center space-y-4">
          <p className="text-sm text-primary/75 dark:text-white/50">
            Cannot make any deals until a contact has been created.
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-xs rounded-sm border border-black/10 dark:border-white/5 bg-background hover:bg-primary-foreground/25 hover:text-black font-normal transition duration-150"
            >
              Go back
            </Button>
            <Button
              asChild
              className="text-xs rounded-sm border border-black/10 dark:border-white/5 bg-primary-foreground hover:bg-primary-foreground/25 hover:text-black text-primary transition duration-150"
            >
              <Link href="/contacts/new">Create contact</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const selectedContactId = form.watch("contactIds")?.[0];
  const selectedContact = contactsData?.items.find(
    (c) => c.id === selectedContactId
  );

  const selectedMemberIds = form.watch("memberIds") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary dark:text-white">
            Create Deal
          </h1>
          <p className="text-xs text-primary/75 dark:text-white/50">
            Add a new deal to your client workspace.
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-white/5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                      Deal name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Q1 Partnership Deal"
                        className="bg-background border-black/10 dark:border-white/5 text-primary text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name="contactIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Contact
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange([value]);
                        }}
                        value={field.value?.[0]}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            {selectedContact ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="size-5">
                                  <AvatarImage
                                    src={selectedContact.logo || undefined}
                                  />
                                  <AvatarFallback className="text-[10px] bg-[#202e32]">
                                    {selectedContact.name
                                      .substring(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex flex-col items-start">
                                  <span className="text-xs text-primary">
                                    {selectedContact.name}
                                  </span>
                                  {selectedContact.email && (
                                    <span className="text-[10px] text-primary/75 dark:text-white/50">
                                      {selectedContact.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <SelectValue placeholder="Select contact" />
                            )}
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          {contactsData?.items.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="size-6">
                                  <AvatarImage
                                    src={contact.logo || undefined}
                                  />
                                  <AvatarFallback className="text-[10px] bg-[#202e32] text-white">
                                    {contact.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start">
                                  <span className="text-xs text-primary">
                                    {contact.name}
                                  </span>
                                  {contact.email && (
                                    <span className="text-[10px] text-primary/75 dark:text-white/50">
                                      {contact.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="memberIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Assignee (Optional)
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          // Toggle selection
                          const currentIds = field.value || [];
                          if (currentIds.includes(value)) {
                            field.onChange(
                              currentIds.filter((id) => id !== value)
                            );
                          } else {
                            field.onChange([...currentIds, value]);
                          }
                        }}
                        value={selectedMemberIds[selectedMemberIds.length - 1]}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            {selectedMemberIds.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                  {selectedMemberIds
                                    .slice(0, 3)
                                    .map((memberId) => {
                                      const member = membersData?.find(
                                        (m) => m.id === memberId
                                      );
                                      if (!member) return null;
                                      return (
                                        <Avatar
                                          key={member.id}
                                          className="size-5 border border-[#1a2326]"
                                        >
                                          <AvatarImage
                                            src={member.image || undefined}
                                          />
                                          <AvatarFallback className="text-[10px] bg-[#202e32] text-white">
                                            {member.name
                                              ?.substring(0, 2)
                                              .toUpperCase() || "??"}
                                          </AvatarFallback>
                                        </Avatar>
                                      );
                                    })}
                                </div>

                                <span className="text-xs text-primary">
                                  {selectedMemberIds.length === 1
                                    ? membersData?.find(
                                        (m) => m.id === selectedMemberIds[0]
                                      )?.name
                                    : `${selectedMemberIds.length} assignees`}
                                </span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Select assignee" />
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          {membersData?.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="size-6">
                                  <AvatarImage
                                    src={member.image || undefined}
                                  />
                                  <AvatarFallback className="text-[10px] bg-[#202e32] text-white">
                                    {member.name
                                      ?.substring(0, 2)
                                      .toUpperCase() || "??"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start">
                                  <span className="text-xs text-primary">
                                    {member.name || "Unknown"}
                                  </span>
                                  {member.email && (
                                    <span className="text-[10px] text-primary/75 dark:text-white/50">
                                      {member.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pipelineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Pipeline
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select pipeline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          {pipelinesData?.items.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                              {pipeline.isDefault && " (Default)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pipelineStageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Stage
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedPipeline}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          {selectedPipeline?.stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name} ({stage.probability}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Deal value
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="10000"
                          className="bg-background border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Currency
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="USD"
                          className="bg-background border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Deadline
                      </FormLabel>

                      <DatePicker
                        date={field.value}
                        onSelect={field.onChange}
                        placeholder="Select deadline"
                      />
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Source
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Referral"
                          className="bg-background border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional details about this deal..."
                        className="bg-background border-black/10 dark:border-white/5 text-primary text-xs min-h-30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 px-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={createDeal.isPending}
                className="bg-rose-500 text-rose-100 hover:bg-rose-500/95 hover:text-white text-xs rounded-sm border border-black/10 dark:border-white/5 transition duration-150"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={createDeal.isPending}
                className="bg-background hover:bg-primary-foreground/50 hover:text-black text-xs rounded-sm border border-black/10 dark:border-white/5 transition duration-150"
              >
                {createDeal.isPending ? "Creating..." : "Create Deal"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
