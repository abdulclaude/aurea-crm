import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function InboxRouteField({
  id,
  label,
  required = false,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function InboxRouteToggle(props: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Switch {...props} />
      <Label htmlFor={props.id}>{props.label}</Label>
    </div>
  );
}
