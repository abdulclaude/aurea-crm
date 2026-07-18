import type {
  RouteQaChecklist,
  RouteQaItem,
  RouteQaSection,
  RouteQaStage,
} from "@/features/route-qa/types";

function cleanInlineMarkdown(value: string): string {
  return value
    .replaceAll("`", "")
    .replaceAll("**", "")
    .replaceAll("<br>", " ")
    .trim();
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function parseRouteChecklist(markdown: string): RouteQaChecklist {
  const stages: RouteQaStage[] = [];
  const routeOccurrences = new Map<string, number>();
  let currentStage: RouteQaStage | null = null;
  let currentSection: RouteQaSection | null = null;
  let inReportVariants = false;

  const updatedAt =
    markdown.match(/Current as of ([0-9-]+)\./)?.[1] ?? "Unknown";

  const ensureStage = (title: string): RouteQaStage => {
    const stage = { title, sections: [] } satisfies RouteQaStage;
    stages.push(stage);
    currentStage = stage;
    currentSection = null;
    return stage;
  };

  const ensureSection = (title = "Routes"): RouteQaSection => {
    if (!currentStage) ensureStage("Routes");
    const section = { title, items: [] } satisfies RouteQaSection;
    currentStage?.sections.push(section);
    currentSection = section;
    return section;
  };

  const addItem = (route: string, test: string, expected: string): void => {
    const stage = currentStage ?? ensureStage("Routes");
    const section = currentSection ?? ensureSection();
    const occurrenceKey = `${stage.title}::${section.title}::${route}`;
    const occurrence = (routeOccurrences.get(occurrenceKey) ?? 0) + 1;
    routeOccurrences.set(occurrenceKey, occurrence);
    const item = {
      id: `${slug(stage.title)}::${slug(section.title)}::${route}::${occurrence}`,
      route,
      test,
      expected,
    } satisfies RouteQaItem;
    section.items.push(item);
  };

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();

    if (line.startsWith("## Stage ") || line === "## API boundary checklist") {
      ensureStage(line.replace(/^## /, ""));
      inReportVariants = false;
      continue;
    }

    if (line.startsWith("### ")) {
      ensureSection(cleanInlineMarkdown(line.replace(/^### /, "")));
      inReportVariants = line === "### 12.2 All report variants";
      continue;
    }

    if (inReportVariants && /^\*\*.+\*\*$/.test(line)) {
      ensureSection(cleanInlineMarkdown(line));
      continue;
    }

    if (line.startsWith("| - [ ] |")) {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cleanInlineMarkdown(cell));
      const route = cells[1];
      if (route) addItem(route, cells[2] ?? "", cells[3] ?? "");
      continue;
    }

    const listRoute = line.match(/^- \[ \] `([^`]+)`$/)?.[1];
    if (listRoute) {
      addItem(
        listRoute,
        "Run the report checks defined for this report group.",
        "Filters, columns, saved views, exports, scope, and totals are correct.",
      );
    }
  }

  return {
    updatedAt,
    stages: stages
      .map((stage) => ({
        ...stage,
        sections: stage.sections.filter((section) => section.items.length > 0),
      }))
      .filter((stage) => stage.sections.length > 0),
  };
}
