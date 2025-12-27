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
      message: "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  channelId: z.string().min(1, "ChannelId is required"),
  messageId: z.string().min(1, "MessageId is required"),
  message: z.string().min(1, "Message is required"),
});

export type DiscordEditMessageFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DiscordEditMessageFormValues) => void;
  defaultValues?: Partial<DiscordEditMessageFormValues>;
  variables: VariableItem[];
}

export const DiscordEditMessageDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "editedMessage",
      channelId: defaultValues.channelId || "",
      messageId: defaultValues.messageId || "",
      message: defaultValues.message || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "editedMessage",
        channelId: defaultValues.channelId || "",
        messageId: defaultValues.messageId || "",
        message: defaultValues.message || "",
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
          <SheetTitle>Discord: Edit Message Configuration</SheetTitle>
          <SheetDescription>
            Edit a Discord message
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
                    <Input placeholder="editedMessage" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference the result in other nodes using this variable name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="channelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Id</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="channelId or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="messageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Id</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="messageId or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="message or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
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
