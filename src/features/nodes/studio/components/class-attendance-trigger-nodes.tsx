"use client";

import { memo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { CalendarCheck, Trophy, UserCheck } from "lucide-react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import type {
  ClassBookedTriggerConfig,
  MemberCheckedInTriggerConfig,
  MemberClassCountTriggerConfig,
} from "@/features/nodes/studio/lib/studio-node-config";
import { ClassBookedTriggerDialog } from "./class-booked-trigger-dialog";
import { MemberCheckedInTriggerDialog } from "./member-checked-in-trigger-dialog";
import { MemberClassCountTriggerDialog } from "./member-class-count-trigger-dialog";
import { useStudioNodeSettings } from "./use-studio-node-settings";

type ConfiguredNode<T extends Record<string, unknown>> = Node<Partial<T>>;

export const ClassBookedTriggerNode: React.FC<
  NodeProps<ConfiguredNode<ClassBookedTriggerConfig>>
> = memo((props) => {
  const settings = useStudioNodeSettings<ClassBookedTriggerConfig>(props.id);
  const serviceNames = props.data.serviceTypeNames ?? [];
  const seriesNames = props.data.classSeriesNames ?? [];
  const legacyScope = props.data.classId || props.data.className;

  return (
    <>
      <ClassBookedTriggerDialog
        open={settings.open}
        onOpenChange={settings.setOpen}
        onSubmit={settings.save}
        defaultValues={props.data}
      />
      <BaseTriggerNode
        {...props}
        icon={CalendarCheck}
        name={
          props.data.triggerTiming === "ONE_HOUR_BEFORE"
            ? "One hour before class"
            : "Class booked"
        }
        description={
          props.data.triggerTiming === "ONE_HOUR_BEFORE"
            ? "One hour before the member's class starts"
            : props.data.firstBookingOnly
            ? "When a member books their first class"
            : serviceNames.length === 1
            ? `When ${serviceNames[0]} is booked`
            : serviceNames.length > 1
              ? `When any of ${serviceNames.length} services are booked`
              : seriesNames.length === 1
                ? `When ${seriesNames[0]} is booked`
                : seriesNames.length > 1
                  ? `When any of ${seriesNames.length} class series are booked`
                  : legacyScope
                    ? `When the selected class is booked`
                    : "When any class is booked"
        }
        onSettings={settings.openSettings}
        onDoubleClick={settings.openSettings}
      />
    </>
  );
});

ClassBookedTriggerNode.displayName = "ClassBookedTriggerNode";

export const MemberCheckedInTriggerNode: React.FC<
  NodeProps<ConfiguredNode<MemberCheckedInTriggerConfig>>
> = memo((props) => {
  const settings = useStudioNodeSettings<MemberCheckedInTriggerConfig>(
    props.id,
  );

  return (
    <>
      <MemberCheckedInTriggerDialog
        open={settings.open}
        onOpenChange={settings.setOpen}
        onSubmit={settings.save}
        defaultValues={props.data}
      />
      <BaseTriggerNode
        {...props}
        icon={UserCheck}
        name="Member checked in"
        description={
          props.data.firstCheckInOnly
            ? "Runs after a member's first check-in"
            : "Runs after every member check-in"
        }
        onSettings={settings.openSettings}
        onDoubleClick={settings.openSettings}
      />
    </>
  );
});

MemberCheckedInTriggerNode.displayName = "MemberCheckedInTriggerNode";

export const MemberClassCountTriggerNode: React.FC<
  NodeProps<ConfiguredNode<MemberClassCountTriggerConfig>>
> = memo((props) => {
  const settings = useStudioNodeSettings<MemberClassCountTriggerConfig>(
    props.id,
  );

  return (
    <>
      <MemberClassCountTriggerDialog
        open={settings.open}
        onOpenChange={settings.setOpen}
        onSubmit={settings.save}
        defaultValues={props.data}
      />
      <BaseTriggerNode
        {...props}
        icon={Trophy}
        name="Class milestone"
        description={
          props.data.targetCount
            ? `${props.data.targetCount} classes reached`
            : "Runs when a member reaches a class count"
        }
        onSettings={settings.openSettings}
        onDoubleClick={settings.openSettings}
      />
    </>
  );
});

MemberClassCountTriggerNode.displayName = "MemberClassCountTriggerNode";
