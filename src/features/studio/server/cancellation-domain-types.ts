import { db } from "@/db";

export type CancellationTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
