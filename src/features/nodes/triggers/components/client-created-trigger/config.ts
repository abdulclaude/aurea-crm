import { z } from "zod";

export const clientCreatedTriggerConfigSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required.")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  clientTypeFilter: z.enum(["ANY", "LEAD", "CLIENT"]),
});

export type ClientCreatedTriggerFormValues = z.infer<
  typeof clientCreatedTriggerConfigSchema
>;

export function matchesClientCreatedTrigger(
  data: unknown,
  clientType: string,
): boolean {
  const parsed = clientCreatedTriggerConfigSchema.partial().safeParse(data);
  if (!parsed.success || !parsed.data.clientTypeFilter) return true;
  if (parsed.data.clientTypeFilter === "ANY") return true;
  if (parsed.data.clientTypeFilter === "LEAD") return clientType === "LEAD";
  return clientType !== "LEAD";
}
