import type { deal } from "@/db/schema";
import type { DemoSeedContext } from "@/features/demo-data/server/types";
import { buildPayrollFixtures } from "@/features/demo-data/server/packs/core-operations/payroll-fixtures";
import { buildScheduleFixtures } from "@/features/demo-data/server/packs/core-operations/schedule-fixtures";
import { buildTimeLogFixtures } from "@/features/demo-data/server/packs/core-operations/time-log-fixtures";
import type {
  ClientDependency,
  InstructorDependency,
  OperationsFixturePlan,
} from "@/features/demo-data/server/packs/core-operations/types";

export function buildOperationsFixtures(
  context: DemoSeedContext,
  clients: ClientDependency[],
  instructors: InstructorDependency[],
  deals: Array<typeof deal.$inferInsert>,
): OperationsFixturePlan {
  return {
    ...buildScheduleFixtures(context, clients, instructors, deals),
    ...buildTimeLogFixtures(context, clients, instructors, deals),
    ...buildPayrollFixtures(context, instructors),
  };
}
