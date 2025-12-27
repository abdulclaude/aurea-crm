"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";

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
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  dealId: z.string().min(1, "Deal ID is required"),
  pipelineStageId: z.string().min(1, "Pipeline Stage ID is required"),
});

export type MoveDealStageFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MoveDealStageFormValues) => void;
  defaultValues?: Partial<MoveDealStageFormValues>;
  variables: VariableItem[];
}

export const MoveDealStageDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "movedDeal",
      dealId: defaultValues.dealId || "",
      pipelineStageId: defaultValues.pipelineStageId || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "movedDeal",
        dealId: defaultValues.dealId || "",
        pipelineStageId: defaultValues.pipelineStageId || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Move Deal Stage Configuration</SheetTitle>
          <SheetDescription>
            Move a deal to a different pipeline stage.
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
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="movedDeal" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference the updated deal in other nodes using this
                    variable name.
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
                  <FormLabel>Deal ID</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="@deal.id or deal ID"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription>
                    The ID of the deal to move. Use @deal.id from previous
                    nodes.
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
                  <FormLabel>Pipeline Stage ID</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="stage ID or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription>
                    The ID of the pipeline stage to move the deal to.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="px-0 pb-4">
              <Button
                type="submit"
                className="w-max ml-auto"
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
};
