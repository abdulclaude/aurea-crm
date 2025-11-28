import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
} from "nuqs/server";

import { PIPELINES_DEFAULT_SORT } from "./constants";

export type PipelinesParamsState = {
  search: string;
  sort: string;
  isActive: boolean | null;
  hiddenColumns: string[];
  stages?: string[];
  contacts?: string[];
  dealsCountMin?: number;
  dealsCountMax?: number;
  dealsValueCurrency?: string;
  dealsValueMin?: number;
  dealsValueMax?: number;
  winRateMin?: number;
  winRateMax?: number;
};

export const pipelinesParams = {
  search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  sort: parseAsString
    .withDefault(PIPELINES_DEFAULT_SORT)
    .withOptions({ clearOnDefault: true }),
  isActive: parseAsBoolean.withOptions({ clearOnDefault: true }),
  hiddenColumns: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  stages: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  contacts: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
  dealsCountMin: parseAsInteger.withOptions({ clearOnDefault: true }),
  dealsCountMax: parseAsInteger.withOptions({ clearOnDefault: true }),
  dealsValueCurrency: parseAsString.withOptions({ clearOnDefault: true }),
  dealsValueMin: parseAsFloat.withOptions({ clearOnDefault: true }),
  dealsValueMax: parseAsFloat.withOptions({ clearOnDefault: true }),
  winRateMin: parseAsFloat.withOptions({ clearOnDefault: true }),
  winRateMax: parseAsFloat.withOptions({ clearOnDefault: true }),
};
