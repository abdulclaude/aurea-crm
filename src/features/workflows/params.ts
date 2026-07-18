import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

import { PAGINATION } from "@/config/constants";

export const workflowKindValues = ["all", "workflow", "bundle"] as const;
export const workflowSortValues = [
  "updatedAt.desc",
  "updatedAt.asc",
  "createdAt.desc",
  "createdAt.asc",
  "name.asc",
  "name.desc",
] as const;

export const workflowsParams = {
  page: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE)
    .withOptions({ clearOnDefault: true }),
  pageSize: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE_SIZE)
    .withOptions({ clearOnDefault: true }),
  search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  view: parseAsString.withDefault("all").withOptions({ clearOnDefault: true }),
  folder: parseAsString
    .withDefault("all")
    .withOptions({ clearOnDefault: true }),
  kind: parseAsStringLiteral(workflowKindValues)
    .withDefault("all")
    .withOptions({ clearOnDefault: true }),
  sort: parseAsStringLiteral(workflowSortValues)
    .withDefault("updatedAt.desc")
    .withOptions({ clearOnDefault: true }),
};
