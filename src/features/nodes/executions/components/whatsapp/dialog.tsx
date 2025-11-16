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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useWhatsAppIntegrations } from "@/features/whatsapp/hooks/use-whatsapp-integrations";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.",
    }),
  integrationId: z.string().min(1, "Select a WhatsApp integration."),
  recipient: z.string().min(1, "Recipient phone number is required."),
  message: z.string().min(1, "Message content is required."),
  previewUrl: z.boolean().default(false),
});

export type WhatsAppExecutionFormValues = z.infer<typeof formSchema>;

interface WhatsAppExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WhatsAppExecutionFormValues) => void;
  defaultValues?: Partial<WhatsAppExecutionFormValues>;
}

export const WhatsAppExecutionDialog: React.FC<
  WhatsAppExecutionDialogProps
> = ({ open, onOpenChange, onSubmit, defaultValues = {} }) => {
  const form = useForm<WhatsAppExecutionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "whatsappMessage",
      integrationId: defaultValues.integrationId || "",
      recipient: defaultValues.recipient || "",
      message: defaultValues.message || "",
      previewUrl: defaultValues.previewUrl ?? false,
    },
  });

  const { whatsappIntegrations, isLoading } = useWhatsAppIntegrations();
  const hasIntegrations = whatsappIntegrations.length > 0;

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "whatsappMessage",
        integrationId: defaultValues.integrationId || "",
        recipient: defaultValues.recipient || "",
        message: defaultValues.message || "",
        previewUrl: defaultValues.previewUrl ?? false,
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: WhatsAppExecutionFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-8">
          <DialogTitle>WhatsApp action</DialogTitle>
          <DialogDescription>
            Send a text message through your connected WhatsApp number.
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
                    <Input placeholder="whatsappMessage" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Access the API response via{" "}
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "whatsappMessage"}.result}}`}
                    </span>
                    .
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="integrationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp number</FormLabel>
                  <Select
                    disabled={isLoading}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a connected number" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {whatsappIntegrations.map((integration) => (
                        <SelectItem key={integration.id} value={integration.id}>
                          {integration.metadata?.displayPhoneNumber ||
                            integration.metadata?.verifiedName ||
                            integration.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {hasIntegrations ? (
                      "Choose which connected WhatsApp number should send this message."
                    ) : (
                      <>
                        No WhatsApp numbers connected yet. Connect one under{" "}
                        <Button variant="link" className="px-1 text-xs" asChild>
                          <Link href="/integrations" prefetch>
                            Integrations
                          </Link>
                        </Button>
                        .
                      </>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient phone number</FormLabel>
                  <FormControl>
                    <Input placeholder="+15551234567" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Provide the user&apos;s phone number in E.164 format (e.g.
                    +15551234567).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message body</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[80px] text-sm"
                      placeholder="Hello {{whatsappTrigger.from}}!"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Supports templating via{" "}
                    <span className="text-white font-medium tracking-wide">
                      {"{{variables}}"}
                    </span>
                    .
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="previewUrl"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border border-white/5 px-4 py-3">
                  <div>
                    <FormLabel>Show link preview</FormLabel>
                    <FormDescription className="text-xs">
                      When enabled, WhatsApp will show previews for links in the
                      message.
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

            <DialogFooter className="mt-4">
              <Button type="submit" disabled={!hasIntegrations}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

