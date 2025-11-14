import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { WebhookProvider } from "@/generated/prisma/enums";
import { useWebhooksParams } from "./use-webhooks-params";

export const useSuspenseWebhooks = () => {
  const trpc = useTRPC();
  const [params] = useWebhooksParams();
  return useSuspenseQuery(trpc.webhooks.getMany.queryOptions(params));
};

export const useSuspenseWebhook = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.webhooks.getOne.queryOptions({ id }));
};

export const useCreateWebhook = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.webhooks.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Webhook "${data.name}" created.`);
        queryClient.invalidateQueries(trpc.webhooks.getMany.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to create webhook: ${error.message}`);
      },
    })
  );
};

export const useUpdateWebhook = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.webhooks.update.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Webhook "${data.name}" updated.`);
        queryClient.invalidateQueries(trpc.webhooks.getMany.queryOptions({}));
        queryClient.invalidateQueries(
          trpc.webhooks.getOne.queryOptions({ id: data.id })
        );
      },
      onError: (error) => {
        toast.error(`Failed to update webhook: ${error.message}`);
      },
    })
  );
};

export const useRemoveWebhook = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.webhooks.remove.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Webhook "${data.name}" removed.`);
        queryClient.invalidateQueries(trpc.webhooks.getMany.queryOptions({}));
      },
    })
  );
};

export const useWebhooksByProvider = (provider: WebhookProvider) => {
  const trpc = useTRPC();
  return useQuery(trpc.webhooks.getByProvider.queryOptions({ provider }));
};

