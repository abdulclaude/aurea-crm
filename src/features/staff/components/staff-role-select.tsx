"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STAFF_ROLES,
  type StaffRoleValue,
} from "@/features/staff/constants";

export function StaffRoleSelect({
  value,
  onValueChange,
  disabled,
}: {
  value: StaffRoleValue;
  onValueChange: (value: StaffRoleValue) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as StaffRoleValue)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a role" />
      </SelectTrigger>
      <SelectContent>
        {STAFF_ROLES.map((role) => (
          <SelectItem key={role.value} value={role.value} className="py-3!">
            <div className="flex flex-col items-start">
              <span className="font-medium">{role.label}</span>
              <span className="text-[11px] text-muted-foreground">
                {role.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
