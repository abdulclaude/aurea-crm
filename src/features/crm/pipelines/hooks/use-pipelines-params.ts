"use client";

import { useQueryStates } from "nuqs";

import { pipelinesParams } from "../params";

export const usePipelinesParams = () => {
  return useQueryStates(pipelinesParams);
};
