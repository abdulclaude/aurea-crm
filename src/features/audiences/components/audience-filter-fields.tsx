"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagsInput } from "@/components/ui/tags-input";
import { AudienceDateFields } from "@/features/audiences/components/audience-date-fields";
import { AudienceAttendanceFields } from "@/features/audiences/components/audience-attendance-fields";
import { AudienceCommerceFields } from "@/features/audiences/components/audience-commerce-fields";
import {
  AudienceOptionGroup,
  type AudienceOption,
} from "@/features/audiences/components/audience-option-group";
import type { SavedAudienceDefinition } from "@/features/audiences/lib/audience-definition";
import {
  ACQUISITION_STAGE_VALUES,
  CLIENT_TYPE_VALUES,
  LIFECYCLE_STAGE_VALUES,
} from "@/features/crm/constants";

type AudienceFilterFieldsProps = {
  definition: SavedAudienceDefinition;
  assignees: AudienceOption[];
  instructors: AudienceOption[];
  membershipPlans: AudienceOption[];
  disabled?: boolean;
  onChange: (definition: SavedAudienceDefinition) => void;
};

function labelFor(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

const TYPE_OPTIONS = CLIENT_TYPE_VALUES.map((value) => ({
  value,
  label: labelFor(value),
}));
const LIFECYCLE_OPTIONS = LIFECYCLE_STAGE_VALUES.map((value) => ({
  value,
  label: labelFor(value),
}));
const ACQUISITION_OPTIONS = ACQUISITION_STAGE_VALUES.map((value) => ({
  value,
  label: labelFor(value),
}));

export function AudienceFilterFields({
  definition,
  assignees,
  instructors,
  membershipPlans,
  disabled = false,
  onChange,
}: AudienceFilterFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Match filters</Label>
        <Select
          value={definition.operator}
          disabled={disabled}
          onValueChange={(operator: "AND" | "OR") =>
            onChange({ ...definition, operator })
          }
        >
          <SelectTrigger className="w-full md:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">All selected filters</SelectItem>
            <SelectItem value="OR">Any selected filter</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="audience-search">Customer search</Label>
        <Input
          id="audience-search"
          value={definition.search}
          disabled={disabled}
          placeholder="Name, email, phone, or company"
          onChange={(event) =>
            onChange({ ...definition, search: event.target.value })
          }
        />
      </div>

      <AudienceOptionGroup
        label="Customer type"
        options={TYPE_OPTIONS}
        value={definition.types}
        disabled={disabled}
        onChange={(types) => onChange({ ...definition, types })}
      />
      <AudienceOptionGroup
        label="Lifecycle stage"
        options={LIFECYCLE_OPTIONS}
        value={definition.lifecycleStages}
        disabled={disabled}
        onChange={(lifecycleStages) =>
          onChange({ ...definition, lifecycleStages })
        }
      />
      <AudienceOptionGroup
        label="Acquisition stage"
        options={ACQUISITION_OPTIONS}
        value={definition.acquisitionStages}
        disabled={disabled}
        onChange={(acquisitionStages) =>
          onChange({ ...definition, acquisitionStages })
        }
      />

      <div className="grid gap-4 md:grid-cols-[140px_1fr]">
        <div className="space-y-2">
          <Label>Tag match</Label>
          <Select
            value={definition.tags.mode}
            disabled={disabled}
            onValueChange={(mode: "ANY" | "ALL" | "NONE") =>
              onChange({
                ...definition,
                tags: { ...definition.tags, mode },
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ANY">Any tag</SelectItem>
              <SelectItem value="ALL">All tags</SelectItem>
              <SelectItem value="NONE">Exclude these tags</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tags</Label>
          <TagsInput
            value={definition.tags.values}
            readOnly={disabled}
            placeholder="Add customer tags"
            onChange={(values) =>
              onChange({ ...definition, tags: { ...definition.tags, values } })
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Countries</Label>
          <TagsInput
            value={definition.countries}
            readOnly={disabled}
            placeholder="Add exact country values"
            onChange={(countries) => onChange({ ...definition, countries })}
          />
        </div>
        <div className="space-y-2">
          <Label>Sources</Label>
          <TagsInput
            value={definition.sources}
            readOnly={disabled}
            placeholder="Add exact source values"
            onChange={(sources) => onChange({ ...definition, sources })}
          />
        </div>
      </div>

      {assignees.length > 0 ? (
        <AudienceOptionGroup
          label="Assigned team members"
          options={assignees}
          value={definition.assigneeIds}
          disabled={disabled}
          onChange={(assigneeIds) => onChange({ ...definition, assigneeIds })}
        />
      ) : null}
      {instructors.length > 0 ? (
        <AudienceOptionGroup
          label="Assigned instructors"
          options={instructors}
          value={definition.instructorIds}
          disabled={disabled}
          onChange={(instructorIds) =>
            onChange({ ...definition, instructorIds })
          }
        />
      ) : null}

      <AudienceDateFields
        definition={definition}
        disabled={disabled}
        onChange={onChange}
      />
      <AudienceCommerceFields
        definition={definition}
        membershipPlans={membershipPlans}
        disabled={disabled}
        onChange={onChange}
      />
      <AudienceAttendanceFields
        definition={definition}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}
