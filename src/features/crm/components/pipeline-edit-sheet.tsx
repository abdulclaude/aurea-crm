"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Color from "color";
import { IconPlusSmall as PlusIcon } from "central-icons/IconPlusSmall";
import { IconTrashCan as TrashIcon } from "central-icons/IconTrashCan";
import { GripVerticalIcon } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm, type Control } from "react-hook-form";
import z from "zod";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import { ProgressiveBlur } from "@/components/ui/motion-primitives/progressive-blur";

const DEFAULT_STAGE_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
];

const formSchema = z.object({
  name: z.string().min(1, "Pipeline name is required"),
  description: z.string().optional(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  stages: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, "Stage name is required"),
        probability: z.number().min(0).max(100),
        rottingDays: z.number().min(1).optional(),
        color: z.string().optional(),
      })
    )
    .min(1, "At least one stage is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface PipelineEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: {
    id: string;
    name: string;
    description?: string | null;
    isDefault: boolean;
    isActive: boolean;
    stages: Array<{
      id: string;
      name: string;
      position: number;
      probability: number;
      rottingDays?: number | null;
      color?: string | null;
    }>;
  };
}

interface SortableStageItemProps {
  id: string;
  index: number;
  control: Control<FormValues>;
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
      className="bg-[#202e32]/40 p-4 rounded-xs border border-white/5 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-white/40 hover:text-white/50 touch-none"
        >
          <GripVerticalIcon className="size-4" />
        </div>

        <span className="text-xs text-white/50 font-mono">
          Stage {index + 1}
        </span>

        {fieldsLength > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-xs text-rose-500 hover:text-white hover:bg-rose-700"
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
              <FormLabel className="text-xs text-white/50">
                Stage Name
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Qualified, Proposal..."
                  className="bg-[#202e32] border-white/5 text-white text-xs"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`stages.${index}.probability`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-white/50">
                Win Probability (%)
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0"
                  className="bg-[#202e32] border-white/5 text-white text-xs"
                  value={field.value}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "" ? 0 : Number(val));
                  }}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`stages.${index}.rottingDays`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-white/50">
                Rotting Days (Optional)
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g., 7"
                  className="bg-[#202e32] border-white/5 text-white text-xs"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "" ? undefined : Number(val));
                  }}
                />
              </FormControl>
              <FormDescription className="text-[10px] text-white/50">
                Alert when deals stay in this stage too long
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`stages.${index}.color`}
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-xs text-white/50">Color</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-[#202e32] border-white/5 hover:bg-[#202e32] hover:border-white/10 px-3"
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
                        <span className="text-xs text-white/70">
                          {field.value ??
                            DEFAULT_STAGE_COLORS[
                              index % DEFAULT_STAGE_COLORS.length
                            ]}
                        </span>
                      </div>
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#202e32] border-white/5">
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
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

export function PipelineEditSheet({
  open,
  onOpenChange,
  pipeline,
}: PipelineEditSheetProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: pipeline.name,
      description: pipeline.description ?? "",
      isDefault: pipeline.isDefault,
      isActive: pipeline.isActive,
      stages: pipeline.stages
        .sort((a, b) => a.position - b.position)
        .map((stage) => ({
          id: stage.id,
          name: stage.name,
          probability: stage.probability,
          rottingDays: stage.rottingDays ?? undefined,
          color: stage.color ?? DEFAULT_STAGE_COLORS[0],
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

  // Reset form when pipeline changes
  useEffect(() => {
    form.reset({
      name: pipeline.name,
      description: pipeline.description ?? "",
      isDefault: pipeline.isDefault,
      isActive: pipeline.isActive,
      stages: pipeline.stages
        .sort((a, b) => a.position - b.position)
        .map((stage) => ({
          id: stage.id,
          name: stage.name,
          probability: stage.probability,
          rottingDays: stage.rottingDays ?? undefined,
          color: stage.color ?? DEFAULT_STAGE_COLORS[0],
        })),
    });
  }, [pipeline, form]);

  const updatePipeline = useMutation(
    trpc.pipelines.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        onOpenChange(false);
      },
    })
  );

  const onSubmit = async (values: FormValues) => {
    const clean = {
      id: pipeline.id,
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      isDefault: values.isDefault,
      isActive: values.isActive,
      stages: values.stages.map((stage) => ({
        id: stage.id,
        name: stage.name.trim(),
        probability: stage.probability,
        rottingDays: stage.rottingDays,
        color: stage.color,
      })),
    };

    await updatePipeline.mutateAsync(clean);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader>
        <SheetTitle className="text-xs hidden">Edit Pipeline</SheetTitle>
      </SheetHeader>
      <SheetContent className="flex flex-col gap-0 bg-[#1a2326] border-white/5 sm:max-w-2xl text-white pt-4 w-full">
        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 py-4"
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">
                  Pipeline Details
                </h3>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white/50">
                        Pipeline Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Sales Pipeline"
                          className="rounded-xs"
                          {...field}
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
                      <FormLabel className="text-xs text-white/50">
                        Description (Optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose of this pipeline..."
                          className="rounded-xs resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="rounded-xs"
                          />
                        </FormControl>
                        <FormLabel className="text-xs text-white cursor-pointer font-normal">
                          Set as default pipeline
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="rounded-xs"
                          />
                        </FormControl>
                        <FormLabel className="text-xs text-white cursor-pointer font-normal">
                          Active
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">
                    Pipeline Stages
                  </h3>

                  <Button
                    size="sm"
                    className="text-xs gap-1 "
                    onClick={addStage}
                  >
                    <PlusIcon className="size-3.5" />
                    Add Stage
                  </Button>
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
              </div>
            </form>
          </Form>
        </div>

        <SheetFooter className="px-6 py-4 justify-end w-full">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={updatePipeline.isPending}
            className="text-xs"
          >
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
