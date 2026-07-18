import { and, eq } from "drizzle-orm";

import {
  adSpend,
  anonymousUserProfiles,
  campaign,
  campaignRecipient,
  campaignRun,
  connection,
  emailDomain,
  emailTemplate,
  execution,
  form,
  formField,
  formStep,
  formSubmission,
  funnel,
  funnelBlock,
  funnelEvent,
  funnelPage,
  funnelSession,
  funnelWebVital,
  inboxConversation,
  inboxMessage,
  inboxRoute,
  inboundMessageReceipt,
  node,
  outboundDelivery,
  providerAccount,
  publicationTarget,
  publicationVersion,
  savedAudience,
  smsConfig,
  smsMessage,
  workflows,
} from "@/db/schema";
import { recordRefs } from "@/features/demo-data/server/types";
import type {
  DemoDataTransaction,
  DemoPackResult,
  DemoSeedContext,
} from "@/features/demo-data/server/types";

import { buildGrowthPackFixtures } from "./build";
import { chunk } from "./shared";
import type { GrowthPackClient } from "./types";

async function insertBatches<T>(
  rows: readonly T[],
  insert: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (const batch of chunk(rows)) {
    if (batch.length > 0) await insert(batch);
  }
}

export async function seedGrowthPack(
  tx: DemoDataTransaction,
  context: DemoSeedContext,
  dependencies: { clients: GrowthPackClient[] },
): Promise<DemoPackResult> {
  const fixtures = buildGrowthPackFixtures(context, dependencies);
  const [existingSmsConfig] = await tx
    .select({ id: smsConfig.id })
    .from(smsConfig)
    .where(
      and(
        eq(smsConfig.organizationId, context.organizationId),
        eq(smsConfig.locationId, context.locationId),
      ),
    )
    .limit(1);
  const smsConfigs = existingSmsConfig ? [] : fixtures.smsConfigs;

  await tx.insert(providerAccount).values(fixtures.providers);
  await tx.insert(emailDomain).values(fixtures.domains);
  await tx.insert(emailTemplate).values(fixtures.templates);
  await tx.insert(savedAudience).values(fixtures.audiences);
  await tx.insert(campaign).values(fixtures.campaigns);
  await tx.insert(campaignRun).values(fixtures.campaignRuns);
  await insertBatches(fixtures.deliveries, (batch) => tx.insert(outboundDelivery).values(batch));
  await insertBatches(fixtures.recipients, (batch) => tx.insert(campaignRecipient).values(batch));
  await tx.insert(inboxRoute).values(fixtures.routes);
  await insertBatches(fixtures.conversations, (batch) => tx.insert(inboxConversation).values(batch));
  await insertBatches(fixtures.receipts, (batch) => tx.insert(inboundMessageReceipt).values(batch));
  await insertBatches(fixtures.messages, (batch) => tx.insert(inboxMessage).values(batch));
  if (smsConfigs.length > 0) await tx.insert(smsConfig).values(smsConfigs);
  await insertBatches(fixtures.smsMessages, (batch) => tx.insert(smsMessage).values(batch));
  await tx.insert(workflows).values(fixtures.workflowRows);
  await tx.insert(node).values(fixtures.nodes);
  await tx.insert(connection).values(fixtures.connections);
  await insertBatches(fixtures.executions, (batch) => tx.insert(execution).values(batch));
  await tx.insert(form).values(fixtures.forms);
  await tx.insert(formStep).values(fixtures.formSteps);
  await tx.insert(formField).values(fixtures.formFields);
  await tx.insert(funnel).values(fixtures.funnels);
  await tx.insert(funnelPage).values(fixtures.funnelPages);
  await tx.insert(funnelBlock).values(fixtures.funnelBlocks);
  await tx.insert(publicationTarget).values(
    fixtures.publicationTargets.map((target) => ({ ...target, publishedVersionId: null })),
  );
  await tx.insert(publicationVersion).values(fixtures.publicationVersions);
  for (const target of fixtures.publicationTargets) {
    await tx
      .update(publicationTarget)
      .set({ publishedVersionId: target.publishedVersionId })
      .where(
        and(
          eq(publicationTarget.id, target.id),
          eq(publicationTarget.organizationId, context.organizationId),
          eq(publicationTarget.locationId, context.locationId),
        ),
      );
  }
  await insertBatches(fixtures.formSubmissions, (batch) => tx.insert(formSubmission).values(batch));
  await tx.insert(anonymousUserProfiles).values(fixtures.profiles);
  await insertBatches(fixtures.sessions, (batch) => tx.insert(funnelSession).values(batch));
  await insertBatches(fixtures.events, (batch) => tx.insert(funnelEvent).values(batch));
  await insertBatches(fixtures.vitals, (batch) => tx.insert(funnelWebVital).values(batch));
  await insertBatches(fixtures.adSpendRows, (batch) => tx.insert(adSpend).values(batch));

  const entries = Object.entries({ ...fixtures, smsConfigs }) as [
    string,
    ReadonlyArray<{ id: string }>,
  ][];
  return {
    counts: Object.fromEntries(entries.map(([name, rows]) => [name, rows.length])),
    records: entries.flatMap(([name, rows]) => recordRefs(name, rows)),
  };
}
