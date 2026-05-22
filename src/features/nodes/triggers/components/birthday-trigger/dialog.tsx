"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Separator } from "@/components/ui/separator";
import {
  ResizableSheetContent,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
});

export type BirthdayTriggerFormValues = z.infer<typeof formSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BirthdayTriggerFormValues) => void;
  defaultValues?: Partial<BirthdayTriggerFormValues>;
};

export function BirthdayTriggerDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) {
  const form = useForm<BirthdayTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "birthday",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "birthday",
      });
    }
  }, [defaultValues.variableName, form, open]);

  const handleSubmit = (values: BirthdayTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto border-white/5 bg-background sm:max-w-xl">
        <SheetHeader className="gap-1 px-6 pb-1 pt-8">
          <SheetTitle>Birthday trigger configuration</SheetTitle>
          <SheetDescription>
            Runs once per matching member birthday using Client birth month and
            birth day.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5" />

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
                  <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input placeholder="birthday" {...field} />
                  </FormControl>
                  <FormDescription className="mt-1 text-[11px]">
                    Use{" "}
                    <span className="font-medium tracking-wide text-primary">
                      {`@${field.value || "birthday"}.client.name`}
                    </span>{" "}
                    and{" "}
                    <span className="font-medium tracking-wide text-primary">
                      {`@${field.value || "birthday"}.client.birthDay`}
                    </span>{" "}
                    in later nodes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs leading-5 text-primary/70">
                Birthdays are checked daily. Clients without both birth month
                and birth day are ignored.
              </p>
            </div>

            <SheetFooter className="px-0 pb-4">
              <Button type="submit" className="ml-auto w-max" variant="gradient">
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
}
