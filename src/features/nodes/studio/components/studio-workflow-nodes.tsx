"use client";

import { memo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import {
  Bell,
  CalendarX,
  CreditCard,
  Gift,
  Handshake,
  HeartPulse,
  Trophy,
  UserMinus,
  Users,
} from "lucide-react";

import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import type {
  MembershipExpiringTriggerConfig,
  PricingOptionCreditTriggerConfig,
} from "@/features/nodes/studio/lib/studio-node-config";
import { MembershipExpiringTriggerDialog } from "./membership-expiring-trigger-dialog";
import { PricingOptionCreditTriggerDialog } from "./pricing-option-credit-trigger-dialog";
import { useStudioNodeSettings } from "./use-studio-node-settings";

export {
  ClassBookedTriggerNode,
  MemberCheckedInTriggerNode,
  MemberClassCountTriggerNode,
} from "./class-attendance-trigger-nodes";
export {
  ClientTagAddedTriggerNode,
  ClientTagRemovedTriggerNode,
} from "./client-tag-trigger-nodes";
export { SendSmsNode } from "./send-sms-node";

type StudioNodeData = {
  variableName?: string;
  clientId?: string;
  points?: number;
  firstPaymentOnly?: boolean;
};

type StudioNodeType = Node<StudioNodeData>;

function valueLabel(value?: string | number): string | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  return String(value);
}

export const ClassCancelledTriggerNode: React.FC<NodeProps<StudioNodeType>> =
  memo((props) => (
    <BaseTriggerNode
      {...props}
      icon={CalendarX}
      name="Class cancelled"
      description="Runs when a class booking is cancelled"
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

export const MembershipCreatedTriggerNode: React.FC<NodeProps<StudioNodeType>> =
  memo((props) => (
    <BaseTriggerNode
      {...props}
      icon={Users}
      name="Membership created"
      description="Runs when a new membership starts"
    />
  ));

export const MembershipExpiringTriggerNode: React.FC<
  NodeProps<Node<Partial<MembershipExpiringTriggerConfig>>>
> = memo((props) => {
  const settings =
    useStudioNodeSettings<MembershipExpiringTriggerConfig>(props.id);
  return (
    <>
      <MembershipExpiringTriggerDialog
        open={settings.open}
        onOpenChange={settings.setOpen}
        onSubmit={settings.save}
        defaultValues={props.data}
      />
      <BaseTriggerNode
        {...props}
        icon={Bell}
        name={
          props.data.membershipKind === "PACKAGE"
            ? "Package expiring soon"
            : "Subscription expiring"
        }
        description={`${props.data.daysBefore ?? 7} days before expiry`}
        onSettings={settings.openSettings}
        onDoubleClick={settings.openSettings}
      />
    </>
  );
});

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
  NodeProps<Node<Partial<PricingOptionCreditTriggerConfig>>>
> = memo((props) => {
  const settings =
    useStudioNodeSettings<PricingOptionCreditTriggerConfig>(props.id);
  const isCreditTrigger = props.data.creditThreshold !== undefined;
  return (
    <>
      {isCreditTrigger ? (
        <PricingOptionCreditTriggerDialog
          open={settings.open}
          onOpenChange={settings.setOpen}
          onSubmit={settings.save}
          defaultValues={props.data}
        />
      ) : null}
      <BaseTriggerNode
        {...props}
        icon={Gift}
        name={
          isCreditTrigger
            ? props.data.creditThreshold === 0
              ? "Pricing option credits used"
              : "Package credits running low"
            : "Intro offer completed"
        }
        description={
          isCreditTrigger
            ? `${props.data.creditThreshold} credits remaining`
            : "Runs when a member completes an intro offer"
        }
        onSettings={isCreditTrigger ? settings.openSettings : undefined}
        onDoubleClick={isCreditTrigger ? settings.openSettings : undefined}
      />
    </>
  );
});

export const ReferralConvertedTriggerNode: React.FC<NodeProps<StudioNodeType>> =
  memo((props) => (
    <BaseTriggerNode
      {...props}
      icon={Handshake}
      name="Referral converted"
      description="Runs when a referred member converts"
    />
  ));

export const StudioPaymentSucceededTriggerNode: React.FC<
  NodeProps<StudioNodeType>
> = memo((props) => (
  <BaseTriggerNode
    {...props}
    icon={CreditCard}
    name={
      props.data.firstPaymentOnly
        ? "First subscription payment"
        : "Payment succeeded"
    }
    description={
      props.data.firstPaymentOnly
        ? "Runs when a subscription's first payment succeeds"
        : "Runs when a studio payment succeeds"
    }
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
