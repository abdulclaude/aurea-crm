import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import superjson from "superjson";

const MINUTE = 60 * 1000;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * MINUTE,
        gcTime: 15 * MINUTE,
        refetchOnWindowFocus: false,
        // Disable auto-fetching during SSR. Client components that use
        // useSuspenseQuery without server-side prefetching would otherwise
        // make server-to-server HTTP requests without session cookies,
        // producing 401 errors. Prefetched queries (via HydrateClient) are
        // already in cache and resolve immediately regardless of this flag.
        enabled: typeof window !== "undefined",
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
