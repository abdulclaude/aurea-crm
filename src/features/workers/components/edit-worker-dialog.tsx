"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { inferRouterOutputs } from "@trpc/server";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AppRouter } from "@/trpc/routers/_app";
import { useUpdateWorker } from "../hooks/use-workers";
import { Separator } from "@/components/ui/separator";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Worker = RouterOutput["workers"]["list"]["items"][number];

const updateWorkerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  role: z.string().optional(),
  hourlyRate: z.string().optional(),
  currency: z.string(),
  isActive: z.boolean(),
});

type UpdateWorkerFormData = z.infer<typeof updateWorkerSchema>;

export function EditWorkerDialog({
  worker,
  open,
  onOpenChange,
  onSuccess,
}: {
  worker: Worker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { mutate: updateWorker, isPending } = useUpdateWorker();

  const form = useForm<UpdateWorkerFormData>({
    resolver: zodResolver(updateWorkerSchema),
    defaultValues: {
      name: worker.name,
      email: worker.email || "",
      phone: worker.phone || "",
      employeeId: worker.employeeId || "",
      role: worker.role || "",
      hourlyRate: worker.hourlyRate ? String(worker.hourlyRate) : "",
      currency: worker.currency || "USD",
      isActive: worker.isActive,
    },
  });

  const onSubmit = (data: UpdateWorkerFormData) => {
    updateWorker(
      {
        id: worker.id,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        employeeId: data.employeeId || undefined,
        role: data.role || undefined,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
        currency: data.currency,
        isActive: data.isActive,
      },
      {
        onSuccess: () => {
          toast.success("Worker updated successfully");
          onSuccess();
        },
        onError: (error: any) => {
          toast.error(error.message || "Failed to update worker");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md px-0">
        <DialogHeader className="px-6">
          <DialogTitle>Edit Worker</DialogTitle>
          <DialogDescription>
            Update worker information and portal access
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-black/10 dark:bg-white/5" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 px-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input placeholder="EMP-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Input placeholder="Carer, Cleaner, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="25.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="USD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <div className="text-xs text-primary/60">
                      Inactive workers cannot access the portal
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              {/* <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button> */}

              <Button
                type="submit"
                variant="gradient"
                className="w-max"
                disabled={isPending}
              >
                {isPending && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
