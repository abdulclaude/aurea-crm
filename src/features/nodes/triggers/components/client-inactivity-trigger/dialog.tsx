"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  ResizableSheetContent,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { inactivityActivityDimensionSchema } from "@/features/workflows/lib/studio-trigger-config";

const schema = z.object({
  days: z.number().int().min(1).max(3650),
  activityDimensions: z.array(inactivityActivityDimensionSchema).min(1),
  variableName: z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
});
export type ClientInactivityTriggerFormValues = z.infer<typeof schema>;
const dimensions = [
  { value: "CRM_INTERACTION" as const, label: "CRM interactions" },
  { value: "CLASS_BOOKING" as const, label: "Class bookings" },
  { value: "CLASS_ATTENDANCE" as const, label: "Class attendance" },
  { value: "SUCCESSFUL_PAYMENT" as const, label: "Successful payments" },
];

export function ClientInactivityTriggerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ClientInactivityTriggerFormValues) => void;
  defaultValues?: Partial<ClientInactivityTriggerFormValues>;
}) {
  const form = useForm<ClientInactivityTriggerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      days: 30,
      activityDimensions: ["CRM_INTERACTION", "CLASS_ATTENDANCE"],
      variableName: "inactivity",
    },
  });
  useEffect(() => {
    if (props.open)
      form.reset({
        days: props.defaultValues?.days ?? 30,
        activityDimensions: props.defaultValues?.activityDimensions ?? [
          "CRM_INTERACTION",
          "CLASS_ATTENDANCE",
        ],
        variableName: props.defaultValues?.variableName ?? "inactivity",
      });
  }, [
    form,
    props.defaultValues?.activityDimensions,
    props.defaultValues?.days,
    props.defaultValues?.variableName,
    props.open,
  ]);

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto border-border bg-background sm:max-w-xl">
        <SheetHeader className="gap-1 px-6 pb-1 pt-8">
          <SheetTitle>Client inactivity trigger</SheetTitle>
          <SheetDescription>
            Run once when a client crosses an inactivity threshold.
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-5" />
        <Form {...form}>
          <form
            className="space-y-6 px-6"
            onSubmit={form.handleSubmit((values) => {
              props.onSubmit(values);
              props.onOpenChange(false);
            })}
          >
            <FormField
              control={form.control}
              name="days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inactive for</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={3650}
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(event.target.valueAsNumber)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Number of complete days without qualifying activity.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activityDimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualifying activity</FormLabel>
                  <div className="space-y-3">
                    {dimensions.map((dimension) => (
                      <label
                        key={dimension.value}
                        className="flex items-center gap-3 text-sm"
                      >
                        <Checkbox
                          checked={field.value.includes(dimension.value)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...field.value, dimension.value]
                                : field.value.filter(
                                    (value) => value !== dimension.value,
                                  ),
                            )
                          }
                        />
                        {dimension.label}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Client and inactivity details are available at @
                    {field.value}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="px-0 pb-4">
              <Button
                type="submit"
                className="ml-auto w-max"
                variant="gradient"
              >
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
}
