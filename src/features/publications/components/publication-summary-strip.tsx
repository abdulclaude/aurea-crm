import type { PublicationTargetSummary } from "@/features/publications/components/publication-ui-types";

export function PublicationSummaryStrip({
  targets,
}: {
  targets: PublicationTargetSummary[];
}): React.JSX.Element {
  const published = targets.filter(
    (target) => target.status === "PUBLISHED",
  ).length;
  const draft = targets.filter((target) => target.status === "DRAFT").length;
  const paused = targets.filter((target) => target.status === "PAUSED").length;
  const domainIssues = targets.filter(
    (target) =>
      target.domainHost &&
      (target.domainStatus !== "VERIFIED" || target.sslStatus !== "ACTIVE"),
  ).length;
  const items = [
    ["Targets", targets.length],
    ["Published", published],
    ["Draft", draft],
    ["Paused", paused],
    ["Domain issues", domainIssues],
  ] as const;

  return (
    <div className="grid grid-cols-2 border-b sm:grid-cols-5">
      {items.map(([label, value], index) => (
        <div
          key={label}
          className={`px-4 py-3 sm:px-6 ${index % 2 === 1 ? "border-l" : ""} ${index > 1 ? "border-t sm:border-t-0" : ""} ${index > 0 ? "sm:border-l" : ""}`}
        >
          <p className="text-[11px] font-medium uppercase text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  );
}
