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
import { Separator } from "@/components/ui/separator"

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
    },
  });

  const createMutation = useMutation(
    trpc.emailDomains.create.mutationOptions({
      onSuccess: () => {
        toast.success("Domain provisioning started");
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
    createMutation.mutate({ domain: data.domain });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-max" variant="gradient">
          <Plus className="size-3" />
          Add domain
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add sender domain</DialogTitle>
        </DialogHeader>

        <Separator />

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3">
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

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-max" variant="gradient" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <></>
              )}
              Add domain
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
