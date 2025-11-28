"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
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
  tags: z.string().optional(), // Comma-separated string for easier form handling
  description: z.string().optional(),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

export default function DealDetailPage() {
  const params = useParams<{ dealId: string }>();
  const router = useRouter();
  const trpc = useTRPC();

  const { data: deal } = useSuspenseQuery(
    trpc.deals.getById.queryOptions({ id: params.dealId })
  );

  const { data: pipelines } = useSuspenseQuery(
    trpc.pipelines.list.queryOptions()
  );

  // Get the stages for the selected pipeline
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

  // Update stages when pipeline changes
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
    })
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
        ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      description: data.description,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-white">Edit Deal</h1>
          <p className="text-xs text-white/50">
            Update deal information and track progress.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-xs rounded-xs text-white/50 hover:text-white"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>

      <Separator className="bg-white/5" />

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
                    <FormLabel className="text-xs text-white/50">
                      Deal Name
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder="e.g., Acme Corp - Enterprise Plan..."
                        className="bg-[#202e32] border-white/5 text-white text-xs autofill-off"
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
                    <FormLabel className="text-xs text-white/50">
                      Description (Optional)
                    </FormLabel>

                    <FormControl>
                      <Textarea
                        placeholder="Add notes about this deal..."
                        className="bg-[#202e32] border-white/5 text-white text-xs resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white/50">
                        <DollarSignIcon className="size-3 inline mr-1" />
                        Deal Value
                      </FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          className="bg-[#202e32] border-white/5 text-white text-xs"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === "" ? undefined : Number.parseFloat(val));
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
                      <FormLabel className="text-xs text-white/50">
                        Currency
                      </FormLabel>

                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-[#202e32] border-white/5 text-white text-xs">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#202e32] border-white/5">
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white/50">
                        <CalendarIcon className="size-3 inline mr-1" />
                        Deadline (Optional)
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
                      <FormLabel className="text-xs text-white/50">
                        Source (Optional)
                      </FormLabel>

                      <FormControl>
                        <Input
                          placeholder="e.g., Website, Referral..."
                          className="bg-[#202e32] border-white/5 text-white text-xs"
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
                    <FormLabel className="text-xs text-white/50">
                      <TagIcon className="size-3 inline mr-1" />
                      Tags (Optional)
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder="e.g., enterprise, hot-lead, q4-target (comma-separated)"
                        className="bg-[#202e32] border-white/5 text-white text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-[10px] text-white/50">
                      Separate tags with commas
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Pipeline & Stage */}
            <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-white/5">
              <div>
                <h2 className="text-sm font-medium text-white">
                  Pipeline & Stage
                </h2>
                <p className="text-[11px] text-white/50 mt-1">
                  Assign this deal to a pipeline and stage.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pipelineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white/50">
                        Pipeline
                      </FormLabel>

                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset stage when pipeline changes
                          form.setValue("pipelineStageId", undefined);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-[#202e32] border-white/5 text-white text-xs">
                            <SelectValue placeholder="Select pipeline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#202e32] border-white/5">
                          {pipelines.items.map((pipeline) => (
                            <SelectItem
                              key={pipeline.id}
                              value={pipeline.id}
                              className="text-xs"
                            >
                              {pipeline.name}
                              {pipeline.isDefault && (
                                <span className="ml-2 text-[10px] uppercase bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded-sm">
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
                      <FormLabel className="text-xs text-white/50">
                        Stage
                      </FormLabel>

                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!watchedPipelineId || availableStages.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-[#202e32] border-white/5 text-white text-xs">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#202e32] border-white/5">
                          {availableStages.map((stage: any) => (
                            <SelectItem
                              key={stage.id}
                              value={stage.id}
                              className="text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: stage.color || "#6366f1" }}
                                />
                                <span>{stage.name}</span>
                                <span className="text-white/50">
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

            {/* Associated Contacts & Members */}
            <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-white/5">
              <div>
                <h2 className="text-sm font-medium text-white">
                  Associated Contacts & Members
                </h2>
                <p className="text-[11px] text-white/50 mt-1">
                  People and team members related to this deal.
                </p>
              </div>

              {/* Contacts */}
              {deal.contacts && deal.contacts.length > 0 && (
                <div>
                  <label className="text-xs text-white/50 block mb-3">
                    <UserIcon className="size-3 inline mr-1" />
                    Contacts
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {deal.contacts.map((contact) => (
                      <Badge
                        key={contact.id}
                        variant="outline"
                        className="bg-[#202e32]/40 border-white/10 text-white text-xs px-3 py-1.5"
                      >
                        {contact.name}
                        {contact.companyName && (
                          <span className="text-white/50 ml-1">
                            ({contact.companyName})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Members */}
              {deal.members && deal.members.length > 0 && (
                <div>
                  <label className="text-xs text-white/50 block mb-3">
                    Team Members
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {deal.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 bg-[#202e32]/40 border border-white/10 rounded-xs px-3 py-2"
                      >
                        <Avatar className="size-6">
                          <AvatarImage src={member.image || undefined} />
                          <AvatarFallback className="bg-[#202e32] text-white text-[10px]">
                            {member.name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-xs text-white">{member.name}</span>
                          {member.email && (
                            <span className="text-[10px] text-white/50">
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
              <div className="bg-[#202e32]/20 border border-white/5 rounded-xs p-4">
                <h3 className="text-xs font-medium text-white/70 mb-3">
                  Metadata
                </h3>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-white/50">Created:</span>
                    <span className="text-white ml-2">
                      {new Date(deal.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/50">Last Updated:</span>
                    <span className="text-white ml-2">
                      {new Date(deal.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {deal.lastActivityAt && (
                    <div>
                      <span className="text-white/50">Last Activity:</span>
                      <span className="text-white ml-2">
                        {new Date(deal.lastActivityAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {deal.value && deal.currency && (
                    <div>
                      <span className="text-white/50">Value:</span>
                      <span className="text-white ml-2 font-medium">
                        {formatCurrency(Number(deal.value), deal.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 px-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={updateDeal.isPending}
                className="text-xs rounded-xs hover:bg-[#202e32] hover:text-white font-normal hover:brightness-110!"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={updateDeal.isPending}
                className="text-xs rounded-xs bg-[#202e32] brightness-110 hover:brightness-120! text-white"
              >
                {updateDeal.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
