export type PlanRestrictionEnvironment = {
  NODE_ENV?: string;
};

export function arePlanRestrictionsDisabled(
  environment: PlanRestrictionEnvironment,
): boolean {
  return (
    environment.NODE_ENV === "development" ||
    environment.NODE_ENV === "test"
  );
}

export function areServerPlanRestrictionsDisabled(): boolean {
  return arePlanRestrictionsDisabled({
    NODE_ENV: process.env.NODE_ENV,
  });
}

export function areClientPlanRestrictionsDisabled(): boolean {
  return arePlanRestrictionsDisabled({
    NODE_ENV: process.env.NODE_ENV,
  });
}
