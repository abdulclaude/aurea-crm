import type {
  booking,
  bookingEventType,
  commerceLedgerEntry,
  commerceOperation,
  commerceReconciliationIssue,
  commerceReconciliationRun,
  commerceTenderAllocation,
  invoice,
  invoiceLineItem,
  invoicePayment,
  invoiceReminder,
  invoiceTemplate,
  paymentRecoveryAction,
  paymentRecoveryAttempt,
  paymentRecoveryCase,
  paymentRecoveryLink,
  paymentRecoveryPolicy,
  recurringInvoice,
  recurringInvoiceGeneration,
  studioBookingPayment,
  studioPayment,
  studioPaymentLineItem,
} from "@/db/schema";

export type FinancePackDependencies = {
  clients: Array<{ id: string; name: string; email: string }>;
  instructors: Array<{ id: string; name: string; email: string }>;
  classes: Array<{ id: string; startTime: Date }>;
  bookings: Array<{
    id: string;
    classId: string;
    clientId?: string;
    status?: "BOOKED" | "ATTENDED" | "CANCELLED" | "NO_SHOW" | "LATE_CANCEL";
    paymentStatus?:
      | "NOT_REQUIRED"
      | "REQUIRES_PAYMENT"
      | "PROCESSING"
      | "PAID"
      | "FAILED"
      | "EXPIRED"
      | "REFUNDED";
    amount?: string | null;
  }>;
  memberships: Array<{
    id: string;
    clientId: string;
    status:
      | "ACTIVE"
      | "PAST_DUE"
      | "INACTIVE"
      | "CANCELLED"
      | "EXPIRED"
      | "PAUSED";
    price: string | null;
    recoveryScenario?: "PAST_DUE" | "RECOVERED" | null;
  }>;
  products: Array<{ id: string; name: string; price: string }>;
  pricingOptions: Array<{ id: string; name: string; price: string }>;
};

export type PaymentSeed = typeof studioPayment.$inferInsert;
export type PaymentLineSeed = typeof studioPaymentLineItem.$inferInsert;
export type OperationSeed = typeof commerceOperation.$inferInsert;
export type LedgerSeed = typeof commerceLedgerEntry.$inferInsert;
export type TenderSeed = typeof commerceTenderAllocation.$inferInsert;
export type InvoiceSeed = typeof invoice.$inferInsert;
export type InvoiceLineSeed = typeof invoiceLineItem.$inferInsert;
export type InvoicePaymentSeed = typeof invoicePayment.$inferInsert;
export type InvoiceReminderSeed = typeof invoiceReminder.$inferInsert;

export type FinanceFixturePlan = {
  payments: PaymentSeed[];
  paymentLines: PaymentLineSeed[];
  bookingPayments: Array<typeof studioBookingPayment.$inferInsert>;
  operations: OperationSeed[];
  ledgerEntries: LedgerSeed[];
  tenders: TenderSeed[];
  invoiceTemplates: Array<typeof invoiceTemplate.$inferInsert>;
  invoices: InvoiceSeed[];
  invoiceLines: InvoiceLineSeed[];
  invoicePayments: InvoicePaymentSeed[];
  invoiceReminders: InvoiceReminderSeed[];
  recurringInvoices: Array<typeof recurringInvoice.$inferInsert>;
  recurringGenerations: Array<typeof recurringInvoiceGeneration.$inferInsert>;
  reconciliationRuns: Array<typeof commerceReconciliationRun.$inferInsert>;
  reconciliationIssues: Array<typeof commerceReconciliationIssue.$inferInsert>;
  bookingEventTypes: Array<typeof bookingEventType.$inferInsert>;
  appointmentBookings: Array<typeof booking.$inferInsert>;
  recoveryPolicies: Array<typeof paymentRecoveryPolicy.$inferInsert>;
  recoveryCases: Array<typeof paymentRecoveryCase.$inferInsert>;
  recoveryActions: Array<typeof paymentRecoveryAction.$inferInsert>;
  recoveryAttempts: Array<typeof paymentRecoveryAttempt.$inferInsert>;
  recoveryLinks: Array<typeof paymentRecoveryLink.$inferInsert>;
  recoveryMembershipSourceIds: string[];
};

export function createFinanceFixturePlan(): FinanceFixturePlan {
  return {
    payments: [],
    paymentLines: [],
    bookingPayments: [],
    operations: [],
    ledgerEntries: [],
    tenders: [],
    invoiceTemplates: [],
    invoices: [],
    invoiceLines: [],
    invoicePayments: [],
    invoiceReminders: [],
    recurringInvoices: [],
    recurringGenerations: [],
    reconciliationRuns: [],
    reconciliationIssues: [],
    bookingEventTypes: [],
    appointmentBookings: [],
    recoveryPolicies: [],
    recoveryCases: [],
    recoveryActions: [],
    recoveryAttempts: [],
    recoveryLinks: [],
    recoveryMembershipSourceIds: [],
  };
}
