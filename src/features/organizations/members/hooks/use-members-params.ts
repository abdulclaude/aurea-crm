import { parseAsArrayOf, parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { MEMBERS_DEFAULT_SORT } from "../constants";

export function useMembersParams() {
  return useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(20),
      search: parseAsString.withDefault(""),
      sort: parseAsString.withDefault(MEMBERS_DEFAULT_SORT),
      roles: parseAsArrayOf(parseAsString).withDefault([]),
      status: parseAsArrayOf(parseAsString).withDefault([]),
      hiddenColumns: parseAsArrayOf(parseAsString).withDefault([]),
    },
    {
      history: "push",
      shallow: true,
    },
  );
}
