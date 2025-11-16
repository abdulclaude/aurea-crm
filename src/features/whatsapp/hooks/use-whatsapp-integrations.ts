"use client";

import { IntegrationProvider } from "@/generated/prisma/enums";
import { useIntegrationsQuery } from "@/features/integrations/hooks/use-integrations";

export function useWhatsAppIntegrations() {
  const query = useIntegrationsQuery();
  const integrations =
    query.data?.filter(
      (integration) => integration.provider === IntegrationProvider.WHATSAPP
    ) ?? [];

  return {
    ...query,
    whatsappIntegrations: integrations,
  };
}

