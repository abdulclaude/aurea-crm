import { requireAuth } from "@/lib/auth-utils";
import {
  WebhookForm,
  WebhookView,
} from "@/features/webhooks/components/webhook-form";
import { prefetchWebhook } from "@/features/webhooks/server/prefetch";

type Props = {
  params: Promise<{
    webhookId: string;
  }>;
};

const Page = async ({ params }: Props) => {
  await requireAuth();
  const { webhookId } = await params;
  await prefetchWebhook(webhookId);
  return <WebhookView webhookId={webhookId} />;
};

export default Page;

