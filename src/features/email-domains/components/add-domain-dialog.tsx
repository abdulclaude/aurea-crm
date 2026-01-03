"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const addDomainSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
      "Please enter a valid domain (e.g., mail.example.com or aureamedia.co.uk)"
    ),
  defaultFromName: z.string().optional(),
  defaultFromEmail: z.string().optional(),
  defaultReplyTo: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
});

type AddDomainFormData = z.infer<typeof addDomainSchema>;

export function AddDomainDialog() {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<AddDomainFormData>({
    resolver: zodResolver(addDomainSchema),
    defaultValues: {
      domain: "",
      defaultFromName: "",
      defaultFromEmail: "",
      defaultReplyTo: "",
    },
  });

  const createMutation = useMutation(
    trpc.emailDomains.create.mutationOptions({
      onSuccess: () => {
        toast.success("Domain added! Check DNS records to verify.");
        queryClient.invalidateQueries({
          queryKey: trpc.emailDomains.list.queryKey(),
        });
        setOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add domain");
      },
    })
  );

  const onSubmit = (data: AddDomainFormData) => {
    createMutation.mutate({
      domain: data.domain,
      defaultFromName: data.defaultFromName || undefined,
      defaultFromEmail: data.defaultFromEmail || undefined,
      defaultReplyTo: data.defaultReplyTo || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Domain
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Email Domain</DialogTitle>
          <DialogDescription>
            Add a custom domain to send emails with your own branding.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="e.g., mail.example.com"
              {...form.register("domain")}
            />
            {form.formState.errors.domain && (
              <p className="text-sm text-destructive">
                {form.formState.errors.domain.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              We recommend using a subdomain like mail.yourdomain.com
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="defaultFromName">
              Default From Name (optional)
            </Label>
            <Input
              id="defaultFromName"
              placeholder="e.g., Your Company"
              {...form.register("defaultFromName")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="defaultFromEmail">
              Default From Email Prefix (optional)
            </Label>
            <Input
              id="defaultFromEmail"
              placeholder="e.g., hello"
              {...form.register("defaultFromEmail")}
            />
            <p className="text-xs text-muted-foreground">
              Will be used as the prefix before @yourdomain.com
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="defaultReplyTo">Default Reply-To (optional)</Label>
            <Input
              id="defaultReplyTo"
              type="email"
              placeholder="e.g., support@example.com"
              {...form.register("defaultReplyTo")}
            />
            {form.formState.errors.defaultReplyTo && (
              <p className="text-sm text-destructive">
                {form.formState.errors.defaultReplyTo.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Domain
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
