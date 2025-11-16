"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  chatId: z.string().optional(),
});

export type TelegramTriggerFormValues = z.infer<typeof formSchema>;

interface TelegramTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TelegramTriggerFormValues) => void;
  defaultValues?: Partial<TelegramTriggerFormValues>;
}

export const TelegramTriggerDialog: React.FC<TelegramTriggerDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}) => {
  const form = useForm<TelegramTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "telegramTrigger",
      credentialId: defaultValues.credentialId || "",
      chatId: defaultValues.chatId || "",
    },
  });

  const credentialsQuery = useCredentialsByType(CredentialType.TELEGRAM_BOT);
  const credentials = credentialsQuery.data || [];

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "telegramTrigger",
        credentialId: defaultValues.credentialId || "",
        chatId: defaultValues.chatId || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: TelegramTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-8">
          <DialogTitle>Telegram trigger</DialogTitle>
          <DialogDescription>
            Runs whenever your Telegram bot receives a new message. Optionally
            filter by chat ID.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4 px-8"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input placeholder="telegramTrigger" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Reference the latest update via{" "}
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "telegramTrigger"}.message.text}}`}
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
                    Connect a bot token under{" "}
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
                  <FormLabel>Chat ID (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Provide to only trigger on a specific chat"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Leave blank to trigger on every incoming message for this
                    bot. To limit to a specific chat or group, provide the chat
                    ID (e.g. <span className="text-white">123456789</span> or{" "}
                    <span className="text-white">-1001234567890</span>).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-4">
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
