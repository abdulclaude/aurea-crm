import { inngest } from "@/inngest/client";
import { expireDueBookingPaymentHolds } from "@/features/commerce/server/recovery/booking-hold-expiration";
import {
  processDuePaymentRecoveryActions,
  recoverExpiredPaymentRecoveryLeases,
} from "@/features/commerce/server/recovery/payment-recovery-action-runner";
import { openDueInvoiceRecoveryCases } from "@/features/commerce/server/recovery/overdue-invoice-recovery";
import { dispatchPendingPaidClassBookingWorkflows } from "@/features/studio/server/paid-class-booking-workflow-dispatch";

export const processPaymentRecovery = inngest.createFunction(
  {
    id: "process-payment-recovery",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const leases = await step.run("recover-expired-action-leases", () =>
      recoverExpiredPaymentRecoveryLeases(),
    );
    const expiredHolds = await step.run("expire-booking-payment-holds", () =>
      expireDueBookingPaymentHolds(),
    );
    const overdueInvoices = await step.run("open-overdue-invoice-cases", () =>
      openDueInvoiceRecoveryCases(),
    );
    const actions = await step.run("process-due-recovery-actions", () =>
      processDuePaymentRecoveryActions(),
    );
    const classBookingWorkflows = await step.run(
      "dispatch-paid-class-booking-workflows",
      () => dispatchPendingPaidClassBookingWorkflows(),
    );
    return {
      leases,
      expiredHolds,
      overdueInvoices,
      actions,
      classBookingWorkflows,
    };
  },
);
