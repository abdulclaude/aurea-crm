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
  note: z.string().min(1, "Note is required"),
});

export type AddDealNoteFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddDealNoteFormValues) => void;
  defaultValues?: Partial<AddDealNoteFormValues>;
  variables: VariableItem[];
}

export const AddDealNoteDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "updatedDeal",
      dealId: defaultValues.dealId || "",
      note: defaultValues.note || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "updatedDeal",
        dealId: defaultValues.dealId || "",
        note: defaultValues.note || "",
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
          <SheetTitle>Add Deal Note Configuration</SheetTitle>
          <SheetDescription>
            Add a note to an existing deal's activity history.
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
                    <Input placeholder="updatedDeal" {...field} />
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
                    The ID of the deal to add the note to. Use @deal.id from
                    previous nodes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Deal note or @variables"
                      className="h-24"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription>
                    The note to add to the deal. This will be appended to the
                    deal's description with a timestamp.
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
