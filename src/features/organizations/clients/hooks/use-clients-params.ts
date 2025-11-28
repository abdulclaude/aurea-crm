"use client";

import { useQueryStates } from "nuqs";

import { clientsParams } from "../params";

export const useClientsParams = () => {
  return useQueryStates(clientsParams);
};

