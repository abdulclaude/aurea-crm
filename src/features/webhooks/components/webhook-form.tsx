"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { WebhookProvider } from "@prisma/client";
import {
  useCreateWebhook,
  useSuspenseWebhook,
  useUpdateWebhook,
} from "../hooks/use-webhooks";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.enum(WebhookProvider),
  url: z.string().url("Enter a valid webhook URL"),
  signingSecret: z.string().optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const webhookProviderOptions = [
  { value: WebhookProvider.SLACK, label: "Slack", logo: "/logos/slack.svg" },
  {
    value: WebhookProvider.DISCORD,
    label: "Discord",
    logo: "/logos/discord.svg",
  },
  {
    value: WebhookProvider.STRIPE,
    label: "Stripe",
    logo: "/logos/stripe.svg",
  },
  {
    value: WebhookProvider.CUSTOM,
    label: "Custom",
    logo: "/logos/workflow.svg",
  },
];

interface WebhookFormProps {
  initialData?: {
    id?: string;
    name: string;
    provider: WebhookProvider;
    url: string;
    signingSecret?: string;
    description?: string;
  };
}

export const WebhookForm: React.FC<WebhookFormProps> = ({ initialData }) => {
  const router = useRouter();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const { handleError, modal } = useUpgradeModal();

  const isEdit = Boolean(initialData?.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          provider: initialData.provider,
          url: initialData.url,
          signingSecret: initialData.signingSecret || "",
          description: initialData.description || "",
        }
      : {
          name: "",
          provider: WebhookProvider.SLACK,
          url: "",
          signingSecret: "",
          description: "",
        },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        provider: initialData.provider,
        url: initialData.url,
        signingSecret: initialData.signingSecret || "",
        description: initialData.description || "",
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      signingSecret: values.signingSecret || undefined,
      description: values.description || undefined,
    };

    if (isEdit && initialData?.id) {
      await updateWebhook.mutateAsync(
        {
          id: initialData.id,
          ...payload,
        },
        {
          onSuccess: () => {
            toast.success(`Webhook "${values.name}" updated.`);
          },
          onError: (error) => toast.error(error.message),
        }
      );
    } else {
      await createWebhook.mutateAsync(payload, {
        onSuccess: (data) => {
          toast.success(`Webhook "${data.name}" created.`);
          router.push(`/webhooks/${data.id}`);
        },
        onError: (error) => handleError(error),
      });
    }
  };

  return (
    <>
      {modal}
      <Card className="shadow-none px-0">
        <CardHeader>
          <CardTitle>{isEdit ? "Edit webhook" : "Create webhook"}</CardTitle>
          <CardDescription>
            {isEdit
              ? "Update a reusable webhook endpoint or signing secret."
              : "Store webhook details so you can reuse them inside nodes."}
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Marketing Slack Webhook" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {webhookProviderOptions.map((option) => (
                          <SelectItem value={option.value} key={option.value}>
                            <div className="flex items-center gap-2">
                              <Image
                                src={option.logo}
                                alt={option.label}
                                width={16}
                                height={16}
                              />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://hooks.slack.com/..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="signingSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signing secret (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="whsec_..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Usage, channel, or other helpful context"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/webhooks" prefetch>
                    Cancel
                  </Link>
                </Button>
                <Button
                  type="submit"
                  disabled={createWebhook.isPending || updateWebhook.isPending}
                >
                  {isEdit ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
};

export const WebhookView = ({ webhookId }: { webhookId: string }) => {
  const { data } = useSuspenseWebhook(webhookId);
  return (
    <WebhookForm
      initialData={{
        id: data.id,
        name: data.name,
        provider: data.provider,
        url: data.url,
        signingSecret: data.signingSecret || "",
        description: data.description || "",
      }}
    />
  );
};
