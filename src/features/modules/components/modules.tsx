"use client";

import {
  EntityContainer,
  EntityHeader,
} from "@/components/react-flow/entity-components";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { IconCalendarClock as ClockIcon } from "central-icons/IconCalendarClock";
import { IconFileText as FileTextIcon } from "central-icons/IconFileText";
import { IconPackage as PackageIcon } from "central-icons/IconPackage";
import { IconCalendarClock as CalendarIcon } from "central-icons/IconCalendarClock";
import { IconSignature } from "central-icons/IconSignature";
import { IconKanbanView as KanbanIcon } from "central-icons/IconKanbanView";
import { toast } from "sonner";
import { useState } from "react";
import { ModuleType } from "@prisma/client";

export const ModulesContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Modules"
          description="Extend your CRM with powerful add-on modules to fit your industry needs."
        />
      }
    >
      {children}
    </EntityContainer>
  );
};

const moduleIcons: Record<ModuleType, any> = {
  [ModuleType.TIME_TRACKING]: ClockIcon,
  [ModuleType.INVOICING]: FileTextIcon,
  [ModuleType.INVENTORY]: PackageIcon,
  [ModuleType.BOOKING_CALENDAR]: CalendarIcon,
  [ModuleType.DOCUMENT_SIGNING]: IconSignature,
  [ModuleType.PROJECT_MANAGEMENT]: KanbanIcon,
};

type ModuleCardProps = {
  type: ModuleType;
  name: string;
  description: string;
  features: readonly string[];
  enabled: boolean;
  requiresPremium: boolean;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
};

const ModuleCard = ({
  type,
  name,
  description,
  features,
  enabled,
  requiresPremium,
  onToggle,
  isLoading,
}: ModuleCardProps) => {
  const Icon = moduleIcons[type];

  return (
    <Card className="overflow-hidden border border-white/5">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary-foreground/75">
                <Icon className="size-6 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg">{name}</CardTitle>
                  {requiresPremium && (
                    <Badge variant="secondary" className="text-xs">
                      Premium
                    </Badge>
                  )}
                  {enabled && (
                    <Badge className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                      Enabled
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {description}
                </CardDescription>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-primary/60">Features:</p>
              <ul className="space-y-1">
                {features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-primary/80 flex items-start gap-2"
                  >
                    <span className="text-primary/40 mt-0.5">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              disabled={isLoading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ModulesList = () => {
  const [loadingModule, setLoadingModule] = useState<ModuleType | null>(null);

  const trpc = useTRPC();

  const { data: modules = [], refetch } = useSuspenseQuery(
    trpc.modules.listAvailable.queryOptions()
  );

  // Check if all modules are disabled (no subaccount context)
  const hasSubaccount = modules.some((m) => m.enabled);

  const { mutate: enableModule } = useMutation(
    trpc.modules.enable.mutationOptions({
      onSuccess: () => {
        refetch();
        toast.success("Module enabled successfully");
        setLoadingModule(null);
      },
      onError: (error: any) => {
        toast.error(
          error.message ||
            "Failed to enable module. Please select a subaccount first."
        );
        setLoadingModule(null);
      },
    })
  );

  const { mutate: disableModule } = useMutation(
    trpc.modules.disable.mutationOptions({
      onSuccess: () => {
        refetch();
        toast.success("Module disabled successfully");
        setLoadingModule(null);
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to disable module");
        setLoadingModule(null);
      },
    })
  );

  const handleToggle = (moduleType: ModuleType, currentEnabled: boolean) => {
    setLoadingModule(moduleType);

    if (currentEnabled) {
      disableModule({ moduleType });
    } else {
      enableModule({ moduleType });
    }
  };

  if (modules.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-primary/60">No modules available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {!hasSubaccount && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-500">
              <strong>Note:</strong> Please select a subaccount (client) to
              enable modules. Modules are configured per subaccount.
            </p>
          </CardContent>
        </Card>
      )}

      {modules.map((module) => (
        <ModuleCard
          key={module.type}
          type={module.type}
          name={module.name}
          description={module.description}
          features={module.features}
          enabled={module.enabled}
          requiresPremium={module.requiresPremium}
          onToggle={(enabled) => handleToggle(module.type, module.enabled)}
          isLoading={loadingModule === module.type}
        />
      ))}
    </div>
  );
};
