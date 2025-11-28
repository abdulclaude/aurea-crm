import { useQueryStates } from "nuqs";
import { bundlesParams } from "../params";

export const useBundlesParams = () => {
  return useQueryStates(bundlesParams);
};
