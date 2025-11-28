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
import { ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { WebhookProvider } from "@/generated/prisma/enums";
import { useWebhooksByProvider } from "@/features/webhooks/hooks/use-webhooks";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required. " })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  username: z.string().optional(),
  content: z
    .string()
    .min(1, "Message content is required")
    .max(2000, "Discord messages cannot exceed 2000 characters."),
  webhookUrl: z.string().min(1, "Webhook URL is required"),
  webhookId: z.string().optional(),
});

export type DiscordFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<DiscordFormValues>;
  variables: VariableItem[];
}

export const DiscordDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      username: defaultValues.username || "",
      content: defaultValues.content || "",
      webhookUrl: defaultValues.webhookUrl || "",
      webhookId: defaultValues.webhookId || undefined,
    },
  });

  const savedWebhooksQuery = useWebhooksByProvider(WebhookProvider.DISCORD);
  const savedWebhooks = savedWebhooksQuery.data || [];

  // reset form values when dialog opens with new defaults

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        username: defaultValues.username || "",
        content: defaultValues.content || "",
        webhookUrl: defaultValues.webhookUrl || "",
        webhookId: defaultValues.webhookId || undefined,
      });
    }
  }, [open, defaultValues.variableName, defaultValues.username, defaultValues.content, defaultValues.webhookUrl, defaultValues.webhookId, form]);

  const handleSavedWebhookChange = (value: string) => {
    if (value === "custom") {
      form.setValue("webhookId", undefined);
      return;
    }
    const webhook = savedWebhooks.find((item) => item.id === value);
    if (webhook) {
      form.setValue("webhookId", webhook.id);
      form.setValue("webhookUrl", webhook.url);
    }
  };

  const selectedWebhookId = form.watch("webhookId");
  const isUsingSavedWebhook = Boolean(selectedWebhookId);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Discord Configuration</SheetTitle>
          <SheetDescription>
            Configure the Discord webhook settings for this node.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5 bg-white/5" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6"
          >
            {/* variable name */}
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> Variable Name </FormLabel>
                  <FormControl>
                    <Input placeholder="myDiscord" {...field} />
                  </FormControl>

                  <FormDescription className="text-xs mt-2 leading-5">
                    Use this name to reference the result in other nodes: <br />
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "myApiCall"}.text}}`}
                    </span>{" "}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="webhookId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saved webhook</FormLabel>
                  <Select
                    value={field.value || "custom"}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        field.onChange(undefined);
                        form.setValue("webhookId", undefined);
                        return;
                      }
                      field.onChange(value);
                      handleSavedWebhookChange(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a webhook" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="custom">Use custom webhook</SelectItem>
                      {savedWebhooks.map((webhook) => (
                        <SelectItem value={webhook.id} key={webhook.id}>
                          {webhook.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="flex items-center justify-between text-xs">
                    Reuse any Discord webhook you've saved.
                    <Button
                      asChild
                      variant="link"
                      className="px-0 text-xs h-auto"
                    >
                      <Link href="/webhooks" prefetch>
                        Manage webhooks
                      </Link>
                    </Button>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="webhookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook URL</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="https://discord.com/api/webhooks/..."
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                      disabled={isUsingSavedWebhook}
                      className="h-13"
                    />
                  </FormControl>

                  <FormDescription className="text-xs mt-2 leading-5 flex gap-1">
                    Get this from Discord: <br />
                    <span className="text-white font-medium tracking-wide">
                      Channel Settings
                    </span>{" "}
                    <ChevronRight className="size-3" />{" "}
                    <span className="text-white font-medium tracking-wide">
                      Integrations
                    </span>{" "}
                    <ChevronRight className="size-3" />{" "}
                    <span className="text-white font-medium tracking-wide">
                      Webhooks
                    </span>{" "}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message content</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="Summary: {{gemini.text}}"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>

                  <FormDescription className="text-xs mt-2 leading-5">
                    The message you want to send to the Discord server. <br />{" "}
                    Use{" "}
                    <span className="text-white font-medium tracking-wide">
                      {"{{variables}}"}
                    </span>{" "}
                    for simple values.
                    <br /> Alternatively, use{" "}
                    <span className="text-white font-medium tracking-wide">
                      {"{{json variable}}"}
                    </span>{" "}
                    to stringify objects.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bot username (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="Google Form Summary Bot"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                      className="h-13"
                    />
                  </FormControl>

                  <FormDescription className="text-xs mt-2 leading-5">
                    Override the webhook's default username
                  </FormDescription>
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
