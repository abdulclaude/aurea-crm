import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
import {
  getStaffRoleLabel,
  STAFF_EMPLOYMENT_TYPE_LABELS,
  type StaffEmploymentType,
} from "@/features/staff/constants";

const ROLE_COLORS: Record<string, string> = {
  ADMIN: TABLE_BADGE_COLORS.blue,
  MANAGER: TABLE_BADGE_COLORS.teal,
  INSTRUCTOR: TABLE_BADGE_COLORS.emerald,
  FRONT_DESK: TABLE_BADGE_COLORS.amber,
};

export function StaffRoleBadge({
  role,
}: {
  role: string | null;
}): React.JSX.Element {
  return (
    <TableBadge color={ROLE_COLORS[role ?? ""] ?? TABLE_BADGE_COLORS.slate}>
      {getStaffRoleLabel(role)}
    </TableBadge>
  );
}

export function StaffEmploymentTypeBadge({
  employmentType,
}: {
  employmentType: StaffEmploymentType | null;
}): React.JSX.Element {
  return (
    <TableBadge
      color={
        employmentType === "CONTRACTOR"
          ? TABLE_BADGE_COLORS.violet
          : employmentType === "EMPLOYEE"
            ? TABLE_BADGE_COLORS.cyan
            : TABLE_BADGE_COLORS.slate
      }
    >
      {employmentType
        ? STAFF_EMPLOYMENT_TYPE_LABELS[employmentType]
        : "Not set"}
    </TableBadge>
  );
}
