export type CsvRow = Record<string, string>;

export type MindbodyFileKind =
  | "accountBalances"
  | "appointmentNotes"
  | "clientAutopayContracts"
  | "clientNotifications"
  | "clientPricingOptions"
  | "clientRelationships"
  | "clientSales"
  | "clientTypes"
  | "clients"
  | "contactLogs"
  | "indexes"
  | "locations"
  | "notes"
  | "payments"
  | "products"
  | "referrers"
  | "reservationData"
  | "trainers"
  | "visitData"
  | "visitPaymentLinking"
  | "contractSignature"
  | "clientFile"
  | "saleImage"
  | "zipArchive"
  | "unknown";

export type ParsedCsv = {
  headers: string[];
  rows: CsvRow[];
};

export type UploadedImportFile = {
  name: string;
  url: string;
  uploadKey?: string;
  size?: number;
  type?: string;
  relativePath?: string;
  zipSourceName?: string;
  zipSourceUrl?: string;
  zipEntryPath?: string;
};

const ZIP_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
]);

const CSV_FILE_KINDS: Array<{ kind: MindbodyFileKind; pattern: RegExp }> = [
  { kind: "accountBalances", pattern: /^accountbalances\.csv$/i },
  { kind: "appointmentNotes", pattern: /^appointmentnotes\.csv$/i },
  { kind: "clientAutopayContracts", pattern: /^clientautopaycontracts\.csv$/i },
  { kind: "clientNotifications", pattern: /^clientnotifications\.csv$/i },
  { kind: "clientPricingOptions", pattern: /^clientpricingoptions\.csv$/i },
  { kind: "clientRelationships", pattern: /^clientrelationships\.csv$/i },
  { kind: "clientSales", pattern: /^clientsales\.csv$/i },
  { kind: "clientTypes", pattern: /^clienttypes\.csv$/i },
  { kind: "clients", pattern: /^clients\.csv$/i },
  { kind: "contactLogs", pattern: /^contactlogs\.csv$/i },
  { kind: "indexes", pattern: /^indexes\.csv$/i },
  { kind: "locations", pattern: /^locations\.csv$/i },
  { kind: "notes", pattern: /^notes\.csv$/i },
  { kind: "payments", pattern: /^payments\.csv$/i },
  { kind: "products", pattern: /^products\.csv$/i },
  { kind: "referrers", pattern: /^referrers\.csv$/i },
  { kind: "reservationData", pattern: /^reservationdata\.csv$/i },
  { kind: "trainers", pattern: /^trainers\.csv$/i },
  { kind: "visitData", pattern: /^visitdata\.csv$/i },
  { kind: "visitPaymentLinking", pattern: /^visitpaymentlinking\.csv$/i },
];

