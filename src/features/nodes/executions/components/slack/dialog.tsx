"use client";

import { useForm } from "react-hook-form";

import { useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WebhookProvider } from "@/generated/prisma/enums";
import { useWebhooksByProvider } from "@/features/webhooks/hooks/use-webhooks";
import Link from "next/link";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required. " })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  content: z.string().min(1, "Message content is required"),
  webhookUrl: z.string().min(1, "Webhook URL is required"),
  webhookId: z.string().optional(),
});

export type SlackFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<SlackFormValues>;
}

export const SlackDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      content: defaultValues.content || "",
      webhookUrl: defaultValues.webhookUrl || "",
      webhookId: defaultValues.webhookId || undefined,
    },
  });

  const savedWebhooksQuery = useWebhooksByProvider(WebhookProvider.SLACK);
  const savedWebhooks = savedWebhooksQuery.data || [];

  // reset form values when dialog opens with new defaults

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        content: defaultValues.content || "",
        webhookUrl: defaultValues.webhookUrl || "",
        webhookId: defaultValues.webhookId || undefined,
      });
    }
  }, [open, defaultValues, form]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-8">
          <DialogTitle> Slack Configuration </DialogTitle>
          <DialogDescription>
            Configure the Slack webhook settings for this node.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4 px-8"
          >
            {/* variable name */}
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> Variable Name </FormLabel>
                  <FormControl>
                    <Input placeholder="mySlack" {...field} />
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
                      <SelectItem value="custom">
                        Use custom webhook URL
                      </SelectItem>
                      {savedWebhooks.map((webhook) => (
                        <SelectItem value={webhook.id} key={webhook.id}>
                          {webhook.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="flex items-center justify-between text-xs">
                    Reuse any Slack webhook you've saved.
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
                  <FormLabel> Web Request URL </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://hooks.slack.com/triggers/..."
                      disabled={isUsingSavedWebhook}
                      {...field}
                    />
                  </FormControl>

                  <FormDescription className="text-xs mt-2 leading-5 flex flex-col gap-1">
                    Get this from Slack:
                    <span className="flex items-center gap-1 flex-wrap">
                      <span className="text-white font-medium tracking-wide">
                        Tools
                      </span>{" "}
                      <ChevronRight className="size-3" />{" "}
                      <span className="text-white font-medium tracking-wide">
                        Workflows
                      </span>{" "}
                      <ChevronRight className="size-3" />{" "}
                      <span className="text-white font-medium tracking-wide">
                        New
                      </span>{" "}
                      <ChevronRight className="size-3" />{" "}
                      <span className="text-white font-medium tracking-wide">
                        Build a workflow
                      </span>{" "}
                      <ChevronRight className="size-3" />{" "}
                      <span className="text-white font-medium tracking-wide">
                        Choose an event
                      </span>{" "}
                      <ChevronRight className="size-3" />{" "}
                      <span className="text-white font-medium tracking-wide">
                        From a webhook
                      </span>{" "}
                      <ChevronRight className="size-3" />{" "}
                      <span className="text-white font-medium tracking-wide">
                        Make the key "content"
                      </span>{" "}
                      <ChevronRight className="size-3" />{" "}
                      <span className="text-white font-medium tracking-wide">
                        Copy web request URL
                      </span>{" "}
                    </span>
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
                  <FormLabel> Message content </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Summary: {{gemini.text}}"
                      className="min-h-[80px] text-sm"
                      {...field}
                    />
                  </FormControl>

                  <FormDescription className="text-xs mt-2 leading-5">
                    The message you want to send to the Slack server. <br /> Use{" "}
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

            <DialogFooter className="mt-4">
              <Button type="submit"> Save </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
