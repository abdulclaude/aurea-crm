"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarIcon, DollarSignIcon, TagIcon, UserIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DatePicker } from "@/components/ui/date-picker";
import { useTRPC } from "@/trpc/client";
import { formatCurrency } from "@/features/crm/lib/currency";
import { NotesPanel } from "@/features/crm/components/notes-panel";

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar", symbol: "$" },
  { value: "GBP", label: "GBP - British Pound", symbol: "£" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "CAD", label: "CAD - Canadian Dollar", symbol: "C$" },
  { value: "AUD", label: "AUD - Australian Dollar", symbol: "A$" },
  { value: "JPY", label: "JPY - Japanese Yen", symbol: "¥" },
  { value: "INR", label: "INR - Indian Rupee", symbol: "₹" },
];

const dealFormSchema = z.object({
  name: z.string().min(1, "Deal name is required"),
  pipelineId: z.string().optional(),
  pipelineStageId: z.string().optional(),
  value: z.number().min(0, "Value must be positive").optional(),
  currency: z.string().optional(),
  deadline: z.date().optional(),
  source: z.string().optional(),
  tags: z.string().optional(),
  description: z.string().optional(),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

export default function DealDetailPage() {
  const params = useParams<{ dealId: string }>();
  const router = useRouter();
  const trpc = useTRPC();

  const { data: deal } = useSuspenseQuery(
    trpc.deals.getById.queryOptions({ id: params.dealId }),
  );

  const { data: pipelines } = useSuspenseQuery(
    trpc.pipelines.list.queryOptions(),
  );

  const { data: membersData } = useQuery(
    trpc.clients.getLocationMembers.queryOptions(),
  );

  const selectedPipeline = React.useMemo(() => {
    if (!deal.pipelineId) return null;
    return pipelines.items.find((p) => p.id === deal.pipelineId);
  }, [deal.pipelineId, pipelines.items]);

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      name: deal.name,
      pipelineId: deal.pipelineId || undefined,
      pipelineStageId: deal.pipelineStageId || undefined,
      value: deal.value ? Number(deal.value) : undefined,
      currency: deal.currency || "USD",
      deadline: deal.deadline ? new Date(deal.deadline) : undefined,
      source: deal.source || "",
      tags: deal.tags?.join(", ") || "",
      description: deal.description || "",
    },
  });

  const watchedPipelineId = form.watch("pipelineId");

  const availableStages = React.useMemo(() => {
    if (!watchedPipelineId) return [];
    const pipeline = pipelines.items.find((p) => p.id === watchedPipelineId);
    return pipeline?.stages || [];
  }, [watchedPipelineId, pipelines.items]);

  const updateDeal = useMutation(
    trpc.deals.update.mutationOptions({
      onSuccess: () => {
        toast.success("Deal updated successfully");
        router.push("/deals");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update deal");
      },
    }),
  );

  const onSubmit = async (data: DealFormValues) => {
    await updateDeal.mutateAsync({
      id: params.dealId,
      name: data.name,
      pipelineId: data.pipelineId || null,
      pipelineStageId: data.pipelineStageId || null,
      value: data.value,
      currency: data.currency,
      deadline: data.deadline || null,
      source: data.source,
      tags: data.tags
        ? data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      description: data.description,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary dark:text-primary">
            Edit deal
          </h1>
          <p className="text-xs text-primary/75 dark:text-white/50">
            Update deal information and track progress.
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-black/5 dark:border-white/5">
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
                        placeholder="e.g., Acme Corp - Enterprise Plan..."
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a short summary for this deal..."
                        className="border-black/10 dark:border-white/5 text-primary text-xs resize-none"
                        rows={3}
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
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Deal value
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          className="border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(
                              val === "" ? undefined : Number.parseFloat(val),
                            );
                          }}
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          {CURRENCIES.map((currency) => (
                            <SelectItem
                              key={currency.value}
                              value={currency.value}
                              className="text-xs"
                            >
                              {currency.label}
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
                          placeholder="e.g., Website, Referral..."
                          className="border-black/10 dark:border-white/5 text-primary text-xs"
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
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                      Tags
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., enterprise, hot-lead, q4-target (comma-separated)"
                        className="border-black/10 dark:border-white/5 text-primary text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-[10px] text-primary/50 dark:text-white/50">
                      Separate tags with commas
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Pipeline & Stage */}
            <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-black/5 dark:border-white/5">
              <div>
                <h2 className="text-sm font-medium text-primary dark:text-primary">
                  Pipeline & stage
                </h2>
                <p className="text-[11px] text-primary/75 dark:text-white/50 mt-1">
                  Assign this deal to a pipeline and stage.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pipelineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Pipeline
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("pipelineStageId", undefined);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select pipeline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          {pipelines.items.map((pipeline) => (
                            <SelectItem
                              key={pipeline.id}
                              value={pipeline.id}
                              className="text-xs"
                            >
                              {pipeline.name}
                              {pipeline.isDefault && (
                                <span className="ml-2 text-[10px] uppercase bg-blue-500/20 text-blue-600 dark:text-blue-200 px-1.5 py-0.5 rounded-sm">
                                  Default
                                </span>
                              )}
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
                        disabled={
                          !watchedPipelineId || availableStages.length === 0
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          {availableStages.map((stage: any) => (
                            <SelectItem
                              key={stage.id}
                              value={stage.id}
                              className="text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="size-2 rounded-full"
                                  style={{
                                    backgroundColor: stage.color || "#6366f1",
                                  }}
                                />
                                <span>{stage.name}</span>
                                <span className="text-primary/50 dark:text-white/50">
                                  ({stage.probability}%)
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Associated Members & Instructors */}
            <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-black/5 dark:border-white/5">
              <div>
                <h2 className="text-sm font-medium text-primary dark:text-primary">
                  Associated members & instructors
                </h2>
                <p className="text-[11px] text-primary/75 dark:text-white/50 mt-1">
                  Clients and instructors related to this deal.
                </p>
              </div>

              {deal.clients && deal.clients.length > 0 && (
                <div>
                  <label className="text-xs text-primary/75 dark:text-white/50 block mb-3">
                    <UserIcon className="size-3 inline mr-1" />
                    Clients
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {deal.clients.map((client) => (
                      <Badge
                        key={client.id}
                        variant="outline"
                        className="border-black/10 dark:border-white/10 text-primary text-xs px-3 py-1.5"
                      >
                        {client.name}
                        {client.companyName && (
                          <span className="text-primary/50 dark:text-white/50 ml-1">
                            ({client.companyName})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {deal.members && deal.members.length > 0 && (
                <div>
                  <label className="text-xs text-primary/75 dark:text-white/50 block mb-3">
                    Instructors
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {deal.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2"
                      >
                        <Avatar className="size-6">
                          <AvatarImage src={member.image || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {member.name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-xs text-primary">
                            {member.name}
                          </span>
                          {member.email && (
                            <span className="text-[10px] text-primary/50 dark:text-white/50">
                              {member.email}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="p-6 pt-0">
              <div className="border border-black/5 dark:border-white/5 rounded-lg p-4">
                <h3 className="text-xs font-medium text-primary/70 dark:text-white/70 mb-3">
                  Metadata
                </h3>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-primary/50 dark:text-white/50">
                      Created:
                    </span>
                    <span className="text-primary dark:text-white ml-2">
                      {new Date(deal.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-primary/50 dark:text-white/50">
                      Last Updated:
                    </span>
                    <span className="text-primary dark:text-white ml-2">
                      {new Date(deal.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {deal.lastActivityAt && (
                    <div>
                      <span className="text-primary/50 dark:text-white/50">
                        Last Activity:
                      </span>
                      <span className="text-primary dark:text-white ml-2">
                        {new Date(deal.lastActivityAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {deal.value && deal.currency && (
                    <div>
                      <span className="text-primary/50 dark:text-white/50">
                        Value:
                      </span>
                      <span className="text-primary dark:text-white ml-2 font-medium">
                        {formatCurrency(Number(deal.value), deal.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6">
              <div>
                <h2 className="text-sm font-medium text-primary dark:text-primary">
                  Notes
                </h2>
                <p className="text-[11px] text-primary/75 dark:text-white/50 mt-1">
                  Add timestamped notes, mention teammates, and pin updates.
                </p>
              </div>
              <NotesPanel dealId={deal.id} members={membersData ?? []} />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 px-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={updateDeal.isPending}
                className="bg-rose-500 text-rose-100 hover:bg-rose-500/95 hover:text-white text-xs rounded-lg border border-black/10 dark:border-white/5 transition duration-150"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={updateDeal.isPending}
                className="bg-background hover:bg-primary-foreground/50 hover:text-black text-xs rounded-lg border border-black/10 dark:border-white/5 transition duration-150"
              >
                {updateDeal.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
