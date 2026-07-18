import type { Metadata } from "next";

import { RecoveryOperationsPage } from "@/features/commerce/components/recovery/recovery-operations-page";

export const metadata: Metadata = { title: "Recovery Operations" };

export default function RecoveryOperationsRoute() {
  return <RecoveryOperationsPage />;
}
