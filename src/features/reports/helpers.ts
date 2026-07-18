import {
  REPORT_CATALOG,
  REPORT_CATEGORIES,
  REPORT_CURRENCY_FIELD,
  REPORT_FIELDS_BY_ID,
  REPORT_GROUPS,
  SUPPORTED_REPORT_IDS,
} from "./constants";
import type {
  ReportCatalogItem,
  ReportCategoryGroup,
  ReportField,
  ReportGroup,
  ReportGroupId,
} from "./types";

export function isReportGroupId(value: string): value is ReportGroupId {
  return REPORT_GROUPS.some((group) => group.id === value);
}

export function getReportGroup(groupId: ReportGroupId): ReportGroup | null {
  return REPORT_GROUPS.find((group) => group.id === groupId) ?? null;
}

export function getReportGroupLabel(groupId: ReportGroupId): string {
  return (
    REPORT_GROUPS.find((group) => group.id === groupId)?.label ?? "Reports"
  );
}

export function getReportsForGroup(
  groupId: ReportGroupId,
): readonly ReportCatalogItem[] {
  return REPORT_CATALOG.filter(
    (report) =>
      report.groupId === groupId && SUPPORTED_REPORT_IDS.has(report.id),
  );
}

export function getReportCategoryGroups(
  groupId: ReportGroupId,
  reports: readonly ReportCatalogItem[] = getReportsForGroup(groupId),
): readonly ReportCategoryGroup[] {
  const orderedCategories = REPORT_CATEGORIES[groupId].filter(
    (category) => !category.startsWith("All "),
  );
  const groupedReports = orderedCategories
    .map((category) => ({
      category,
      reports: reports.filter((report) => report.category === category),
    }))
    .filter((group) => group.reports.length > 0);
  const groupedCategoryNames = new Set(
    groupedReports.map((group) => group.category),
  );
  const remainingReports = reports.filter(
    (report) => !groupedCategoryNames.has(report.category),
  );

  if (remainingReports.length === 0) {
    return groupedReports;
  }

  return [
    ...groupedReports,
    {
      category: "Other",
      reports: remainingReports,
    },
  ];
}

export function getFirstReportForGroup(
  groupId: ReportGroupId,
): ReportCatalogItem | null {
  return getReportsForGroup(groupId)[0] ?? null;
}

export function getReportById(
  groupId: ReportGroupId,
  reportId: string,
): ReportCatalogItem | null {
  return (
    REPORT_CATALOG.find(
      (report) =>
        report.groupId === groupId &&
        report.id === reportId &&
        SUPPORTED_REPORT_IDS.has(report.id),
    ) ?? null
  );
}

export function getReportFields(
  report: ReportCatalogItem,
): readonly ReportField[] {
  const fieldsById: Readonly<Record<string, readonly ReportField[]>> =
    REPORT_FIELDS_BY_ID;

  const fields = fieldsById[report.id] ?? fieldsById.sales;
  if (
    fields.some((field) => field.type === "Currency") &&
    !fields.some((field) => field.id === REPORT_CURRENCY_FIELD.id)
  ) {
    return [...fields, REPORT_CURRENCY_FIELD];
  }
  return fields;
}

export function toReportSentenceCase(value: string): string {
  const acronymTokens = [
    "ACH",
    "API",
    "CC",
    "CRM",
    "GBP",
    "ID",
    "POS",
    "SKU",
    "URL",
  ];
  let label = value.toLocaleLowerCase("en-GB");

  for (const token of acronymTokens) {
    label = label.replace(
      new RegExp(`\\b${token.toLocaleLowerCase("en-GB")}\\b`, "g"),
      token,
    );
  }

  return label.replace(/[a-z]/i, (match) => match.toLocaleUpperCase("en-GB"));
}

export function getCategoryCount(
  groupId: ReportGroupId,
  category: string,
): number {
  return REPORT_CATALOG.filter(
    (report) =>
      report.groupId === groupId &&
      report.category === category &&
      SUPPORTED_REPORT_IDS.has(report.id),
  ).length;
}
