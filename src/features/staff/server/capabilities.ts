import type {
  StaffRoleValue,
  StaffTypeValue,
} from "@/features/staff/constants";

export function getStaffProfileCapabilities(
  staffType: StaffTypeValue,
  role: StaffRoleValue,
) {
  return {
    canTeachClasses: staffType === "INSTRUCTOR",
    canTakeAppointments:
      staffType === "INSTRUCTOR" || role === "MANAGER" || role === "ADMIN",
    canHandleReservations:
      role === "FRONT_DESK" || role === "MANAGER" || role === "ADMIN",
    canLeadWorkshops:
      staffType === "INSTRUCTOR" || role === "MANAGER" || role === "ADMIN",
  };
}
