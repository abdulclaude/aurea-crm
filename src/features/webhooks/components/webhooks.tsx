"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/react-flow/entity-components";
import { useRemoveWebhook, useSuspenseWebhooks } from "../hooks/use-webhooks";
import { useWebhooksParams } from "../hooks/use-webhooks-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import type { Webhook } from "@prisma/client";
import { WebhookProvider } from "@prisma/client";

const providerLogos: Record<WebhookProvider, string> = {
  [WebhookProvider.SLACK]: "/logos/slack.svg",
  [WebhookProvider.DISCORD]: "/logos/discord.svg",
  [WebhookProvider.STRIPE]: "/logos/stripe.svg",
  [WebhookProvider.CUSTOM]: "/logos/workflow.svg",
};

const providerLabels: Record<WebhookProvider, string> = {
  [WebhookProvider.SLACK]: "Slack",
  [WebhookProvider.DISCORD]: "Discord",
  [WebhookProvider.STRIPE]: "Stripe",
  [WebhookProvider.CUSTOM]: "Custom",
};

const WebhooksList = () => {
  const webhooks = useSuspenseWebhooks();
  return (
    <EntityList
      items={webhooks.data.items}
      getKey={(webhook) => webhook.id}
      renderItem={(webhook) => <WebhookItem data={webhook} />}
      emptyView={<WebhooksEmpty />}
    />
  );
};

export default WebhooksList;

export const WebhooksHeader = ({ disabled }: { disabled?: boolean }) => (
  <EntityHeader
    title="Webhooks"
    description="Store and reuse outgoing webhooks"
    newButtonLabel="New webhook"
    disabled={disabled}
    newButtonHref="/webhooks/new"
  />
);

export const WebhooksContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <EntityContainer
    header={<WebhooksHeader />}
    search={<WebhooksSearch />}
    pagination={<WebhooksPagination />}
  >
    {children}
  </EntityContainer>
);

export const WebhooksSearch = () => {
  const [params, setParams] = useWebhooksParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });
  return (
    <div className="mt-4">
      <EntitySearch
        value={searchValue}
        onChange={onSearchChange}
        placeholder="Search webhooks..."
      />
    </div>
  );
};

export const WebhooksPagination = () => {
  const webhooks = useSuspenseWebhooks();
  const [params, setParams] = useWebhooksParams();
  return (
    <EntityPagination
      disabled={webhooks.isFetching}
      totalPages={webhooks.data.totalPages}
      page={webhooks.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const WebhooksLoading = () => (
  <LoadingView message="Loading webhooks..." />
);

export const WebhooksError = () => (
  <ErrorView message="Error loading webhooks..." />
);

export const WebhooksEmpty = () => {
  const router = useRouter();
  return (
    <EmptyView
      title="No webhooks"
      label="webhook"
      onNew={() => router.push("/webhooks/new")}
      message="You haven't saved any webhooks yet. Create one to reuse across nodes."
    />
  );
};

const WebhookItem = ({ data }: { data: Webhook }) => {
  const removeWebhook = useRemoveWebhook();
  const providerLabel = providerLabels[data.provider];
  const logo = providerLogos[data.provider];

  return (
    <EntityItem
      href={`/webhooks/${data.id}`}
      title={data.name}
      subtitle={
        <div className="flex flex-col gap-1">
          <span>
            {providerLabel} &bull; Updated{" "}
            {formatDistanceToNow(data.updatedAt, { addSuffix: true })}
          </span>
          {data.description && (
            <span className="text-white/40 text-[11px]">
              {data.description}
            </span>
          )}
        </div>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          <Image src={logo} alt={providerLabel} width={20} height={20} />
        </div>
      }
      onRemove={() => removeWebhook.mutate({ id: data.id })}
      isRemoving={removeWebhook.isPending}
    />
  );
};
