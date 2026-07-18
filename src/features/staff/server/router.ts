import { createStaffProcedure } from "@/features/staff/server/create-procedure";
import { deleteStaffProcedure } from "@/features/staff/server/delete-procedure";
import {
  staffFilterOptionsProcedure,
  staffListProcedure,
} from "@/features/staff/server/query-procedures";
import { updateStaffProcedure } from "@/features/staff/server/update-procedure";
import { createTRPCRouter } from "@/trpc/init";

export const staffRouter = createTRPCRouter({
  list: staffListProcedure,
  filterOptions: staffFilterOptionsProcedure,
  create: createStaffProcedure,
  update: updateStaffProcedure,
  delete: deleteStaffProcedure,
});
