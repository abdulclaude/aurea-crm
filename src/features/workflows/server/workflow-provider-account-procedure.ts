import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { providerAccount, providerOAuthGrant } from "@/db/schema";
import { oauthProviderConfigSchema } from "@/features/provider-accounts/contracts";
import { requireCapability } from "@/features/permissions/server/authorization";
import {
  getWorkflowProviderAccountReadiness,
  isWorkflowProviderAccountAvailableToScope,
} from "@/features/workflows/lib/workflow-provider-account-readiness";
import {
  getWorkflowProviderBindingSpec,
  workflowProviderBindingNodeTypeSchema,
} from "@/features/workflows/lib/workflow-provider-binding";
import { protectedProcedure } from "@/trpc/init";
import { z } from "zod";
import { requireWorkflowScope } from "./workflow-scope";

export const listWorkflowProviderAccountsProcedure = protectedProcedure
  .input(z.object({ nodeType: workflowProviderBindingNodeTypeSchema }))
  .query(async ({ ctx, input }) => {
    const scope = requireWorkflowScope(ctx);
    await requireCapability({
      actor: {
        userId: scope.userId,
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      },
      capability: "workflow.manage",
      resource: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      },
    });

    const spec = getWorkflowProviderBindingSpec(input.nodeType);
    const rows = await db
      .select({
        id: providerAccount.id,
        organizationId: providerAccount.organizationId,
        locationId: providerAccount.locationId,
        provider: providerAccount.provider,
        displayName: providerAccount.displayName,
        status: providerAccount.status,
        isDefault: providerAccount.isDefault,
        config: providerAccount.config,
        grantedScopes: providerOAuthGrant.scopes,
      })
      .from(providerAccount)
      .leftJoin(
        providerOAuthGrant,
        eq(providerOAuthGrant.providerAccountId, providerAccount.id),
      )
      .where(
        and(
          eq(providerAccount.organizationId, scope.organizationId),
          eq(providerAccount.provider, spec.provider),
          scope.locationId === null
            ? isNull(providerAccount.locationId)
            : or(
                eq(providerAccount.locationId, scope.locationId),
                isNull(providerAccount.locationId),
              ),
        ),
      );

    const accounts = rows
      .flatMap((row) => {
        const parsedConfig = oauthProviderConfigSchema.safeParse(row.config);
        const candidate = {
          ...row,
          inheritToLocations: parsedConfig.success
            ? parsedConfig.data.inheritToLocations
            : false,
        };
        if (!isWorkflowProviderAccountAvailableToScope(candidate, scope)) {
          return [];
        }
        return [
          {
            id: row.id,
            displayName: row.displayName,
            provider: spec.provider,
            locationId: row.locationId,
            inherited: scope.locationId !== null && row.locationId === null,
            isDefault: row.isDefault,
            readiness: getWorkflowProviderAccountReadiness(
              candidate,
              spec.requiredScopes,
            ),
          },
        ];
      })
      .sort((left, right) => {
        if (left.inherited !== right.inherited) return left.inherited ? 1 : -1;
        if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
        return left.displayName.localeCompare(right.displayName);
      });

    return {
      nodeType: input.nodeType,
      provider: spec.provider,
      displayName: spec.displayName,
      requiredScopes: [...spec.requiredScopes],
      accounts,
    };
  });
