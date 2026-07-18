import type {
  activity,
  clientHousehold,
  clientHouseholdMember,
  deal,
  dealClient,
  instructorAvailability,
  instructorPayment,
  note,
  overtimeTracking,
  payrollRun,
  payrollRunInstructor,
  pipeline,
  pipelineStage,
  rota,
  shiftSwapRequest,
  staffIdentity,
  studioStaffMember,
  task,
  timeLog,
  timeOffRequest,
} from "@/db/schema";

export type ClientDependency = {
  id: string;
  name: string;
  email: string | null;
};

export type InstructorDependency = {
  id: string;
  name: string;
  email: string | null;
};

export type CoreOperationsDependencies = {
  clients: ClientDependency[];
  instructors: InstructorDependency[];
};

export type StaffFixturePlan = {
  staffIdentities: Array<typeof staffIdentity.$inferInsert>;
  staffMembers: Array<typeof studioStaffMember.$inferInsert>;
  instructorIdentityLinks: Array<{
    instructorId: string;
    identityId: string;
  }>;
};

export type CrmFixturePlan = {
  households: Array<typeof clientHousehold.$inferInsert>;
  householdMembers: Array<typeof clientHouseholdMember.$inferInsert>;
  pipelines: Array<typeof pipeline.$inferInsert>;
  pipelineStages: Array<typeof pipelineStage.$inferInsert>;
  deals: Array<typeof deal.$inferInsert>;
  dealClients: Array<typeof dealClient.$inferInsert>;
  tasks: Array<typeof task.$inferInsert>;
  notes: Array<typeof note.$inferInsert>;
  activities: Array<typeof activity.$inferInsert>;
};

export type OperationsFixturePlan = {
  availability: Array<typeof instructorAvailability.$inferInsert>;
  timeOffRequests: Array<typeof timeOffRequest.$inferInsert>;
  rotas: Array<typeof rota.$inferInsert>;
  shiftSwaps: Array<typeof shiftSwapRequest.$inferInsert>;
  timeLogs: Array<typeof timeLog.$inferInsert>;
  overtime: Array<typeof overtimeTracking.$inferInsert>;
  payrollRuns: Array<typeof payrollRun.$inferInsert>;
  payrollDetails: Array<typeof payrollRunInstructor.$inferInsert>;
  instructorPayments: Array<typeof instructorPayment.$inferInsert>;
};

export type CoreOperationsFixturePlan = StaffFixturePlan &
  CrmFixturePlan &
  OperationsFixturePlan;
