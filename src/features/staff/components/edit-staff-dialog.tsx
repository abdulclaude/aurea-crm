"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ProfilePictureUploader } from "@/features/users/components/profile-picture-uploader";
import type { StaffRow } from "../types";
import { useUpdateStaff } from "../hooks/use-staff";
import { StaffRoleSelect } from "./staff-role-select";

const updateStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "INSTRUCTOR", "FRONT_DESK"]),
  hourlyRate: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  profilePhoto: z.string().nullable().optional(),
  isActive: z.boolean(),
});

type UpdateStaffFormData = z.infer<typeof updateStaffSchema>;

export function EditStaffDialog({
  staff,
  open,
  onOpenChange,
  onSuccess,
}: {
  staff: StaffRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { mutate: updateStaff, isPending } = useUpdateStaff();

  const form = useForm<UpdateStaffFormData>({
    resolver: zodResolver(updateStaffSchema),
    defaultValues: {
      name: staff.name,
      email: staff.email ?? "",
      phone: staff.phone ?? "",
      employeeId: staff.employeeId ?? "",
      role:
        staff.role === "ADMIN" ||
        staff.role === "MANAGER" ||
        staff.role === "FRONT_DESK"
          ? staff.role
          : "INSTRUCTOR",
      hourlyRate: staff.hourlyRate ? String(staff.hourlyRate) : "",
      currency: staff.currency ?? "GBP",
      profilePhoto: staff.profilePhoto,
      isActive: staff.isActive,
    },
  });

  const onSubmit = (data: UpdateStaffFormData) => {
    updateStaff(
      {
        id: staff.id,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        employeeId: data.employeeId || undefined,
        role: data.role,
        staffType: data.role,
        hourlyRate: data.hourlyRate ? Number(data.hourlyRate) : undefined,
        currency: data.currency,
        profilePhoto: data.profilePhoto ?? null,
        isActive: data.isActive,
      },
      {
        onSuccess: () => {
          toast.success("Staff member updated");
          onSuccess();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update staff member");
        },
      },
    );
  };

  const name = form.watch("name") || "Staff member";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg px-0">
        <DialogHeader className="px-6">
          <DialogTitle>Edit Staff</DialogTitle>
          <DialogDescription>Update staff details and CRM access role.</DialogDescription>
        </DialogHeader>
        <Separator className="bg-black/10 dark:bg-white/5" />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-6">
            <FormField
              control={form.control}
              name="profilePhoto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Picture</FormLabel>
                  <FormControl>
                    <ProfilePictureUploader
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isPending}
                      userName={name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Alex Morgan" {...field} />
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
                      <Input type="email" placeholder="alex@example.com" {...field} />
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
                      <Input placeholder="+44 7700 900123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <StaffRoleSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      Controls which parts of the CRM this role should access.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="25.00" {...field} />
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
                      <Input placeholder="GBP" {...field} />
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
                  <FormLabel>Active staff member</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="submit"
                variant="gradient"
                className="w-max"
                disabled={isPending}
              >
                {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
