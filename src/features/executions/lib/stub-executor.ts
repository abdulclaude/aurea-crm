import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "../types";

/**
 * Stub executor for nodes that haven't been implemented yet.
 * This prevents TypeScript errors while we implement nodes incrementally.
 */
export const stubExecutor: NodeExecutor = async ({ data, nodeId }) => {
  throw new NonRetriableError(
    `This node type is not yet fully implemented. Node ID: ${nodeId}`
  );
};
