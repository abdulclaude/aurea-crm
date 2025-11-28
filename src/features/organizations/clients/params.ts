import { parseAsArrayOf, parseAsBoolean, parseAsString } from "nuqs/server";

import { CLIENTS_DEFAULT_SORT } from "./constants";

export type ClientsParamsState = {
  search: string;
  sort: string;
  countries: string[];
  industries: string[];
  attention: boolean;
  hiddenColumns: string[];
};

export const clientsParams = {
  search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  sort: parseAsString
    .withDefault(CLIENTS_DEFAULT_SORT)
    .withOptions({ clearOnDefault: true }),
  countries: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  industries: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  attention: parseAsBoolean
    .withDefault(false)
    .withOptions({ clearOnDefault: true }),
  hiddenColumns: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
};
