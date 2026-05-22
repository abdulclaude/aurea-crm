"use client";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export const useInstructorsList = (input?: {
  limit?: number;
  cursor?: string;
  search?: string;
  isActive?: boolean;
}) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.instructors.list.queryOptions(input || {}));
};

export const useInstructorById = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.instructors.getById.queryOptions({ id }));
};

export const useCreateInstructor = () => {
  const trpc = useTRPC();
  return useMutation(trpc.instructors.create.mutationOptions({}));
};

export const useUpdateInstructor = () => {
  const trpc = useTRPC();
  return useMutation(trpc.instructors.update.mutationOptions({}));
};

export const useDeleteInstructor = () => {
  const trpc = useTRPC();
  return useMutation(trpc.instructors.delete.mutationOptions({}));
};

export const useGenerateMagicLink = () => {
  const trpc = useTRPC();
  return useMutation(trpc.instructors.generateMagicLink.mutationOptions({}));
};

export const useVerifyMagicLink = () => {
  const trpc = useTRPC();
  return useMutation(trpc.instructors.verifyMagicLink.mutationOptions({}));
};

export const useInstructorProfile = (instructorId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.instructors.getProfile.queryOptions({ instructorId: instructorId }));
};

export const useSendMagicLinkEmail = () => {
  const trpc = useTRPC();
  return useMutation(trpc.instructors.sendMagicLinkEmail.mutationOptions({}));
};

export const useInstructorFullProfile = (instructorId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.instructors.getFullProfile.queryOptions({ instructorId: instructorId }));
};

export const useUpdateInstructorProfile = () => {
  const trpc = useTRPC();
  return useMutation(trpc.instructors.updateProfile.mutationOptions({}));
};

export const useInstructorDocuments = (instructorId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.instructors.getDocuments.queryOptions({ instructorId: instructorId }));
};

export const useCreateDocument = () => {
  const trpc = useTRPC();
  return useMutation(trpc.instructors.createDocument.mutationOptions({}));
};

export const useDeleteDocument = () => {
  const trpc = useTRPC();
  return useMutation(trpc.instructors.deleteDocument.mutationOptions({}));
};

export const useInstructorDashboard = (instructorId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.instructors.getDashboard.queryOptions({ instructorId: instructorId }));
};

export const useInstructorSchedule = (instructorId: string, startDate: Date, endDate: Date) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.instructors.getSchedule.queryOptions({ instructorId: instructorId, startDate, endDate }));
};

export const useInstructorTimeLogs = (instructorId: string, startDate: Date, endDate: Date) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.instructors.getTimeLogs.queryOptions({ instructorId: instructorId, startDate, endDate }));
};

export const useClockIn = () => {
  const trpc = useTRPC();
  return useMutation(trpc.instructors.clockIn.mutationOptions({}));
};

export const useClockOut = () => {
  const trpc = useTRPC();
  return useMutation(trpc.instructors.clockOut.mutationOptions({}));
};
