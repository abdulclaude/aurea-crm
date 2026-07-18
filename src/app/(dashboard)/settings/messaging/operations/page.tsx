import type { Metadata } from "next";

import { DeliveryOperationsPage } from "@/features/delivery/components";

export const metadata: Metadata = { title: "Delivery Operations" };

export default function DeliveryOperationsRoute() {
  return <DeliveryOperationsPage />;
}
