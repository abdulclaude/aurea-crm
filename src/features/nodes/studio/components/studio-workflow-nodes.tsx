"use client";

import { memo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import {
  Bell,
  CalendarCheck,
  CalendarX,
  CreditCard,
  Gift,
  HeartPulse,
  MessageSquare,
  Tag,
  Trophy,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";

type StudioNodeData = {
  variableName?: string;
  clientId?: string;
  tag?: string;
  message?: string;
  points?: number;
  targetCount?: number;
};

type StudioNodeType = Node<StudioNodeData>;

function valueLabel(value?: string | number): string | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  return String(value);
}

export const ClassBookedTriggerNode: React.FC<NodeProps<StudioNodeType>> = memo(
  (props) => (
    <BaseTriggerNode
      {...props}
      icon={CalendarCheck}
      name="Class booked"
      description="Runs when a member books a class"
    />
  ),
);

export const ClassCancelledTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={CalendarX}
    name="Class cancelled"
    description="Runs when a class booking is cancelled"
  />
));

export const MemberCheckedInTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={UserCheck}
    name="Member checked in"
    description="Runs after a member checks in"
  />
));

export const MemberNoShowTriggerNode: React.FC<NodeProps<StudioNodeType>> =
  memo((props) => (
    <BaseTriggerNode
      {...props}
      icon={UserMinus}
      name="Member no-show"
      description="Runs when a member is marked no-show"
    />
  ));

export const MembershipCreatedTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={Users}
    name="Membership created"
    description="Runs when a new membership starts"
  />
));

export const MembershipExpiringTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={Bell}
    name="Membership expiring"
    description="Runs when a membership is nearing expiry"
  />
));

export const MembershipCancelledTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={UserMinus}
    name="Membership cancelled"
    description="Runs when a membership is cancelled"
  />
));

export const WaitlistSpotOpenedTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={Bell}
    name="Waitlist spot opened"
    description="Runs when a waitlist spot opens"
  />
));

export const IntroOfferRedeemedTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={Gift}
    name="Intro offer redeemed"
    description="Runs when an intro offer is redeemed"
  />
));

export const IntroOfferCompletedTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={Gift}
    name="Intro offer completed"
    description="Runs when a member completes an intro offer"
  />
));

export const MemberClassCountTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={Trophy}
    name="Class milestone"
    description={
      valueLabel(props.data?.targetCount)
        ? `${props.data.targetCount} classes reached`
        : "Runs when a member reaches a class count"
    }
  />
));

export const ClientTagAddedTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={Tag}
    name="Member tag added"
    description={
      valueLabel(props.data?.tag)
        ? `Tag: ${props.data.tag}`
        : "Runs when a member tag is added"
    }
  />
));

export const ClientTagRemovedTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={Tag}
    name="Member tag removed"
    description={
      valueLabel(props.data?.tag)
        ? `Tag: ${props.data.tag}`
        : "Runs when a member tag is removed"
    }
  />
));

export const StudioPaymentSucceededTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={CreditCard}
    name="Payment succeeded"
    description="Runs when a studio payment succeeds"
  />
));

export const StudioPaymentFailedTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={CreditCard}
    name="Payment failed"
    description="Runs when a studio payment fails"
  />
));

export const SendClassReminderNode: React.FC<NodeProps<StudioNodeType>> = memo(
  (props) => (
    <BaseExecutionNode
      {...props}
      icon={Bell}
      name="Send class reminder"
      description="Queue reminders for class attendees"
    />
  ),
);

export const AwardLoyaltyPointsNode: React.FC<NodeProps<StudioNodeType>> = memo(
  (props) => (
    <BaseExecutionNode
      {...props}
      icon={Trophy}
      name="Award loyalty points"
      description={
        valueLabel(props.data?.points)
          ? `${props.data.points} points`
          : "Award points to a member"
      }
    />
  ),
);

export const CalculateChurnScoreNode: React.FC<NodeProps<StudioNodeType>> =
  memo((props) => (
    <BaseExecutionNode
      {...props}
      icon={HeartPulse}
      name="Calculate churn score"
      description="Refresh a member churn prediction"
    />
  ));

export const SendSmsNode: React.FC<NodeProps<StudioNodeType>> = memo(
  (props) => (
    <BaseExecutionNode
      {...props}
      icon={MessageSquare}
      name="Send SMS"
      description={
        valueLabel(props.data?.message)
          ? props.data.message
          : "Send an SMS message"
      }
    />
  ),
);
