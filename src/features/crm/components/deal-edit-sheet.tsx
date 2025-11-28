"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TagsInput } from "@/components/ui/tags-input";
import type { Prisma } from "@/generated/prisma/client";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  contactIds: z.array(z.string()).min(1, "At least one contact is required"),
  pipelineId: z.string().optional(),
  pipelineStageId: z.string().optional(),
  value: z.string().optional(),
  currency: z.string().optional(),
  deadline: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DealEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: {
    id: string;
    name: string;
    pipelineId?: string | null;
    pipelineStageId?: string | null;
    pipeline?: { id: string; name: string } | null;
    pipelineStage?: { id: string; name: string; probability: number } | null;
    value?: Prisma.Decimal | number | null;
    currency?: string | null;
    deadline?: Date | null;
    source?: string | null;
    tags: string[];
    description?: string | null;
    contacts: Array<{ id: string; name: string }>;
  };
}

export function DealEditSheet({
  open,
  onOpenChange,
  deal,
}: DealEditSheetProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: contactsData } = useQuery(trpc.contacts.list.queryOptions());
  const { data: pipelinesData } = useQuery(trpc.pipelines.list.queryOptions());

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: deal.name,
      contactIds: deal.contacts.map((c) => c.id),
      pipelineId: deal.pipelineId ?? "",
      pipelineStageId: deal.pipelineStageId ?? "",
      value:
        deal.value !== null && deal.value !== undefined
          ? typeof deal.value === "number"
            ? deal.value.toString()
            : deal.value.toString()
          : "",
      currency: deal.currency ?? "USD",
      deadline: deal.deadline
        ? new Date(deal.deadline).toISOString().split("T")[0]
        : "",
      source: deal.source ?? "",
      tags: deal.tags ?? [],
      description: deal.description ?? "",
    },
  });

  const selectedPipelineId = form.watch("pipelineId");
  const selectedPipeline = pipelinesData?.items.find(
    (p) => p.id === selectedPipelineId
  );

  // Auto-select first stage when pipeline changes
  React.useEffect(() => {
    if (selectedPipeline && selectedPipeline.stages.length > 0) {
      const currentStageId = form.getValues("pipelineStageId");
      const isValidStage = selectedPipeline.stages.some(
        (s) => s.id === currentStageId
      );
      if (!isValidStage) {
        form.setValue("pipelineStageId", selectedPipeline.stages[0].id);
      }
    }
  }, [selectedPipelineId, selectedPipeline, form]);

  const updateDeal = useMutation(
    trpc.deals.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        onOpenChange(false);
      },
    })
  );

  const onSubmit = async (values: FormValues) => {
    const clean = {
      id: deal.id,
      name: values.name.trim(),
      contactIds: values.contactIds,
      pipelineId: values.pipelineId?.trim() || null,
      pipelineStageId: values.pipelineStageId?.trim() || null,
      value: values.value?.trim()
        ? Number.parseFloat(values.value.trim())
        : undefined,
      currency: values.currency?.trim() ? values.currency.trim() : undefined,
      deadline: values.deadline?.trim()
        ? new Date(values.deadline.trim())
        : null,
      source: values.source?.trim() ? values.source.trim() : undefined,
      tags: values.tags,
      description: values.description?.trim()
        ? values.description.trim()
        : undefined,
    };

    await updateDeal.mutateAsync(clean);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 bg-[#1a2326] border-white/5 sm:max-w-xl">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Edit deal</SheetTitle>
          <SheetDescription>
            Update the deal information below.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Deal name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Q1 Partnership Deal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Contact(s)
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange([value]);
                      }}
                      value={field.value?.[0]}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contactsData?.items.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name}
                            {contact.companyName && ` - ${contact.companyName}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pipelineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Pipeline
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pipeline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pipelinesData?.items.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                              {pipeline.isDefault && " (Default)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pipelineStageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Stage
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedPipeline}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedPipeline?.stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name} ({stage.probability}%)
                            </SelectItem>
                          ))}
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
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Value
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="10000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Currency
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="USD" {...field} />
                      </FormControl>
                      <FormMessage />
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
                      <FormLabel className="text-xs text-muted-foreground">
                        Deadline
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <FormLabel className="text-xs text-muted-foreground">
                        Source
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Referral" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Tags
                    </FormLabel>
                    <FormControl>
                      <TagsInput
                        value={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Add tag..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional details about this deal..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <SheetFooter className="px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateDeal.isPending}
          >
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
