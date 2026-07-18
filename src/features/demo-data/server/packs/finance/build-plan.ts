import {
  currencyExponent,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import type { DemoSeedContext } from "@/features/demo-data/server/types";
import { buildExtraLedgerFixtures } from "./extra-ledger";
import { buildInvoiceFixtures } from "./invoices";
import { assertFinanceFixturePlan } from "./invariants";
import { buildPaymentFixtures } from "./payments";
import { buildReconciliationFixtures } from "./reconciliation";
import { buildPaymentRecoveryFixtures } from "./recovery-fixtures";
import { buildRecoverySourceFixtures } from "./recovery-sources";
import { buildRecurringInvoiceFixtures } from "./recurring-invoices";
import {
  createFinanceFixturePlan,
  type FinanceFixturePlan,
  type FinancePackDependencies,
} from "./types";

export function buildFinanceFixturePlan(
  context: DemoSeedContext,
  dependencies: FinancePackDependencies,
): FinanceFixturePlan {
  if (
    dependencies.clients.length === 0 ||
    dependencies.products.length + dependencies.pricingOptions.length === 0
  ) {
    throw new Error(
      "Finance demo pack requires clients and saleable catalogue items",
    );
  }
  const plan = createFinanceFixturePlan();
  const currency = normalizeCurrency(context.currency);
  const exponent = currencyExponent(currency);
  buildPaymentFixtures(plan, context, dependencies);
  buildInvoiceFixtures(plan, context, dependencies, currency, exponent);
  buildRecurringInvoiceFixtures(
    plan,
    context,
    dependencies,
    currency,
    exponent,
  );
  buildExtraLedgerFixtures(plan, context, dependencies, currency, exponent);
  buildReconciliationFixtures(plan, context);
  const recoverySources = buildRecoverySourceFixtures(
    plan,
    context,
    dependencies,
  );
  buildPaymentRecoveryFixtures(plan, context, dependencies, recoverySources);
  assertFinanceFixturePlan(plan, exponent);
  return plan;
}
