import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { RouteQaPageClient } from "@/features/route-qa/components/route-qa-page-client";
import { parseRouteChecklist } from "@/features/route-qa/lib/parse-route-checklist";

export const runtime = "nodejs";

export default async function RouteQaPage(): Promise<React.ReactElement> {
  const markdown = await readFile(
    join(process.cwd(), "docs", "QA_ROUTE_CHECKLIST.md"),
    "utf8",
  );
  const checklist = parseRouteChecklist(markdown);

  return <RouteQaPageClient checklist={checklist} />;
}
