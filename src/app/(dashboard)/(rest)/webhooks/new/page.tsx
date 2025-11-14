import { requireAuth } from "@/lib/auth-utils";
import { WebhookForm } from "@/features/webhooks/components/webhook-form";

const Page = async () => {
  await requireAuth();
  return <WebhookForm />;
};

export default Page;

