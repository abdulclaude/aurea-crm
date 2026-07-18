"use client";

import { Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recoveryActionsByTarget } from "@/features/commerce/recovery-contracts";

import { RecoveryPolicyStepRow } from "./recovery-policy-step-row";
import type { RecoveryPolicyEditorValue } from "./recovery-policy-types";

export function RecoveryPolicyForm(props: {
  value: RecoveryPolicyEditorValue;
  canInherit: boolean;
  canManage: boolean;
  isPending: boolean;
  onChange: (value: RecoveryPolicyEditorValue) => void;
  onSave: () => void;
}) {
  const disabled = !props.canManage || props.value.mode === "INHERIT";
  return (
    <div className="divide-y">
      <section className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <div className="space-y-2">
          <Label htmlFor="recovery-mode">Behavior</Label>
          <Select
            value={props.value.mode}
            disabled={!props.canManage}
            onValueChange={(mode: RecoveryPolicyEditorValue["mode"]) =>
              props.onChange({ ...props.value, mode })
            }
          >
            <SelectTrigger id="recovery-mode" className="w-full shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {props.canInherit && (
                <SelectItem value="INHERIT">Use organization policy</SelectItem>
              )}
              <SelectItem value="ENABLED">Enabled</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="recovery-name">Policy name</Label>
          <Input
            id="recovery-name"
            value={props.value.name}
            disabled={disabled}
            onChange={(event) =>
              props.onChange({ ...props.value, name: event.target.value })
            }
          />
        </div>
        {props.value.target === "MEMBERSHIP" && (
          <div className="space-y-2">
            <Label htmlFor="grace-period">Grace period in days</Label>
            <Input
              id="grace-period"
              type="number"
              min={0}
              max={90}
              value={props.value.gracePeriodDays}
              disabled={disabled}
              onChange={(event) =>
                props.onChange({
                  ...props.value,
                  gracePeriodDays: Number(event.target.value),
                })
              }
            />
          </div>
        )}
      </section>
      <section className="space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="text-sm font-medium">Recovery schedule</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Days are counted from the first verified payment failure.
          </p>
        </div>
        <div className="max-w-2xl space-y-2">
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_2rem] gap-2 text-xs text-muted-foreground">
            <span>Day</span>
            <span>Action</span>
            <span />
          </div>
          {props.value.schedule.map((step, index) => (
            <RecoveryPolicyStepRow
              key={`${index}-${step.type}`}
              index={index}
              {...step}
              actionTypes={recoveryActionsByTarget[props.value.target]}
              disabled={disabled}
              onChange={(nextStep) => {
                const schedule = props.value.schedule.map((item, itemIndex) =>
                  itemIndex === index ? nextStep : item,
                );
                props.onChange({ ...props.value, schedule });
              }}
              onRemove={() =>
                props.onChange({
                  ...props.value,
                  schedule: props.value.schedule.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                })
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || props.value.schedule.length >= 20}
            onClick={() =>
              props.onChange({
                ...props.value,
                schedule: [
                  ...props.value.schedule,
                  { day: 0, type: "SEND_EMAIL" },
                ],
              })
            }
          >
            <Plus /> Add step
          </Button>
        </div>
      </section>
      <footer className="flex justify-end p-6 sm:px-8">
        <Button
          type="button"
          variant="gradient"
          className="w-auto"
          disabled={!props.canManage || props.isPending}
          onClick={props.onSave}
        >
          <Save /> {props.isPending ? "Saving..." : "Save new version"}
        </Button>
      </footer>
    </div>
  );
}
