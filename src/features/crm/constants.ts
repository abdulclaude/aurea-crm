export const CRM_PAGE_SIZE = 50;

export const CLIENT_TYPE_VALUES = [
  "LEAD",
  "PROSPECT",
  "CUSTOMER",
  "CHURN",
  "CLOSED",
] as const;

export const LIFECYCLE_STAGE_VALUES = [
  "SUBSCRIBER",
  "LEAD",
  "MQL",
  "SQL",
  "OPPORTUNITY",
  "CUSTOMER",
  "EVANGELIST",
] as const;

export const ACQUISITION_STAGE_VALUES = [
  "INQUIRY",
  "TRIAL",
  "ACTIVE",
  "LOST",
] as const;

export const INTRO_OFFER_REDEMPTION_STATUS_VALUES = [
  "ACTIVE",
  "EXPIRED",
  "CONVERTED",
  "CANCELLED",
] as const;
