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
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
});

export type ClientCreatedTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ClientCreatedTriggerFormValues) => void;
  defaultValues?: Partial<ClientCreatedTriggerFormValues>;
  variables: VariableItem[];
}

export const ClientCreatedTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "newClient",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "newClient",
      });
    }
  }, [open, defaultValues.variableName, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Client created trigger configuration</SheetTitle>
          <SheetDescription>
            This workflow will trigger whenever a new client is created in your
            CRM.
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
                    <Input placeholder="newClient" {...field} />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    Access the created client data in other nodes: <br />
                    <span className="text-primary font-medium tracking-wide">
                      {`@${field.value || "newClient"}.name`}
                    </span>
                    {", "}
                    <span className="text-primary font-medium tracking-wide">
                      {`@${field.value || "newClient"}.email`}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
              <p className="text-xs text-blue-400">
                This trigger will fire automatically whenever a new client is
                created through your CRM or any workflow that creates a client.
              </p>
            </div>

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
