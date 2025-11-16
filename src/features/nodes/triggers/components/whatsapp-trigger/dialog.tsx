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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  integrationId: z.string().min(1, { message: "Select a WhatsApp integration." }),
});

export type WhatsAppTriggerFormValues = z.infer<typeof formSchema>;

interface WhatsAppTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WhatsAppTriggerFormValues) => void;
  defaultValues?: Partial<WhatsAppTriggerFormValues>;
}

export const WhatsAppTriggerDialog: React.FC<WhatsAppTriggerDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}) => {
  const form = useForm<WhatsAppTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "whatsappTrigger",
      integrationId: defaultValues.integrationId || "",
    },
  });

  const { whatsappIntegrations, isLoading } = useWhatsAppIntegrations();

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "whatsappTrigger",
        integrationId: defaultValues.integrationId || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: WhatsAppTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const hasIntegrations = whatsappIntegrations.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-8">
          <DialogTitle>WhatsApp trigger</DialogTitle>
          <DialogDescription>
            Runs whenever your connected WhatsApp number receives a new message.
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
                    <Input placeholder="whatsappTrigger" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Reference the latest message with{" "}
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "whatsappTrigger"}.text}}`}
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
                      "Choose which connected WhatsApp number should trigger this workflow."
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

