"use client";

import { useQueryStates } from "nuqs";

import { contactsParams } from "../params";

export const useContactsParams = () => {
  return useQueryStates(contactsParams);
};
