"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type RecoveryActionType } from "@/features/commerce/recovery-contracts";

import { ACTION_LABELS } from "./recovery-policy-types";

export function RecoveryPolicyStepRow(props: {
  index: number;
  day: number;
  type: RecoveryActionType;
  actionTypes: readonly RecoveryActionType[];
  disabled: boolean;
  onChange: (value: { day: number; type: RecoveryActionType }) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_2rem] items-center gap-2">
      <Input
        aria-label={`Day for step ${props.index + 1}`}
        type="number"
        min={0}
        max={365}
        value={props.day}
        disabled={props.disabled}
        onChange={(event) =>
          props.onChange({
            day: Number(event.target.value),
            type: props.type,
          })
        }
      />
      <Select
        value={props.type}
        disabled={props.disabled}
        onValueChange={(type: RecoveryActionType) =>
          props.onChange({ day: props.day, type })
        }
      >
        <SelectTrigger className="w-full shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {props.actionTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {ACTION_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Remove step"
        disabled={props.disabled}
        onClick={props.onRemove}
      >
        <Trash2 />
        <span className="sr-only">Remove step</span>
      </Button>
    </div>
  );
}
