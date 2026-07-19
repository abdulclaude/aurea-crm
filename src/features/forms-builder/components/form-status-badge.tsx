import { Badge } from "@/components/ui/badge";

const STATUS_PRESENTATION = {
  DRAFT: { color: "#d97706", label: "Draft" },
  PUBLISHED: { color: "#059669", label: "Published" },
  PAUSED: { color: "#d97706", label: "Paused" },
  ARCHIVED: { color: "#64748b", label: "Archived" },
} as const;

export function FormStatusBadge({
  status,
}: {
  status: keyof typeof STATUS_PRESENTATION;
}): React.JSX.Element {
  const presentation = STATUS_PRESENTATION[status];
  return (
    <Badge
      variant="outline"
      className="max-w-32 truncate text-[10px] ring-0"
      style={{
        backgroundColor: `${presentation.color}18`,
        borderColor: `${presentation.color}66`,
        color: presentation.color,
        boxShadow: `0 0 0 1px ${presentation.color}66`,
      }}
    >
      {presentation.label}
    </Badge>
  );
}
