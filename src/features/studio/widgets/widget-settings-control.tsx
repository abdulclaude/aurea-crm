import { WidgetType } from "@/db/enums";
import { BookingWidgetSettingsDialog } from "@/features/studio/widgets/booking-widget-settings-dialog";
import { EventWidgetSettingsDialog } from "@/features/studio/widgets/event-widget-settings-dialog";
import { InstructorWidgetSettingsDialog } from "@/features/studio/widgets/instructor-widget-settings-dialog";
import { IntroOfferWidgetSettingsDialog } from "@/features/studio/widgets/intro-offer-widget-settings-dialog";
import type { WidgetListItem } from "@/features/studio/widgets/widget-list-types";
import { MembershipWidgetSettingsDialog } from "@/features/studio/widgets/membership-widget-settings-dialog";
import { OnDemandWidgetSettingsDialog } from "@/features/studio/widgets/on-demand-widget-settings-dialog";
import { ReferralWidgetSettingsDialog } from "@/features/studio/widgets/referral-widget-settings-dialog";
import { WidgetSettingsDialog } from "@/features/studio/widgets/widget-settings-dialog";

export function WidgetSettingsControl({
  widget,
}: {
  widget: WidgetListItem;
}): React.JSX.Element {
  switch (widget.type) {
    case WidgetType.SCHEDULE:
      return <WidgetSettingsDialog widget={widget} />;
    case WidgetType.BOOKING:
      return <BookingWidgetSettingsDialog widget={widget} />;
    case WidgetType.INSTRUCTORS:
      return <InstructorWidgetSettingsDialog widget={widget} />;
    case WidgetType.MEMBERSHIP:
      return <MembershipWidgetSettingsDialog widget={widget} />;
    case WidgetType.INTRO_OFFER:
      return <IntroOfferWidgetSettingsDialog widget={widget} />;
    case WidgetType.EVENT:
      return <EventWidgetSettingsDialog widget={widget} />;
    case WidgetType.ON_DEMAND:
      return <OnDemandWidgetSettingsDialog widget={widget} />;
    case WidgetType.REFERRAL:
      return <ReferralWidgetSettingsDialog widget={widget} />;
  }
}
