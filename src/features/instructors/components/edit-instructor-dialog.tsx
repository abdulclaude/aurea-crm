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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AppRouter } from "@/trpc/routers/_app";
import { useUpdateInstructor } from "../hooks/use-instructors";
import { Separator } from "@/components/ui/separator";

type RouterOutput = inferRouterOutputs<AppRouter>;
type InstructorRow = RouterOutput["instructors"]["list"]["items"][number];

const updateInstructorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  role: z.string().optional(),
  hourlyRate: z.string().optional(),
  currency: z.string(),
  isActive: z.boolean(),
  bio: z.string().optional(),
  instructorCertifications: z.string().optional(),
  instructorSpecialties: z.string().optional(),
});

type UpdateInstructorFormData = z.infer<typeof updateInstructorSchema>;

export function EditInstructorDialog({
  instructor,
  open,
  onOpenChange,
  onSuccess,
}: {
  instructor: InstructorRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { mutate: updateInstructor, isPending } = useUpdateInstructor();

  const form = useForm<UpdateInstructorFormData>({
    resolver: zodResolver(updateInstructorSchema),
    defaultValues: {
      name: instructor.name,
      email: instructor.email || "",
      phone: instructor.phone || "",
      employeeId: instructor.employeeId || "",
      role: instructor.role || "",
      hourlyRate: instructor.hourlyRate ? String(instructor.hourlyRate) : "",
      currency: instructor.currency || "USD",
      isActive: instructor.isActive,
      bio: instructor.bio || "",
      instructorCertifications: (instructor.instructorCertifications ?? []).join(", "),
      instructorSpecialties: (instructor.instructorSpecialties ?? []).join(", "),
    },
  });

  const onSubmit = (data: UpdateInstructorFormData) => {
    updateInstructor(
      {
        id: instructor.id,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        employeeId: data.employeeId || undefined,
        role: data.role || undefined,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
        currency: data.currency,
        isActive: data.isActive,
        bio: data.bio || undefined,
        instructorCertifications: data.instructorCertifications
          ? data.instructorCertifications.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        instructorSpecialties: data.instructorSpecialties
          ? data.instructorSpecialties.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Instructor updated successfully");
          onSuccess();
        },
        onError: (error: any) => {
          toast.error(error.message || "Failed to update instructor");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md px-0">
        <DialogHeader className="px-6">
          <DialogTitle>Edit Instructor</DialogTitle>
          <DialogDescription>
            Update instructor information
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
                      Inactive instructors cannot access the dashboard
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

            <Separator className="bg-black/10 dark:bg-white/5" />

            <p className="text-xs font-medium text-primary/60">Instructor Profile</p>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Input placeholder="Short bio for public profile" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="instructorCertifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certifications</FormLabel>
                    <FormControl>
                      <Input placeholder="RYT-200, Pilates Mat" {...field} />
                    </FormControl>
                    <FormDescription className="text-[10px]">Comma-separated</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructorSpecialties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialties</FormLabel>
                    <FormControl>
                      <Input placeholder="Vinyasa, Yin, Prenatal" {...field} />
                    </FormControl>
                    <FormDescription className="text-[10px]">Comma-separated</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="submit"
                variant="gradient"
                className="w-max"
                disabled={isPending}
              >
                {isPending && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
