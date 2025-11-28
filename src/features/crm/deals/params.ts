import {
  parseAsArrayOf,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
} from "nuqs/server";

import { DEALS_DEFAULT_SORT } from "./constants";

export type DealsParamsState = {
  search: string;
  sort: string;
  stages: string[];
  hiddenColumns: string[];
  contacts?: string[];
  members?: string[];
  valueCurrency?: string;
  valueMin?: number;
  valueMax?: number;
  probabilityMin?: number;
  probabilityMax?: number;
};

export const dealsParams = {
  search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  sort: parseAsString
    .withDefault(DEALS_DEFAULT_SORT)
    .withOptions({ clearOnDefault: true }),
  stages: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  hiddenColumns: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  contacts: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  members: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  valueCurrency: parseAsString.withOptions({ clearOnDefault: true }),
  valueMin: parseAsFloat.withOptions({ clearOnDefault: true }),
  valueMax: parseAsFloat.withOptions({ clearOnDefault: true }),
  probabilityMin: parseAsInteger.withOptions({ clearOnDefault: true }),
  probabilityMax: parseAsInteger.withOptions({ clearOnDefault: true }),
};
