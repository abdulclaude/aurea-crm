import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(projectRoot, "src", "app");
const playbookPath = join(
  projectRoot,
  "docs",
  "QA_ROUTE_CHECKLIST.md",
);

function walk(directory, filename, matches = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(path, filename, matches);
    } else if (entry.name === filename) {
      matches.push(path);
    }
  }
  return matches;
}

function sourceToRoute(sourcePath) {
  const sourceDirectory = dirname(relative(appRoot, sourcePath));
  const segments = sourceDirectory
    .split("/")
    .filter((segment) => segment !== "." && !/^\(.+\)$/.test(segment));
  return `/${segments.join("/")}`;
}

function unique(values) {
  return [...new Set(values)].sort();
}

const playbook = readFileSync(playbookPath, "utf8");
const pageSources = walk(appRoot, "page.tsx");
const apiSources = walk(appRoot, "route.ts");
const pageRoutes = unique(
  pageSources.map((source) => sourceToRoute(source)),
);
const apiRoutes = unique(
  apiSources.map((source) => sourceToRoute(source)),
);

const missingPages = pageRoutes.filter(
  (route) => !playbook.includes(`\`${route}\``),
);
const missingApis = apiRoutes.filter(
  (route) => !playbook.includes(`\`${route}\``),
);

const duplicateRootSources = pageSources
  .filter((source) => sourceToRoute(source) === "/")
  .map((source) => relative(projectRoot, source));
const missingRootSources = duplicateRootSources.filter(
  (source) => !playbook.includes(`\`${source}\``),
);

const reportSource = readFileSync(
  join(projectRoot, "src", "features", "reports", "constants.ts"),
  "utf8",
);
const catalogStart = reportSource.indexOf("export const REPORT_CATALOG");
const catalogEnd = reportSource.indexOf("] as const", catalogStart);
const catalog = reportSource.slice(catalogStart, catalogEnd);
const reportRoutes = [];
const reportPattern = /id: "([^"]+)",\s*\n\s*groupId: "([^"]+)"/g;
let reportMatch;
while ((reportMatch = reportPattern.exec(catalog)) !== null) {
  reportRoutes.push(`/reports/${reportMatch[2]}/${reportMatch[1]}`);
}
const missingReports = unique(reportRoutes).filter(
  (route) => !playbook.includes(`\`${route}\``),
);

const failures = [
  ["page routes", missingPages],
  ["API routes", missingApis],
  ["root route source files", missingRootSources],
  ["report variants", missingReports],
].filter(([, missing]) => missing.length > 0);

if (failures.length > 0) {
  console.error("Manual route playbook coverage is incomplete.");
  for (const [label, missing] of failures) {
    console.error(`\nMissing ${label}:`);
    for (const value of missing) console.error(`- ${value}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    [
      "Manual route playbook coverage passed:",
      `- ${pageSources.length} page files`,
      `- ${pageRoutes.length} unique page URL patterns`,
      `- ${apiRoutes.length} API URL patterns`,
      `- ${unique(reportRoutes).length} report variants`,
    ].join("\n"),
  );
}
