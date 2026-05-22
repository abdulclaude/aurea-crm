export type ReportFilterOption = {
  fieldId: string;
  label: string;
  values: readonly string[];
};

export type ReportFilterState = Record<string, string[]>;

export type ReportDateFilter = {
  fieldId: string;
  label: string;
  minDate: Date;
  maxDate: Date;
  valueStart: Date;
  valueEnd: Date;
  isActive: boolean;
  onChange: (start: Date, end: Date) => void;
};
