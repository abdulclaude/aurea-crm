export type ReportGroupId =
  | "sales"
  | "payment-processing"
  | "clients"
  | "staff"
  | "inventory";

export type ReportCatalogItem = {
  id: string;
  groupId: ReportGroupId;
  name: string;
  description: string;
  category: string;
};

export type ReportGroup = {
  id: ReportGroupId;
  label: string;
  description: string;
};

export type ReportCategoryGroup = {
  category: string;
  reports: readonly ReportCatalogItem[];
};

export type ReportFieldType =
  | "Currency"
  | "Date"
  | "Number"
  | "Percent"
  | "Status"
  | "Text";

export type ReportField = {
  id: string;
  name: string;
  type: ReportFieldType;
  description: string;
};

export type ReportFilter = {
  id: string;
  name: string;
  type: string;
  description: string;
};

export type ReportDataValue = string | number | null;

export type ReportDataRow = Record<string, ReportDataValue>;