export const MINDBODY_EXPECTED_HEADERS: Record<string, readonly string[]> = {
  AccountBalances: ["MBSystemID", "BarcodeID", "FirstName", "LastName", "Balance", "GiftCardExtID"],
  AppointmentNotes: ["VisitRefNo", "ClientID", "Notes"],
  ClientAutopayContracts: [
    "RowID",
    "ClientContractID",
    "PayingClientID",
    "PayingClient",
    "ReceivingClientId",
    "AutoRenewing",
    "Location",
    "ReceivingClient",
    "ContractStartDate",
    "ContractEndDate",
    "ContractName",
    "FirstPaymentAmount",
    "NormalPaymentAmount",
    "TotalNumberofPayments",
    "RemainingPayments",
    "PaymentFrequency",
    "NextPaymentDate",
    "ContractSuspendStartDate",
    "ContractSuspendEndDate",
    "SuspendNotes",
    "PaymentMethod",
  ],
  ClientNotifications: [
    "MBSystemID",
    "PromotionalEmailOptIn",
    "PromotionalTextOptIn",
    "ScheduleEmailOptIn",
    "ScheduleTextOptIn",
    "AccountEmailOptIn",
    "AccountTextOptIn",
    "OperationalEmailOptIn",
    "TwilioOptIn",
    "StudioId",
  ],
  ClientPricingOptions: [
    "MBSystemID",
    "BarcodeID",
    "PmtRefNo",
    "LastName",
    "FirstName",
    "Description",
    "ProductID",
    "PaymentDate",
    "ActiveDate",
    "PaymentAmount",
    "ExpDate",
    "Remaining",
    "NumClasses",
    "ItemType",
    "Program/Service Category",
    "Duration",
    "DurationUnit",
    "Returned",
    "PaymentDataID",
    "ClientContractID",
  ],
  Clients: [
    "BarcodeID",
    "MBSystemID",
    "LastName",
    "FirstName",
    "MiddleName",
    "Nickname",
    "Address",
    "Address2",
    "City",
    "State",
    "PostalCode",
    "Country",
    "WorkPhone",
    "WorkExtension",
    "HomePhone",
    "CellPhone",
    "EmailName",
    "Birthdate",
    "ReferredBy",
    "ProfileCreationDate",
    "EmergContact",
    "EmergRela",
    "EmergPhone",
    "Parent",
    "Occupation",
    "Inactive",
    "LocationID",
    "LocationName",
    "LoginName",
    "Title",
    "SecretClue",
    "LiabilityRelease",
    "LiabilityAgreementDate",
    "LiabilityRelBy",
    "Website",
    "IsCompany",
    "IsProspect",
    "Suspended",
    "SuspendToDate",
    "ShipAddress",
    "ShipCity",
    "ShipState",
    "ShipPostalCode",
    "CompanyName",
    "EmergEmail",
    "SuspendFromDate",
    "FirstContactDate",
    "CloseDate",
    "ExpectedCloseDate",
    "CloseProbability",
    "RepID",
    "BakCloseDate",
    "RepID2",
    "RepID3",
    "OnlineSignUp",
    "BirthdayEmailSent",
    "FirstClassDate",
    "FirstApptDate",
    "RepID4",
    "RepID5",
    "RepID6",
    "ProspectStage",
    "InsuranceCompany",
    "InsurancePolicyNum",
    "ApptGenderPrefMale",
    "MobileProvider",
    "AutomatedContactMethod",
    "AllowMissingBillingAlert",
    "CreatedBy",
    "DeactivatedTime",
    "ShipCountry",
    "RewardsOptIn",
    "AllowAccountPurchases",
    "ReactivatedTime",
    "LockerNo",
    "MeasurementsTaken",
    "Height",
    "Bust",
    "Waist",
    "Hip",
    "Girth",
    "Inseam",
    "Head",
    "Shoe",
    "Tights",
    "ReferrerID",
    "Longitude",
    "Latitude",
    "LockerDate",
    "Gender",
  ],
  ClientRelationships: [
    "RelationID",
    "RelName1",
    "MBSystemID1",
    "BarcodeID1",
    "LastName1",
    "FirstName1",
    "RelName2",
    "MBSystemID2",
    "BarcodeID2",
    "LastName2",
    "FirstName2",
  ],
  ClientSales: [
    "MBSystemID",
    "BarcodeID",
    "LastName",
    "FirstName",
    "SaleID",
    "SDID",
    "PmtRefNo",
    "SaleDate",
    "UnitPrice",
    "Discount",
    "SDPaymentAmt",
    "ProductID",
    "Description",
    "Quantity",
    "CategoryName",
    "Returned",
    "LocationName",
  ],
  ClientTypes: ["BarcodeID", "MBSystemID", "FirstName", "LastName", "TypeName"],
  ContactLogs: [
    "LogID",
    "BarcodeID",
    "MBSystemID",
    "FirstName",
    "LastName",
    "ContactDate",
    "ContactName",
    "ContactLog",
    "ContactMethod",
    "TrainerID",
    "StaffFirstName",
    "StaffLastName",
    "ContactType",
    "ContactSubType",
  ],
  Indexes: ["MBSystemID", "BarcodeID", "FirstName", "LastName", "IndexName", "IndexValue"],
  Locations: [
    "LocationID",
    "LocationName",
    "MBAccountNumber",
    "Active",
    "Phone",
    "Email",
    "ContactName",
    "TaxGrouping",
    "TaxID",
    "Tax1",
    "Tax2",
    "Tax3",
    "Tax4",
    "Tax5",
    "StreetAddress",
    "City",
    "StateProvCode",
    "PostalCode",
    "Country",
    "LocationDescription",
  ],
  Notes: ["MBSystemID", "FirstName", "LastName", "Notes"],
  Payments: [
    "MBSystemID",
    "BarcodeID",
    "LastName",
    "FirstName",
    "SaleID",
    "SaleDate",
    "PaymentAmount",
    "PaymentTax",
    "PaymentDiscount",
    "PmtTypes",
    "DebitCardExtID",
    "PaymentNotes",
  ],
  Products: [
    "BarcodeID",
    "ProductID",
    "Description",
    "CategoryName",
    "Suppliername",
    "SizeName",
    "ColorName",
    "SubCategoryName",
    "UnitPrice",
    "OurCost",
    "ReorderLevel",
    "MaxLevel",
    "LotSize",
    "Discontinued",
    "ItemTypeName",
    "Count",
    "Duration",
    "DurationUnit",
    "ServiceCategoryName",
    "ItemTypeID",
  ],
  Referrers: ["ReferrerID", "ParentID", "ReferrerName", "Notes"],
  ReservationData: [
    "MBSystemID",
    "BarcodeID",
    "FirstName",
    "LastName",
    "VisitDate",
    "VisitStartTime",
    "VisitEndTime",
    "Description",
    "ClassType",
    "TrainerID",
    "StaffMember",
    "Status",
    "VisitLocation",
    "BookedOnline",
    "TypePurchased",
    "VisitID",
  ],
  Trainers: [
    "TrainerID",
    "Lastname",
    "Firstname",
    "Address",
    "City",
    "State",
    "Postalcode",
    "Country",
    "Workphone",
    "WorkExt",
    "Homephone",
    "Cellphone",
    "Email",
    "Birthdate",
    "Notes",
    "Teacher",
    "Massage Therapist",
    "Workshop Instructor",
    "Employee",
    "Active",
    "Delete",
    "Locked",
    "Location",
    "Closed",
    "Bio",
    "Assistant",
    "DisplayName",
    "Assistant2",
    "EmpID",
    "CRM",
    "Male",
    "HourlyRate",
    "StdTrnCommissionPercRate",
    "StdTrnCommissionFlatRate",
    "PromoTrnCommissionPercRate",
    "PromoTrnCommissionFlatRate",
    "EarnsCommissions",
    "AppointmentTrn",
    "ReservationTrn",
    "Rep",
    "SortOrder",
    "DefaultDeptID",
    "Rep2",
    "Rep3",
    "Rep4",
    "Rep5",
    "Rep6",
    "EarnsTips",
    "HideInPayrollExport",
    "DisableAttachments",
    "EmploymentEnd",
    "EmploymentStart",
    "IndependentContractor",
    "MobileProvider",
    "AutomatedContactMethod",
    "isSystem",
    "LastGoogleSyncStart",
    "LastGoogleSyncEnd",
    "AlwaysAllowDoubleBooking",
    "Modified",
    "isOwner",
  ],
  VisitData: [
    "MBSystemID",
    "BarcodeID",
    "FirstName",
    "LastName",
    "VisitDate",
    "VisitStartTime",
    "VisitEndTime",
    "Description",
    "ClassType",
    "TrainerID",
    "StaffMember",
    "Status",
    "VisitLocation",
    "BookedOnline",
    "TypePurchased",
    "VisitID",
  ],
  VisitPaymentLinking: ["VisitRefNo", "PmtRefNo"],
};

