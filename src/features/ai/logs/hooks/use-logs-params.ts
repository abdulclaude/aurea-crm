import { useQueryStates, parseAsString, parseAsArrayOf } from "nuqs";
import { LOGS_DEFAULT_SORT } from "../constants";

export function useLogsParams() {
  return useQueryStates({
    search: parseAsString.withDefault(""),
    sort: parseAsString.withDefault(LOGS_DEFAULT_SORT),
    statuses: parseAsArrayOf(parseAsString).withDefault([]),
    intents: parseAsArrayOf(parseAsString).withDefault([]),
    userIds: parseAsArrayOf(parseAsString).withDefault([]),
    hiddenColumns: parseAsArrayOf(parseAsString).withDefault([]),
  });
}
