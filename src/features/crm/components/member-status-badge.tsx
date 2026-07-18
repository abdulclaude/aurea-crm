import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
import { labelize } from "./member-lifecycle-types";

const STATUS_TONES: Record<string, string> = {
  ACTIVE: TABLE_BADGE_COLORS.teal,
  ATTENDED: TABLE_BADGE_COLORS.teal,
  CHECKED_IN: TABLE_BADGE_COLORS.teal,
  PAID: TABLE_BADGE_COLORS.teal,
  REDEEMED: TABLE_BADGE_COLORS.teal,
  SIGNED: TABLE_BADGE_COLORS.teal,
  SUCCEEDED: TABLE_BADGE_COLORS.teal,
  CURRENT: TABLE_BADGE_COLORS.teal,
  BOOKED: TABLE_BADGE_COLORS.blue,
  OPEN: TABLE_BADGE_COLORS.blue,
  SCHEDULED: TABLE_BADGE_COLORS.blue,
  DRAFT: TABLE_BADGE_COLORS.amber,
  PAUSED: TABLE_BADGE_COLORS.amber,
  PENDING: TABLE_BADGE_COLORS.amber,
  CANCELLED: TABLE_BADGE_COLORS.rose,
  EXPIRED: TABLE_BADGE_COLORS.rose,
  FAILED: TABLE_BADGE_COLORS.rose,
  MISSING: TABLE_BADGE_COLORS.rose,
  VOID: TABLE_BADGE_COLORS.rose,
};

export function memberStatusBadgeColor(status: string): string {
  return STATUS_TONES[status.toUpperCase()] ?? TABLE_BADGE_COLORS.slate;
}

export function MemberStatusBadge({ status }: { status: string }) {
  return (
    <TableBadge
      color={memberStatusBadgeColor(status)}
      className="font-normal capitalize"
    >
      {labelize(status)}
    </TableBadge>
  );
}
