import type { Metadata } from "next";

import { CommerceOperationsPage } from "@/features/commerce/components/operations";

export const metadata: Metadata = { title: "Payment Operations" };

export default function PaymentOperationsRoute() {
  return <CommerceOperationsPage />;
}
