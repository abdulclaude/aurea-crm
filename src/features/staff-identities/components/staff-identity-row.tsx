import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StaffIdentityActions } from "@/features/staff-identities/components/staff-identity-actions";
import { StaffIdentityStatusBadge } from "@/features/staff-identities/components/staff-identity-status-badge";
import type { StaffIdentityRow as StaffIdentityRowValue } from "@/features/staff-identities/contracts";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function StaffIdentityRow({
  identity,
  canManage,
}: {
  identity: StaffIdentityRowValue;
  canManage: boolean;
}) {
  return (
    <div className="grid gap-4 border-t border-black/5 px-6 py-4 first:border-t-0 dark:border-white/5 md:grid-cols-[minmax(220px,1fr)_120px_minmax(260px,1.4fr)_40px] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="text-[11px]">
            {initials(identity.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-primary">
            {identity.displayName}
          </p>
          <p className="truncate text-[11px] text-primary/60">
            {identity.email ?? identity.phone ?? "No contact details"}
          </p>
        </div>
      </div>
      <div>
        <StaffIdentityStatusBadge status={identity.status} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {identity.sources.length > 0 ? (
          identity.sources.map((source) => (
            <Badge
              key={`${source.sourceType}-${source.sourceId}`}
              variant="outline"
              className="max-w-full gap-1 text-[10px] font-normal"
            >
              <span className="truncate">{source.label}</span>
              {source.role ? (
                <span className="text-primary/50">· {source.role}</span>
              ) : null}
            </Badge>
          ))
        ) : (
          <span className="text-[11px] text-primary/50">No linked records</span>
        )}
      </div>
      <div className="justify-self-end">
        {canManage ? <StaffIdentityActions identity={identity} /> : null}
      </div>
    </div>
  );
}
