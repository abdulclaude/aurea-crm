import { AssistantContent } from "@/features/assistant/components/assistant-content";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";

const Page = async () => {
  await requireAuth();

  return (
    <HydrateClient>
      <AssistantContent showAllLogs />
    </HydrateClient>
  );
};

export default Page;
