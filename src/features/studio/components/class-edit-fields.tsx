import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;
const DEFAULT_POLICY_VALUE = "__default__";

export type EditableClassStatus = (typeof STATUS_OPTIONS)[number]["value"];

type PolicyOption = {
  id: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
};

export function ClassEditFields({
  cancellationPolicies,
  cancellationPolicyId,
  currentCancellationPolicyId,
  description,
  endTime,
  maxCapacity,
  name,
  setCancellationPolicyId,
  setDescription,
  setEndTime,
  setMaxCapacity,
  setName,
  setStartTime,
  setStatus,
  startTime,
  status,
}: {
  cancellationPolicies: PolicyOption[];
  cancellationPolicyId: string;
  currentCancellationPolicyId: string | null;
  description: string;
  endTime: string;
  maxCapacity: string;
  name: string;
  setCancellationPolicyId: (value: string) => void;
  setDescription: (value: string) => void;
  setEndTime: (value: string) => void;
  setMaxCapacity: (value: string) => void;
  setName: (value: string) => void;
  setStartTime: (value: string) => void;
  setStatus: (value: EditableClassStatus) => void;
  startTime: string;
  status: EditableClassStatus;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="class-name">Name</Label>
        <Input
          id="class-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="class-description">Description</Label>
        <Textarea
          id="class-description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <DateTimeField
          id="class-start"
          label="Start"
          value={startTime}
          onChange={setStartTime}
        />
        <DateTimeField
          id="class-end"
          label="End"
          value={endTime}
          onChange={setEndTime}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="class-cancellation-policy">Cancellation policy</Label>
        <Select
          value={cancellationPolicyId || DEFAULT_POLICY_VALUE}
          onValueChange={(value) =>
            setCancellationPolicyId(value === DEFAULT_POLICY_VALUE ? "" : value)
          }
        >
          <SelectTrigger id="class-cancellation-policy" className="w-full">
            <SelectValue placeholder="Use default policy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_POLICY_VALUE}>
              Use default policy
            </SelectItem>
            {cancellationPolicies
              .filter(
                (policy) =>
                  policy.isActive || policy.id === currentCancellationPolicyId,
              )
              .map((policy) => (
                <SelectItem
                  key={policy.id}
                  value={policy.id}
                  disabled={!policy.isActive}
                >
                  {policy.name}
                  {policy.isDefault ? " (default)" : ""}
                  {!policy.isActive ? " (archived)" : ""}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="class-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              if (isEditableClassStatus(value)) setStatus(value);
            }}
          >
            <SelectTrigger id="class-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="class-capacity">Capacity</Label>
          <Input
            id="class-capacity"
            type="number"
            min="1"
            value={maxCapacity}
            onChange={(event) => setMaxCapacity(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function DateTimeField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <DateTimePicker
        value={value}
        onChange={onChange}
        dateAriaLabel={`${label} date`}
        timeAriaLabel={`${label} time`}
      />
    </div>
  );
}

function isEditableClassStatus(value: string): value is EditableClassStatus {
  return STATUS_OPTIONS.some((option) => option.value === value);
}

export function editableClassStatus(value: string): EditableClassStatus {
  return isEditableClassStatus(value) ? value : "SCHEDULED";
}