export function classifyMindbodyFileName(fileName: string): MindbodyFileKind {
  const normalizedPath = fileName.replace(/\\/g, "/");
  if (/\.zip$/i.test(normalizedPath)) return "zipArchive";

  const normalized = normalizedPath.split("/").pop() ?? normalizedPath;
  const csvKind = CSV_FILE_KINDS.find((item) => item.pattern.test(normalized));
  if (csvKind) return csvKind.kind;

  const lowerPath = normalizedPath.toLowerCase();
  if (/contractsignatures\/.+\.(jpe?g|png|pdf)$/.test(lowerPath)) return "contractSignature";
  if (/sales(?:images)?\/.+\.(jpe?g|png|pdf)$/.test(lowerPath)) return "saleImage";
  if (/\.(jpe?g|png|pdf|docx?|txt)$/.test(lowerPath)) return "clientFile";
  return "unknown";
}

export function isZipImportFile(file: Pick<UploadedImportFile, "name" | "relativePath" | "type">): boolean {
  const path = (file.relativePath || file.name).toLowerCase();
  const mimeType = file.type?.toLowerCase();
  return path.endsWith(".zip") || Boolean(mimeType && ZIP_MIME_TYPES.has(mimeType));
}

export function mimeTypeForImportPath(path: string): string | undefined {
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".csv")) return "text/csv";
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) return "image/jpeg";
  if (lowerPath.endsWith(".png")) return "image/png";
  if (lowerPath.endsWith(".pdf")) return "application/pdf";
  if (lowerPath.endsWith(".doc")) return "application/msword";
  if (lowerPath.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lowerPath.endsWith(".txt")) return "text/plain";
  if (lowerPath.endsWith(".zip")) return "application/zip";
  return undefined;
}

export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index++;
      row.push(field);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) rows.push(row);

  const headers = (rows.shift() ?? []).map((header) => header.trim());
  const parsedRows = rows.map((cells) => {
    const parsed: CsvRow = {};
    headers.forEach((header, index) => {
      parsed[header] = cells[index]?.trim() ?? "";
    });
    return parsed;
  });

  return { headers, rows: parsedRows };
}

export function readField(row: CsvRow, ...fieldNames: string[]): string {
  for (const fieldName of fieldNames) {
    const value = row[fieldName];
    if (value?.trim()) return value.trim();
  }
  return "";
}

export function findUnexpectedHeaders(fileName: string, headers: string[]): string[] {
  const normalized = fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;
  const baseName = normalized.replace(/\.csv$/i, "");
  const expected = Object.entries(MINDBODY_EXPECTED_HEADERS).find(
    ([name]) => name.toLowerCase() === baseName.toLowerCase(),
  )?.[1];
  if (!expected) return headers;

  const expectedSet = new Set(expected.map((header) => header.toLowerCase()));
  return headers.filter((header) => !expectedSet.has(header.toLowerCase()));
}
