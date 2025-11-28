"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Color, { type ColorLike } from "color";
import { IconPlusSmall as PlusIcon } from "central-icons/IconPlusSmall";
import { IconTrashCan as TrashIcon } from "central-icons/IconTrashCan";
import { GripVerticalIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useFieldArray, useForm, type Control } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerSelection,
} from "@/components/ui/shadcn-io/color-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

const DEFAULT_STAGE_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
];

const pipelineFormSchema = z.object({
  name: z.string().min(1, "Pipeline name is required"),
  description: z.string().optional(),
  isDefault: z.boolean(),
  stages: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, "Stage name is required"),
        probability: z
          .number()
          .min(0, "Probability must be at least 0")
          .max(100, "Probability cannot exceed 100"),
        rottingDays: z
          .number()
          .min(1, "Rotting days must be at least 1")
          .optional(),
        color: z.string().optional(),
      })
    )
    .min(1, "At least one stage is required"),
});

type PipelineFormValues = z.infer<typeof pipelineFormSchema>;

interface SortableStageItemProps {
  id: string;
  index: number;
  control: Control<PipelineFormValues>;
  fieldsLength: number;
  onRemove: () => void;
}

function SortableStageItem({
  id,
  index,
  control,
  fieldsLength,
  onRemove,
}: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-primary-foreground/25 p-4 rounded-sm border border-black/10 dark:border-white/5 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-primary/40 hover:text-primary/50 touch-none"
        >
          <GripVerticalIcon className="size-4" />
        </div>

        <span className="text-xs text-primary/50 font-mono">
          Stage {index + 1}
        </span>

        {fieldsLength > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="bg-rose-500 text-rose-100 hover:bg-rose-400 hover:text-white text-xs rounded-sm border border-black/10 dark:border-white/5 ml-auto"
            onClick={onRemove}
          >
            <TrashIcon className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name={`stages.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/50">
                Stage Name
              </FormLabel>

              <FormControl>
                <Input
                  placeholder="e.g., Qualified, Proposal..."
                  className="bg-background border-black/10 dark:border-white/5 text-primary text-xs"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`stages.${index}.probability`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/50">
                Win Probability (%)
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0"
                  className="bg-background border-black/10 dark:border-white/5 text-primary text-xs"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`stages.${index}.rottingDays`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/50">
                Rotting Days (Optional)
              </FormLabel>

              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g., 7"
                  className="bg-background border-black/10 dark:border-white/5 text-primary text-xs"
                  {...field}
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(Number(e.target.valueAsNumber))
                  }
                />
              </FormControl>

              <FormDescription className="text-[10px] text-primary/50">
                Alert when deals stay in this stage too long
              </FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`stages.${index}.color`}
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-xs text-primary/50">Color</FormLabel>

              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-background border-black/10 dark:border-white/5 hover:bg-primary-foreground/25 hover:border-black/20 px-3"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{
                            backgroundColor:
                              field.value ??
                              DEFAULT_STAGE_COLORS[
                                index % DEFAULT_STAGE_COLORS.length
                              ],
                          }}
                        />
                        <span className="text-xs text-primary/70">
                          {field.value ??
                            DEFAULT_STAGE_COLORS[
                              index % DEFAULT_STAGE_COLORS.length
                            ]}
                        </span>
                      </div>
                    </Button>
                  </FormControl>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0 bg-background border-black/10 dark:border-white/5">
                  <ColorPicker
                    value={
                      field.value ??
                      DEFAULT_STAGE_COLORS[index % DEFAULT_STAGE_COLORS.length]
                    }
                    onChange={(rgba) => {
                      const hex = Color.rgb(rgba).hex();
                      field.onChange(hex);
                    }}
                  >
                    <div className="flex flex-col gap-3 p-4">
                      <div className="h-32 w-64">
                        <ColorPickerSelection className="h-full" />
                      </div>

                      <div className="space-y-2">
                        <ColorPickerHue />
                        <ColorPickerAlpha />
                      </div>

                      <ColorPickerFormat />
                    </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

export default function EditPipelinePage() {
  const params = useParams<{ pipelineId: string }>();
  const router = useRouter();
  const trpc = useTRPC();

  const { data: pipeline } = useSuspenseQuery(
    trpc.pipelines.getById.queryOptions({ id: params.pipelineId })
  );

  const form = useForm<PipelineFormValues>({
    resolver: zodResolver(pipelineFormSchema),
    defaultValues: {
      name: pipeline.name,
      description: pipeline.description || "",
      isDefault: pipeline.isDefault,
      stages: pipeline.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        probability: stage.probability,
        rottingDays: stage.rottingDays || undefined,
        color: stage.color || undefined,
      })),
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "stages",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);

      move(oldIndex, newIndex);
    }
  };

  const updatePipeline = useMutation(
    trpc.pipelines.update.mutationOptions({
      onSuccess: () => {
        toast.success("Pipeline updated successfully");
        router.push("/pipelines");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update pipeline");
      },
    })
  );

  const onSubmit = async (data: PipelineFormValues) => {
    await updatePipeline.mutateAsync({
      id: params.pipelineId,
      ...data,
    });
  };

  const addStage = () => {
    const nextColorIndex = fields.length % DEFAULT_STAGE_COLORS.length;
    append({
      name: "",
      probability: 0,
      rottingDays: undefined,
      color: DEFAULT_STAGE_COLORS[nextColorIndex],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary">Edit Pipeline</h1>
          <p className="text-xs text-primary/50">
            Update your sales process stages and probabilities.
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:border-white/5" />

      <div className=" pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-black/10 dark:border-white/5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/50">
                      Pipeline Name
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder="e.g., Sales Pipeline, Customer Success..."
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/50">
                      Description (Optional)
                    </FormLabel>

                    <FormControl>
                      <Textarea
                        placeholder="Describe the purpose of this pipeline..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-1 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>

                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-xs text-primary cursor-pointer">
                        Set as default pipeline
                      </FormLabel>

                      <FormDescription className="text-[11px] text-primary/50">
                        New deals will automatically use this pipeline if no
                        other is specified.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Stages */}

            <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-black/10 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium text-primary">
                    Pipeline Stages
                  </h2>
                  <p className="text-[11px] text-primary/50 mt-1">
                    Define the stages deals will move through in this pipeline.
                  </p>
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <SortableStageItem
                        key={field.id}
                        id={field.id}
                        index={index}
                        control={form.control}
                        fieldsLength={fields.length}
                        onRemove={() => remove(index)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {form.formState.errors.stages?.root && (
                <p className="text-xs text-red-400">
                  {form.formState.errors.stages.root.message}
                </p>
              )}

              <Button
                type="button"
                size="sm"
                className="text-xs bg-background text-primary hover:text-primary gap-1 w-full py-4! h-max border border-black/10 dark:border-white/5"
                onClick={addStage}
              >
                <PlusIcon className="size-3.5" />
                Add Stage
              </Button>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2 px-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={updatePipeline.isPending}
                className="bg-rose-500 text-rose-100 hover:bg-rose-500/95 hover:text-white text-xs rounded-sm border border-black/10 dark:border-white/5 transition duration-150"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={updatePipeline.isPending}
                className="text-xs rounded-sm bg-background text-primary hover:text-primary border border-black/10 dark:border-white/5"
              >
                {updatePipeline.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
