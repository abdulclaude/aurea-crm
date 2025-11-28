"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
import { Switch } from "@/components/ui/switch";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma/enums";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.",
    }),
  credentialId: z.string().min(1, "Select a Telegram bot credential."),
  chatId: z.string().min(1, "Chat ID is required."),
  text: z.string().min(1, "Message text is required."),
  parseMode: z.enum(["none", "MarkdownV2", "HTML"]).default("none"),
  disableNotification: z.boolean().default(false),
});

export type TelegramExecutionFormValues = z.infer<typeof formSchema>;

interface TelegramExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TelegramExecutionFormValues) => void;
  defaultValues?: Partial<TelegramExecutionFormValues>;
  variables: VariableItem[];
}

export const TelegramExecutionDialog: React.FC<
  TelegramExecutionDialogProps
> = ({ open, onOpenChange, onSubmit, defaultValues = {}, variables }) => {
  const form = useForm<TelegramExecutionFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      variableName: defaultValues.variableName || "telegramMessage",
      credentialId: defaultValues.credentialId || "",
      chatId: defaultValues.chatId || "",
      text: defaultValues.text || "",
      parseMode: defaultValues.parseMode || "none",
      disableNotification: defaultValues.disableNotification ?? false,
    },
  });

  const credentialsQuery = useCredentialsByType(CredentialType.TELEGRAM_BOT);
  const credentials = credentialsQuery.data || [];

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "telegramMessage",
        credentialId: defaultValues.credentialId || "",
        chatId: defaultValues.chatId || "",
        text: defaultValues.text || "",
        parseMode: defaultValues.parseMode || "none",
        disableNotification: defaultValues.disableNotification ?? false,
      });
    }
  }, [open, defaultValues.variableName, defaultValues.credentialId, defaultValues.chatId, defaultValues.text, defaultValues.parseMode, defaultValues.disableNotification, form]);

  const handleSubmit = (values: TelegramExecutionFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Telegram action</SheetTitle>
          <SheetDescription>
            Send a message via the selected Telegram bot.
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
                  <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input placeholder="telegramMessage" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Reference the send result via{" "}
                    <span className="text-white font-medium tracking-wide">
                      {`{{${
                        field.value || "telegramMessage"
                      }.result.message_id}}`}
                    </span>
                    .
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telegram bot</FormLabel>
                  <Select
                    disabled={credentialsQuery.isLoading}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a bot credential" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {credentials.map((credential) => (
                        <SelectItem key={credential.id} value={credential.id}>
                          {credential.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Manage bot tokens under{" "}
                    <Button variant="link" className="px-1 text-xs" asChild>
                      <Link href="/credentials" prefetch>
                        Credentials
                      </Link>
                    </Button>
                    .
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chatId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chat ID</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="123456789"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                      className="h-13"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Provide the target chat ID (e.g.{" "}
                    <span className="text-white">123456789</span> for a DM or{" "}
                    <span className="text-white">-1001234567890</span> for a
                    channel/group).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message body</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="Hello {{telegramTrigger.message.from.username}}!"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Supports templating via{" "}
                    <span className="text-white font-medium tracking-wide">
                      {"{{variables}}"}
                    </span>
                    . Use Handlebars helpers like{" "}
                    <span className="text-white font-medium tracking-wide">
                      {"{{json telegramTrigger}}"}
                    </span>{" "}
                    to inspect incoming data.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parseMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parse mode</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Plain text</SelectItem>
                      <SelectItem value="MarkdownV2">MarkdownV2</SelectItem>
                      <SelectItem value="HTML">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Choose how Telegram should parse and format the text.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="disableNotification"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border border-white/5 px-4 py-3">
                  <div>
                    <FormLabel>Send silently</FormLabel>
                    <FormDescription className="text-xs">
                      Sends the message without a push notification.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
