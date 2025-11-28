"use client";

import { useQueryStates } from "nuqs";

import { dealsParams } from "../params";

export const useDealsParams = () => {
  return useQueryStates(dealsParams);
};
