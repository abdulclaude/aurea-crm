import { parseAsArrayOf, parseAsIsoDateTime, parseAsString } from "nuqs/server";

import { CLIENTS_DEFAULT_SORT } from "./constants";

export type ClientsParamsState = {
  search: string;
  sort: string;
  types: string[];
  tags: string[];
  assignedTo: string[];
  countries: string[];
  hiddenColumns: string[];
  createdAtStart: Date | null;
  createdAtEnd: Date | null;
  lastActivityStart: Date | null;
  lastActivityEnd: Date | null;
  updatedAtStart: Date | null;
  updatedAtEnd: Date | null;
};

export const clientsParams = {
  search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  sort: parseAsString
    .withDefault(CLIENTS_DEFAULT_SORT)
    .withOptions({ clearOnDefault: true }),
  types: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  tags: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  assignedTo: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  countries: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  hiddenColumns: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  createdAtStart: parseAsIsoDateTime.withOptions({ clearOnDefault: true }),
  createdAtEnd: parseAsIsoDateTime.withOptions({ clearOnDefault: true }),
  lastActivityStart: parseAsIsoDateTime.withOptions({ clearOnDefault: true }),
  lastActivityEnd: parseAsIsoDateTime.withOptions({ clearOnDefault: true }),
  updatedAtStart: parseAsIsoDateTime.withOptions({ clearOnDefault: true }),
  updatedAtEnd: parseAsIsoDateTime.withOptions({ clearOnDefault: true }),
};
