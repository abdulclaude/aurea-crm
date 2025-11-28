"use client";

import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required. " })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  dealId: z.string().min(1, "Deal ID is required"),
  pipelineId: z.string().optional(),
  pipelineStageId: z.string().min(1, "Pipeline Stage ID is required"),
});

export type UpdatePipelineFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<UpdatePipelineFormValues>;
  variables: VariableItem[];
}

export const UpdatePipelineDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const [useVariableInputForDeal, setUseVariableInputForDeal] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      dealId: defaultValues.dealId || "",
      pipelineId: defaultValues.pipelineId || "",
      pipelineStageId: defaultValues.pipelineStageId || "",
    },
  });

  const trpc = useTRPC();
  const pipelinesQuery = useQuery({
    ...trpc.pipelines.list.queryOptions(),
    enabled: open,
  });

  const dealsQuery = useQuery(
    trpc.deals.list.queryOptions({
      cursor: undefined,
      limit: 100,
    })
  );

  const pipelines = pipelinesQuery.data?.items || [];
  const selectedPipelineId = form.watch("pipelineId");

  const pipelineStages = useMemo(() => {
    if (!selectedPipelineId) {
      // Show all stages from all pipelines if no pipeline selected
      return pipelines.flatMap((p: any) =>
        p.stages.map((s: any) => ({ ...s, pipelineName: p.name }))
      );
    }
    const pipeline = pipelines.find((p: any) => p.id === selectedPipelineId);
    return pipeline?.stages.map((s: any) => ({ ...s, pipelineName: pipeline.name })) || [];
  }, [selectedPipelineId, pipelines]);

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        dealId: defaultValues.dealId || "",
        pipelineId: defaultValues.pipelineId || "",
        pipelineStageId: defaultValues.pipelineStageId || "",
      });
    }
  }, [open, defaultValues.variableName, defaultValues.dealId, defaultValues.pipelineId, defaultValues.pipelineStageId, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Update Pipeline Stage Configuration</SheetTitle>
          <SheetDescription>
            Move a deal to a different stage in the pipeline.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5 bg-white/5" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="movedDeal" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Reference the updated deal in other nodes: <br />
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "movedDeal"}.pipelineStageId}}`}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dealId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Deal ID</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="use-variable-deal-pipeline" className="text-xs text-white/60 cursor-pointer">
                        Use variables
                      </Label>
                      <Switch
                        id="use-variable-deal-pipeline"
                        checked={useVariableInputForDeal}
                        onCheckedChange={setUseVariableInputForDeal}
                      />
                    </div>
                  </div>
                  <FormControl>
                    {useVariableInputForDeal ? (
                      <VariableInput
                        placeholder="{{myDeal.id}}"
                        value={field.value || ""}
                        onChange={field.onChange}
                        variables={variables}
                        className="h-13"
                      />
                    ) : (
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        disabled={dealsQuery.isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={dealsQuery.isLoading ? "Loading deals..." : "Select a deal"} />
                        </SelectTrigger>
                        <SelectContent>
                          {dealsQuery.data?.items?.map((deal) => (
                            <SelectItem key={deal.id} value={deal.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{deal.name}</span>
                                {deal.value && (
                                  <span className="text-xs text-white/60">
                                    {deal.currency} {deal.value.toString()}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          )) ?? (
                            <div className="px-2 py-4 text-sm text-white/60">No deals found</div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormDescription className="text-xs">
                    {useVariableInputForDeal ? (
                      "ID of the deal to move"
                    ) : (
                      "Select an existing deal from your CRM"
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pipelineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline (optional filter)</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(val) => {
                      field.onChange(val || undefined);
                      // Reset stage when pipeline changes
                      form.setValue("pipelineStageId", "");
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="All pipelines" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pipelines.map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                          {pipeline.isDefault && " (Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Filter stages by pipeline (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pipelineStageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Pipeline Stage</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pipelineStages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.pipelineName && !selectedPipelineId
                            ? `${stage.pipelineName} - ${stage.name}`
                            : stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    The stage to move the deal to
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="mt-6 px-0 pb-4">
              <Button
                type="submit"
                className="brightness-120! hover:brightness-130! w-full py-5"
              >
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
