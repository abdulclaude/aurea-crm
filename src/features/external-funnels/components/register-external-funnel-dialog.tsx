"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  externalUrl: z.string().url("Must be a valid URL"),
  trackingConfig: z.object({
    autoTrackPageViews: z.boolean(),
    autoTrackForms: z.boolean(),
    autoTrackScrollDepth: z.boolean(),
  }),
});

type FormData = z.infer<typeof formSchema>;

interface RegisterExternalFunnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RegisterExternalFunnelDialog({
  open,
  onOpenChange,
  onSuccess,
}: RegisterExternalFunnelDialogProps) {
  const [registeredFunnel, setRegisteredFunnel] = useState<{
    funnelId: string;
    apiKey: string;
  } | null>(null);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [copiedFunnelId, setCopiedFunnelId] = useState(false);
  
  const trpc = useTRPC();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      externalUrl: "",
      trackingConfig: {
        autoTrackPageViews: true,
        autoTrackForms: true,
        autoTrackScrollDepth: true,
      },
    },
  });

  const { mutate: registerFunnel, isPending } = useMutation(
    trpc.externalFunnels.register.mutationOptions({
      onSuccess: (data) => {
        setRegisteredFunnel({
          funnelId: data.funnel.id,
          apiKey: data.apiKey,
        });
      },
    })
  );

  const onSubmit = (data: FormData) => {
    registerFunnel({
      name: data.name,
      description: data.description,
      externalUrl: data.externalUrl,
      trackingConfig: data.trackingConfig,
    });
  };

  const handleCopyApiKey = () => {
    if (registeredFunnel?.apiKey) {
      navigator.clipboard.writeText(registeredFunnel.apiKey);
      setCopiedApiKey(true);
      setTimeout(() => setCopiedApiKey(false), 2000);
    }
  };

  const handleCopyFunnelId = () => {
    if (registeredFunnel?.funnelId) {
      navigator.clipboard.writeText(registeredFunnel.funnelId);
      setCopiedFunnelId(true);
      setTimeout(() => setCopiedFunnelId(false), 2000);
    }
  };

  const handleDone = () => {
    setRegisteredFunnel(null);
    form.reset();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {!registeredFunnel ? (
          <>
            <DialogHeader>
              <DialogTitle>Register External Funnel</DialogTitle>
              <DialogDescription>
                Connect an external funnel (e.g., built with Next.js, React, or any framework) to track
                events, sessions, and conversions in Aurea CRM.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funnel Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., TTR Membership Funnel"
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
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose of this funnel..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="externalUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funnel URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The primary URL where your funnel is hosted
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel>Auto-Tracking Settings</FormLabel>
                  
                  <FormField
                    control={form.control}
                    name="trackingConfig.autoTrackPageViews"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-track page views</FormLabel>
                          <FormDescription>
                            Automatically track when users view pages
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trackingConfig.autoTrackForms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-track form submissions</FormLabel>
                          <FormDescription>
                            Automatically track form submissions
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trackingConfig.autoTrackScrollDepth"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-track scroll depth</FormLabel>
                          <FormDescription>
                            Track when users scroll to 25%, 50%, 75%, and 100%
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Registering..." : "Register Funnel"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Funnel Registered Successfully!</DialogTitle>
              <DialogDescription>
                Your external funnel has been registered. Copy these credentials to integrate tracking
                into your application.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <AlertDescription className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">API Key</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono break-all">
                        {registeredFunnel.apiKey}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyApiKey}
                      >
                        {copiedApiKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Funnel ID</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono break-all">
                        {registeredFunnel.funnelId}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyFunnelId}
                      >
                        {copiedFunnelId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertDescription className="text-sm">
                  <p className="font-medium mb-2">Next Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Add these values to your application's environment variables</li>
                    <li>Install the Aurea Tracking SDK in your project</li>
                    <li>Initialize the SDK with your API key and Funnel ID</li>
                    <li>Start tracking events and conversions</li>
                  </ol>
                  <p className="mt-3 text-muted-foreground">
                    See the <a href="/docs/tracking-sdk" className="underline">documentation</a> for integration
                    instructions.
                  </p>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button onClick={handleDone}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
