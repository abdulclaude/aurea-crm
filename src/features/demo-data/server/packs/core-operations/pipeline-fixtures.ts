import type { deal, dealClient, pipeline, pipelineStage } from "@/db/schema";
import type { DemoSeedContext } from "@/features/demo-data/server/types";
import {
  PIPELINE_DEFINITIONS,
  PROFILE_COUNTS,
} from "@/features/demo-data/server/packs/core-operations/constants";
import type { ClientDependency } from "@/features/demo-data/server/packs/core-operations/types";
import {
  deterministicDemoId,
  money,
  utcDay,
} from "@/features/demo-data/server/packs/core-operations/utils";

export type PipelineFixturePlan = {
  pipelines: Array<typeof pipeline.$inferInsert>;
  pipelineStages: Array<typeof pipelineStage.$inferInsert>;
  deals: Array<typeof deal.$inferInsert>;
  dealClients: Array<typeof dealClient.$inferInsert>;
};

export function buildPipelineFixtures(
  context: DemoSeedContext,
  clients: ClientDependency[],
): PipelineFixturePlan {
  const counts = PROFILE_COUNTS[context.profile];
  const now = context.referenceDate;
  const definitions = PIPELINE_DEFINITIONS.slice(0, counts.pipelineCount);
  const pipelines = definitions.map((definition, index) => ({
    id: deterministicDemoId(context.runId, "pipeline", index),
    organizationId: context.organizationId,
    locationId: context.locationId,
    name: definition.name,
    description: definition.description,
    isActive: true,
    isDefault: index === 0,
    createdAt: utcDay(now, -(220 + index * 20)),
    updatedAt: now,
  }));
  const stageGroups = definitions.map((definition, pipelineIndex) =>
    definition.stages.map((name, position) => {
      const isLost = name === "Lost";
      const isWon = name === "Won";
      return {
        id: deterministicDemoId(
          context.runId,
          `pipeline-stage-${pipelineIndex}`,
          position,
        ),
        pipelineId: pipelines[pipelineIndex]!.id,
        name,
        position,
        probability: isLost
          ? 0
          : isWon
            ? 100
            : Math.min(90, 10 + position * 15),
        rottingDays: isLost || isWon ? null : 5 + position * 3,
        color: isLost
          ? "#f43f5e"
          : isWon
            ? "#10b981"
            : ["#0ea5e9", "#8b5cf6", "#f59e0b"][position % 3],
        createdAt: pipelines[pipelineIndex]!.createdAt,
        updatedAt: now,
      };
    }),
  );
  const pipelineStages = stageGroups.flat();
  const sources = [
    "Website",
    "Referral",
    "Walk-in",
    "Instagram",
    "Partner",
    "Email",
  ];
  const deals = Array.from({ length: counts.dealCount }, (_, index) => {
    const pipelineIndex = index % pipelines.length;
    const stages = stageGroups[pipelineIndex]!;
    const stage = stages[index % stages.length]!;
    const selectedClient = clients[index % clients.length]!;
    const source = sources[index % sources.length]!;
    return {
      id: deterministicDemoId(context.runId, "deal", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      name: `${selectedClient.name} - ${pipelines[pipelineIndex]!.name}`,
      pipelineId: pipelines[pipelineIndex]!.id,
      pipelineStageId: stage.id,
      value: money(12_500 + (index % 14) * 7_500),
      currency: context.currency,
      deadline: utcDay(now, 7 + (index % 75)),
      source,
      tags:
        index % 5 === 0
          ? ["priority", "follow-up"]
          : [source.toLowerCase()],
      description: `Demo opportunity for ${selectedClient.name}.`,
      lastActivityAt: utcDay(now, -(index % 45), 14),
      createdAt: utcDay(
        now,
        -(index % Math.min(720, context.profileConfig.historyMonths * 30)),
        10,
      ),
      updatedAt: utcDay(now, -(index % 45), 14),
    };
  });
  const dealClients = deals.flatMap((item, index) => {
    const links = [
      {
        id: deterministicDemoId(
          context.runId,
          "deal-client",
          `${index}-primary`,
        ),
        dealId: item.id,
        clientId: clients[index % clients.length]!.id,
      },
    ];
    if (index % 5 === 0) {
      links.push({
        id: deterministicDemoId(
          context.runId,
          "deal-client",
          `${index}-secondary`,
        ),
        dealId: item.id,
        clientId: clients[(index + 1) % clients.length]!.id,
      });
    }
    return links;
  });
  return { pipelines, pipelineStages, deals, dealClients };
}
