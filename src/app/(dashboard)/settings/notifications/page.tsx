import type { Metadata } from "next";

import { NotificationSettingsPage } from "@/features/notifications/components/notification-settings-page";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <NotificationSettingsPage />;
}
