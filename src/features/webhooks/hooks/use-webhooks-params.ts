import { useQueryStates } from "nuqs";
import { webhooksParams } from "../params";

export const useWebhooksParams = () => {
  return useQueryStates(webhooksParams);
};

