"use client";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import type { StaffRoleValue } from "@/features/staff/constants";
import { useTRPC } from "@/trpc/client";

type StaffSortValue =
  | "createdAt.desc"
  | "createdAt.asc"
  | "name.asc"
  | "name.desc"
  | "role.asc"
  | "role.desc"
  | "staffType.asc"
  | "staffType.desc";

export function useStaffList(input?: {
  page?: number;
  pageSize?: number;
  search?: string;
  roles?: StaffRoleValue[];
  staffTypes?: string[];
  isActive?: boolean;
  sort?: StaffSortValue;
  locationId?: string;
  includeAllLocations?: boolean;
}) {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.staff.list.queryOptions(input ?? {}));
}

export function useCreateStaff() {
  const trpc = useTRPC();
  return useMutation(trpc.staff.create.mutationOptions({}));
}

export function useUpdateStaff() {
  const trpc = useTRPC();
  return useMutation(trpc.staff.update.mutationOptions({}));
}

export function useDeleteStaff() {
  const trpc = useTRPC();
  return useMutation(trpc.staff.delete.mutationOptions({}));
}
