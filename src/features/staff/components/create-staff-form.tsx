"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { ProfilePictureUploader } from "@/features/users/components/profile-picture-uploader";
import { useTRPC } from "@/trpc/client";
import { useCreateStaff } from "../hooks/use-staff";
import { StaffRoleSelect } from "./staff-role-select";

const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "INSTRUCTOR", "FRONT_DESK"]),
  hourlyRate: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  profilePhoto: z.string().nullable().optional(),
});

type CreateStaffFormData = z.infer<typeof createStaffSchema>;

export function CreateStaffForm() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { mutate: createStaff, isPending } = useCreateStaff();

  const form = useForm<CreateStaffFormData>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      employeeId: "",
      role: "INSTRUCTOR",
      hourlyRate: "",
      currency: "GBP",
      profilePhoto: null,
    },
  });

  const onSubmit = (data: CreateStaffFormData) => {
    createStaff(
      {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        employeeId: data.employeeId || undefined,
        role: data.role,
        staffType: data.role,
        hourlyRate: data.hourlyRate ? Number(data.hourlyRate) : undefined,
        currency: data.currency,
        profilePhoto: data.profilePhoto ?? undefined,
      },
      {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: trpc.staff.list.queryKey(),
            }),
            queryClient.invalidateQueries({
              queryKey: trpc.staff.filterOptions.queryKey(),
            }),
          ]);
          toast.success("Staff member added");
          router.push("/team");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to add staff member");
        },
      },
    );
  };

  const name = form.watch("name") || "Staff member";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6 border-b border-black/5 p-6 pt-0 dark:border-white/5">
          <FormField
            control={form.control}
            name="profilePhoto"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-primary/75">Picture</FormLabel>
                <FormControl>
                  <ProfilePictureUploader
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                    userName={name}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-primary/75">Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Alex Morgan" className="text-xs" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-primary/75">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="alex@example.com"
                      className="text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-primary/75">Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+44 7700 900123"
                      className="text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-primary/75">Role</FormLabel>
                  <FormControl>
                    <StaffRoleSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px]">
                    Controls which parts of the CRM this team member should access.
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-primary/75">
                    Employee ID
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="EMP-001" className="text-xs" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-primary/75">
                    Hourly rate
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="25.00"
                      className="text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-primary/75">Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="GBP" className="text-xs" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end px-6 pb-6">
          <Button
            type="submit"
            variant="gradient"
            className="w-max"
            disabled={isPending}
          >
            {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Add staff
          </Button>
        </div>
      </form>
      <Separator className="bg-black/5 dark:bg-white/5" />
    </Form>
  );
}
