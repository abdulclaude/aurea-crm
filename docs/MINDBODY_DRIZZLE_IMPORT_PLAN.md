# Mindbody to Aurea CRM Drizzle Import Plan

Last updated: 2026-05-20

Status: implemented in the Drizzle schema and app pipeline. The remaining production work for a real customer cutover is staging import, reconciliation, and promoting any customer-specific fields discovered in `ImportJob.missingFields`.

This document supersedes the local Claude plan for the Mindbody import work and is scoped to the current Drizzle schema.

## Current Rules

- ORM: Drizzle only. `src/db/schema.ts` is canonical.
- Workspace model: `Organization -> Location -> scoped resources`.
- CRM/studio naming: `Client`, `Instructor`, `Location`.
- Foreign keys: `clientId`, `instructorId`, `locationId`.
- Legacy names are not target names: do not plan new work around `Contact`, `Worker`, `Subaccount`, or `StudioLocation`.
- Money is stored in numeric/decimal columns and passed as decimal strings from TypeScript.
- Mindbody CSV parsing must support quoted fields and quoted newlines. Do not parse exported files with `split("\n")`.

## Export Inventory

El Estudio Wembley Park export path:

```text
/Users/abdul/Downloads/Elestudio Wembley Mindbody Export
```

| Source | Parsed rows / files | Target |
|---|---:|---|
| `AccountBalances.csv` | 6 | `StudioPayment` account-credit entries and account-credit `StudioProduct` |
| `AppointmentNotes.csv` | 150 | `note` rows linked by visit/client context |
| `ClientAutopayContracts.csv` | 4,583 | `StudioMembership` |
| `ClientNotifications.csv` | 4,308 | `Client.notificationPrefs`, unsubscribe flags |
| `ClientPricingOptions.csv` | 11,465 | `ClassCredit` |
| `ClientRelationships.csv` | 15 | `ClientHousehold`, `ClientHouseholdMember` |
| `ClientSales.csv` | 11,732 | `StudioPaymentLineItem` sale detail rows, with `StudioPayment` shell rows only when `Payments.csv` is incomplete |
| `ClientTypes.csv` | 6,181 | `Client.tags` |
| `Clients.csv` | 4,310 | `Client` |
| `ContactLogs.csv` | 1,039 | `note` rows with Mindbody contact-log context |
| `Indexes.csv` | 3,578 | `Client.metadata.indexes` |
| `Locations.csv` | 2 | `Location` |
| `Notes.csv` | 2,477 | `note` rows and client metadata context |
| `Payments.csv` | 11,706 | `StudioPayment` |
| `Products.csv` | 159 | `StudioProduct` catalog |
| `Referrers.csv` | 6 | lookup/metadata enrichment where present |
| `ReservationData.csv` | 169 | `StudioClass`, `StudioBooking`, `CheckIn` |
| `Trainers.csv` | 58 | `StudioStaffMember` for every row; `Instructor` only for active, non-system, teaching staff |
| `VisitData.csv` | 53,400 | `StudioClass`, `StudioBooking`, `CheckIn` |
| `VisitPaymentLinking.csv` | 53,403 | `StudioBookingPayment` linking bookings to credits, payments, and sale line items |
| `files/` | 3,084 | `ClientDocument` |
| `contractsignatures/` | 603 | `ClientDocument` with `CONTRACT_SIGNATURE` |
| `sales/` | 2 | `ClientDocument` with `SALE_IMAGE` |

Observed source distributions that matter for reconciliation:

- Visit statuses: Completed 44,988; No Show 4,403; Late Cancel 4,009.
- Reservation statuses: Completed 156; No Show 13.
- Visit class types: class 53,220; session 160; blank 20.
- `VisitPaymentLinking.PmtRefNo` matches `ClientPricingOptions.PmtRefNo` or `PaymentDataID` for 53,400 rows, so usage must be linked to `ClassCredit`, not only payment metadata.
- Payment types: Visa/MC 6,472; AMEX 1,836; Comp/Guest 1,490; Apple Pay 1,190; Cash 657; Account 40.
- `Payments.PaymentAmount` and `ClientSales.SDPaymentAmt` both reconcile to 1,225,096.05 GBP.
- Product categories include Pay as you Go, Pre-clients, Monthly Memberships, Private Sessions, Clothing, Open Days, Fees, Payments on Account, Shipping & Handling, Tip, and Wellhub Revenue.
- `files/<MBSystemID>/...` contains waivers/client documents; the client reference is the parent folder, not the file basename.
- `sales/403.png` and `sales/404.png` match SaleID/PmtRefNo/payment rows and should be linked as sale-image documents.
- Client identity must be resolved by `MBSystemID` or `BarcodeID` first. Email is only a fallback for source rows that do not carry a Mindbody identifier, because Mindbody exports can contain separate clients sharing one email address.

## Implemented Schema

Implemented in:

- `src/db/schema.ts`
- `src/db/enums.ts`
- `src/db/relations.ts`
- `drizzle/0002_mindbody_import_catalog.sql`
- `drizzle/0003_index_opclass_corrections.sql`
- `drizzle/0005_mindbody_sale_details_staff.sql`
- `drizzle/0006_mindbody_document_payment_credit_links.sql`

### Client

Table: `Client`

Implemented Mindbody fields:

```ts
mindbodyId: text()
barcodeId: text()
firstName: text()
lastName: text()
middleName: text()
nickname: text()
addressLine1: text()
addressLine2: text()
state: text()
postalCode: text()
dateOfBirth: timestamp({ precision: 3, mode: "date" })
gender: text()
homePhone: text()
workPhone: text()
mobilePhone: text()
emergencyContactRelation: text()
emergencyContactEmail: text()
notificationPrefs: jsonb()
```

Keys/indexes:

- `Client_organizationId_mindbodyId_key`
- `Client_organizationId_barcodeId_key`
- `Client_mindbodyId_idx`
- `Client_barcodeId_idx`

### Location

Table: `Location`

Implemented Mindbody fields:

```ts
externalId: text()
contactName: text()
taxGrouping: text()
taxId: text()
taxRates: jsonb()
description: text()
metadata: jsonb()
isActive: boolean().default(true).notNull()
```

`taxGrouping` is text because Mindbody exports can carry non-boolean values. This keeps the source value intact and leaves normalized tax behavior to a future billing/tax layer.

Keys/indexes:

- `Location_organizationId_externalId_key`
- `Location_externalId_idx`
- `Location_isActive_idx`

### Instructor

Table: `Instructor`

Strict import rule: only active, non-deleted, non-system, non-integration rows that can teach classes/appointments/reservations/workshops are imported as instructors. API users such as `_MBO.* API`, ActiveCampaign, Lymber, ClassPass/Gympass, scheduling integrations, and inactive trainers are preserved as staff records but are not shown as instructors.

Implemented Mindbody fields:

```ts
mindbodyTrainerId: text()
commissionConfig: jsonb()
employmentStart: timestamp({ precision: 3, mode: "date" })
employmentEnd: timestamp({ precision: 3, mode: "date" })
isSystem: boolean().default(false).notNull()
```

Key:

- `Instructor_organizationId_mindbodyTrainerId_key`

### StudioStaffMember

Table: `StudioStaffMember`

This preserves the full Mindbody `Trainers.csv` without polluting the instructor roster.

Implemented fields:

```ts
organizationId: text().notNull()
locationId: text()
externalId: text() // TrainerID
employeeId: text()
firstName: text()
lastName: text()
name: text().notNull()
email: text()
phone: text()
role: text()
staffType: text().default("TEAM_MEMBER").notNull()
isActive: boolean().default(true).notNull()
isSystem: boolean().default(false).notNull()
isIntegrationAccount: boolean().default(false).notNull()
canTeachClasses: boolean().default(false).notNull()
canTakeAppointments: boolean().default(false).notNull()
canHandleReservations: boolean().default(false).notNull()
canLeadWorkshops: boolean().default(false).notNull()
hourlyRate: numeric({ precision: 10, scale: 2 })
currency: text().default("GBP")
employmentStart: timestamp({ precision: 3, mode: "date" })
employmentEnd: timestamp({ precision: 3, mode: "date" })
metadata: jsonb()
```

Keys/indexes:

- `StudioStaffMember_organizationId_externalId_key`
- organization/location/type/activity/email indexes

### StudioProduct Product Catalog

Table: `StudioProduct`

This was added so POS and revenue products are not hidden inside payment metadata. It supports clothing, fees, account payments, shipping and handling, tips, Wellhub/Gympass/ClassPass revenue, gift cards, class packs, and membership plans.

Implemented fields:

```ts
organizationId: text().notNull()
locationId: text()
externalId: text()
sku: text()
name: text().notNull()
description: text()
type: studioProductType().default("OTHER").notNull()
category: text()
price: numeric({ precision: 10, scale: 2 }).default("0").notNull()
cost: numeric({ precision: 10, scale: 2 })
currency: text().default("GBP").notNull()
taxRate: numeric({ precision: 5, scale: 2 })
trackInventory: boolean().default(false).notNull()
stockQuantity: integer()
lowStockThreshold: integer()
isActive: boolean().default(true).notNull()
isPublic: boolean().default(true).notNull()
metadata: jsonb()
```

Enum: `StudioProductType`

```ts
"MEMBERSHIP_PLAN" | "CLASS_PACK" | "RETAIL" | "FEE" | "ACCOUNT_CREDIT" | "SHIPPING" | "TIP" | "EXTERNAL_REVENUE" | "GIFT_CARD" | "OTHER"
```

Keys/indexes:

- `StudioProduct_organizationId_externalId_key`
- `StudioProduct_organizationId_sku_key`
- organization/location/type/category/activity indexes

App surface:

- Router: `src/features/studio/server/product-catalog-router.ts`
- Page: `/studio/products`
- Client UI: `src/features/studio/components/product-catalog-page-client.tsx`
- Sidebar: Revenue -> Product catalog

### StudioMembership

Table: `StudioMembership`

Implemented changes:

- `price` is `numeric({ precision: 10, scale: 2 })`, not floating point.
- Mindbody payment fields: `paymentMethod`, `suspendNotes`, `totalPayments`, `remainingPayments`, `paymentFrequency`.
- `externalId` is used for `ClientContractID`.

### ClassCredit

Table: `ClassCredit`

Implemented changes:

```ts
organizationId: text().notNull()
locationId: text()
externalId: text()
paymentRefNo: text()
productId: text()
metadata: jsonb()
membershipId: text() // nullable
```

Nullable `membershipId` supports standalone packs and pricing options from Mindbody without creating fake memberships.

### StudioClass, StudioBooking, CheckIn

Implemented behavior:

- Visit/reservation rows group into `StudioClass` by a stable visit key.
- `StudioBooking.externalId` stores Mindbody visit IDs.
- `StudioBooking.status` maps attended, no-show, cancelled, and booked states.
- `StudioCheckInMethod` includes `IMPORT`.
- Imported attended visits create `CheckIn` rows with `method = IMPORT`.
- `CheckIn.metadata` stores source row/file context.

### StudioPayment

Table: `StudioPayment`

Implemented fields:

```ts
productId: text()
externalId: text()
mindbodyPmtRefNo: text()
paymentMethod: text()
taxAmount: numeric({ precision: 10, scale: 2 })
```

Imported payments link to `StudioProduct` when `ProductID` resolves.

### StudioPaymentLineItem

Table: `StudioPaymentLineItem`

`ClientSales.csv` is sale detail, not just payment summary data. Each `SDID` is imported as a line item and linked to `StudioPayment` by `SaleID` when possible.

Implemented fields:

```ts
organizationId: text().notNull()
locationId: text()
paymentId: text()
clientId: text()
productId: text()
externalId: text() // SDID
saleId: text()
mindbodyPmtRefNo: text()
productExternalId: text()
description: text()
category: text()
quantity: integer().default(1).notNull()
unitPrice: numeric({ precision: 10, scale: 2 }).default("0").notNull()
discountAmount: numeric({ precision: 10, scale: 2 }).default("0").notNull()
amount: numeric({ precision: 10, scale: 2 }).default("0").notNull()
currency: text().default("GBP").notNull()
returned: boolean().default(false).notNull()
soldAt: timestamp({ precision: 3, mode: "date" })
metadata: jsonb()
```

Keys/indexes:

- `StudioPaymentLineItem_organizationId_externalId_key`
- payment/client/product/sale/PmtRefNo/date indexes

### StudioBookingPayment

Table: `StudioBookingPayment`

`VisitPaymentLinking.csv` links a visit to the pricing option/credit and, where available, to the payment and sale line item that created that credit.

Implemented fields:

```ts
organizationId: text().notNull()
locationId: text()
bookingId: text().notNull()
paymentId: text()
lineItemId: text()
classCreditId: text()
visitRefNo: text().notNull()
mindbodyPmtRefNo: text().notNull()
metadata: jsonb()
```

Key:

- `StudioBookingPayment_organizationId_visitRefNo_pmtRefNo_key`

### ImportJob

Table: `ImportJob`

Implemented fields:

```ts
locationId: text()
importConfig: jsonb().default({}).notNull()
entityCounts: jsonb().default({}).notNull()
entityProgress: jsonb().default({}).notNull()
sourceFilenames: text().array().default([])
warningLog: jsonb().default([]).notNull()
missingFields: jsonb().default([]).notNull()
```

`missingFields` captures CSV headers that are not mapped to first-class columns. Raw source rows are still preserved in metadata where possible.

### ClientDocument

Table: `ClientDocument`

Implemented for client PDFs/images, contract signatures, and sale images.

```ts
organizationId: text().notNull()
locationId: text()
clientId: text().notNull()
membershipId: text()
paymentId: text()
paymentLineItemId: text()
source: importSource().default("MINDBODY").notNull()
sourcePath: text()
fileName: text().notNull()
fileType: text()
storageUrl: text()
documentType: clientDocumentType().default("OTHER").notNull()
metadata: jsonb()
```

Enum: `ClientDocumentType`

```ts
"WAIVER" | "CONTRACT_SIGNATURE" | "PROFILE_FILE" | "SALE_IMAGE" | "OTHER"
```

Contract signature matching order:

1. `contractsignatures/<RowID>.jpg` resolves through the membership map.
2. `files/<MBSystemID>/*` resolves through the parent folder to the client.
3. Sale images resolve through `SaleID`/`PmtRefNo` to `StudioPayment` and `StudioPaymentLineItem`.
4. If no client resolves, preserve the file reference in the import warning log.

## Implemented Pipeline

Implemented files:

| File | Responsibility |
|---|---|
| `src/features/studio/import/lib/mindbody-csv.ts` | CSV parser, file classifier, expected-header checks |
| `src/features/studio/import/server/mindbody-import-service.ts` | Mindbody import service and Drizzle write layer |
| `src/features/studio/server/import-router.ts` | tRPC import job creation, file preview, cancellation |
| `src/inngest/functions/studio-import.ts` | Inngest orchestration |
| `src/app/api/uploadthing/core.ts` | `mindbodyImportFile` upload route |
| `src/app/(dashboard)/(rest)/studio/import/page.tsx` | Dashboard import UI |
| `src/app/(dashboard)/(rest)/studio/products/page.tsx` | Product catalog route |
| `src/app/onboarding/studio/page.tsx` | Scratch vs Mindbody onboarding choice |
| `src/app/(dashboard)/settings/notifications/page.tsx` | Import notification settings |
| `src/lib/notifications.ts` | Import notification types |

Processing order:

```text
1. Locations.csv                         -> Location
2. Clients.csv + related client CSVs      -> Client
3. Trainers.csv                          -> StudioStaffMember + strict Instructor
4. Products.csv                          -> StudioProduct
5. ClientAutopayContracts.csv            -> StudioMembership
6. ClientPricingOptions.csv              -> ClassCredit
7. VisitData.csv + ReservationData.csv   -> StudioClass + StudioBooking + CheckIn
8. Payments.csv                          -> StudioPayment
9. ClientSales.csv                       -> StudioPaymentLineItem + payment enrichment
10. VisitPaymentLinking.csv              -> StudioBookingPayment
11. AccountBalances.csv                  -> StudioPayment account credit entries
12. Notes.csv + ContactLogs.csv          -> note
13. AppointmentNotes.csv                 -> note linked by visit/client context
14. ClientRelationships.csv              -> ClientHousehold + ClientHouseholdMember
15. files/ + contractsignatures/ + sales -> ClientDocument
```

The importer is generalized for all studios:

- Accepts uploaded files instead of hardcoding local export paths.
- Accepts a full Mindbody ZIP and expands supported nested ZIPs such as `files.zip`, `contractsignatures.zip`, and `sales.zip`.
- Classifies known Mindbody files and safely logs unknown files.
- Supports dry runs.
- Uses stable external IDs for idempotency where available.
- Preserves raw source rows in metadata.
- Records unmapped headers in `ImportJob.missingFields`.
- Emits notifications when imports start, complete, fail, or need mapping review.

## Onboarding Flow

Implemented in `src/app/onboarding/studio/page.tsx`.

The first onboarding step asks users to choose:

- Import from Mindbody
- Start from scratch

Start from scratch keeps the existing studio/location setup flow.

Import from Mindbody creates the organization/location shell first, then redirects to:

```text
/studio/import?source=mindbody&onboarding=1
```

The import page lets users upload the Mindbody export files, review detected file categories, and run a dry run or full import.

## Extra Field Strategy

For studios that import fields Aurea does not model directly:

1. The import does not fail only because a CSV contains extra headers.
2. Extra headers are captured in `ImportJob.missingFields` and `ImportJob.warningLog`.
3. Full raw source row fragments are preserved in entity metadata.
4. The import can complete with mapping review needed.
5. The organization receives an `IMPORT_NEEDS_REVIEW` notification.
6. The team can inspect missing headers, add first-class schema support later, and let the studio run an enrichment import from `/studio/import`.

This preserves data without blocking onboarding.

## Notification and Settings Integration

Implemented notification types:

- `IMPORT_STARTED`
- `IMPORT_COMPLETED`
- `IMPORT_FAILED`
- `IMPORT_NEEDS_REVIEW`

`entityType` supports `import`.

`/settings/notifications` includes an Imports notification group so admins can control import status and mapping-review notifications.

## File Mapping Details

### Locations.csv -> Location

| Mindbody field | Aurea field |
|---|---|
| `LocationID` | `Location.externalId` |
| `LocationName` | `Location.companyName` |
| `StreetAddress` | `Location.addressLine1` |
| `City` | `Location.city` |
| `StateProvCode` | `Location.state` |
| `PostalCode` | `Location.postalCode` |
| `Country` | `Location.country` |
| `Phone` | `Location.phone` |
| `Email` | `Location.billingEmail` |
| `ContactName` | `Location.contactName` |
| `TaxGrouping` | `Location.taxGrouping` |
| `TaxID` | `Location.taxId` |
| `Tax1..Tax5` | `Location.taxRates` |
| `LocationDescription` | `Location.description` |
| `Active` | `Location.isActive` |

### Trainers.csv -> Instructor

All rows are first preserved in `StudioStaffMember`. Only strict instructors are then imported into `Instructor`.

| Mindbody field | Aurea field |
|---|---|
| `TrainerID` | `Instructor.mindbodyTrainerId` |
| `Firstname`, `Lastname` | `firstName`, `lastName`, `name` |
| address fields | matching instructor address fields |
| `Cellphone`, `Homephone`, `Workphone` | `phone` |
| `Email` | `email` |
| `Birthdate` | `dateOfBirth` |
| `Notes`, `Bio` | `bio`, `customFields` |
| `Active` | `isActive` |
| `EmpID` | `employeeId` |
| `Male` | `gender` |
| `HourlyRate` | `hourlyRate` |
| commission fields | `commissionConfig` |
| `EmploymentStart`, `EmploymentEnd` | `employmentStart`, `employmentEnd` |

Instructor exclusion rules:

- `Active` must be true and `Delete` must not be true.
- `isSystem` must not be true.
- API/integration identities such as `_MBO.* API`, ActiveCampaign, Lymber, scheduling, FitMetrix, ClassPass, and Gympass are excluded from `Instructor`.
- At least one teaching flag must be true: `Teacher`, `AppointmentTrn`, `ReservationTrn`, or `Workshop Instructor`.
- Excluded rows remain queryable as `StudioStaffMember`.

### Products.csv -> StudioProduct

| Mindbody field | Aurea field |
|---|---|
| `ProductID` | `StudioProduct.externalId` |
| `BarcodeID` | `StudioProduct.sku` |
| `Description` | `name`, `description` |
| `CategoryName`, `ServiceCategoryName` | `category` |
| `UnitPrice` | `price` |
| `OurCost` | `cost` |
| `Count` | `stockQuantity` where inventory semantics apply |
| `ReorderLevel` | `lowStockThreshold` |
| `Discontinued` | `isActive = !Discontinued` |
| `ItemTypeName`, `ItemTypeID`, duration fields | `metadata.raw` |

Product type mapping:

- Monthly memberships/contracts -> `MEMBERSHIP_PLAN`
- Class packs, private sessions, sessions -> `CLASS_PACK`
- Clothing/retail/merchandise -> `RETAIL`
- Fees -> `FEE`
- Payments on account -> `ACCOUNT_CREDIT`
- Shipping/handling -> `SHIPPING`
- Tips -> `TIP`
- Wellhub/Gympass/ClassPass -> `EXTERNAL_REVENUE`
- Gift certificates/cards -> `GIFT_CARD`
- Unknown categories -> `OTHER`

### Clients.csv -> Client

| Mindbody field | Aurea field |
|---|---|
| `MBSystemID` | `Client.mindbodyId` |
| `BarcodeID` | `Client.barcodeId` |
| `FirstName`, `LastName` | `firstName`, `lastName`, `name` |
| `MiddleName`, `Nickname` | matching first-class fields |
| address fields | matching client address fields |
| `CellPhone`, `HomePhone`, `WorkPhone` | `phone`, dedicated phone fields |
| `EmailName` | `email` |
| `Birthdate` | `dateOfBirth`, `birthMonth`, `birthDay` |
| `ReferredBy` | `metadata.referredBy` |
| emergency fields | matching emergency fields |
| `LocationID`, `LocationName` | `locationId` lookup |
| `LiabilityAgreementDate` | `waiverSignedAt` |
| `Website`, `CompanyName` | `website`, `companyName` |
| `IsProspect`, `Inactive` | `type`, `acquisitionStage` |
| `FirstContactDate`, `ProfileCreationDate` | `acquiredAt` |
| `FirstClassDate`, `FirstApptDate` | `trialStartedAt` |
| `Gender` | `gender` |
| other fields | `metadata.raw` |

Client stage mapping:

- `Inactive=True` -> `type=CHURN`, `acquisitionStage=LOST`.
- `IsProspect=True` and not inactive -> `type=PROSPECT`, `acquisitionStage=INQUIRY`.
- Otherwise -> `type=CUSTOMER`, `acquisitionStage=ACTIVE`.

Identity matching rule:

1. `MBSystemID` lookup.
2. `BarcodeID` lookup.
3. Email lookup only when the source row has neither `MBSystemID` nor `BarcodeID`.

This preserves all 4,310 clients in the Wembley export, including clients who share a household or admin email address.

### ClientNotifications.csv -> Client.notificationPrefs

Stored as JSON with promotional, schedule, account, operational, and Twilio preferences.

### ClientTypes.csv -> Client.tags

Each `TypeName` is appended to `Client.tags`.

### Indexes.csv -> Client.metadata

`Experience Level`, `Primary Reason for Visiting`, and `Update HighLevel` are preserved under metadata.

### Notes.csv / ContactLogs.csv / AppointmentNotes.csv -> note

- `Notes.csv` and `ContactLogs.csv` create client notes.
- `AppointmentNotes.csv` creates notes tagged with the Mindbody visit reference.
- Raw source row/file context is preserved.

### ClientRelationships.csv -> ClientHousehold

Each relationship pair creates a household and two household members when both clients resolve.

### AccountBalances.csv -> StudioPayment

Non-zero balances create POS/account-credit payment rows linked to a synthetic `StudioProduct` named `Payment on account`.

### ClientAutopayContracts.csv -> StudioMembership

| Mindbody field | Aurea field |
|---|---|
| `ClientContractID` | `StudioMembership.externalId` |
| `ReceivingClientId`, `PayingClientID` | `clientId` lookup |
| `Location` | `locationId` lookup |
| `ContractName` | `name` |
| `ContractStartDate`, `ContractEndDate` | `startDate`, `endDate` |
| `AutoRenewing` | `autoRenew` |
| `NormalPaymentAmount`, `FirstPaymentAmount` | `price` |
| `TotalNumberofPayments`, `RemainingPayments` | matching payment count fields |
| `PaymentFrequency` | `paymentFrequency` |
| `NextPaymentDate` | `renewalDate` |
| suspension fields | `frozenAt`, `frozenUntil`, `suspendNotes` |
| `PaymentMethod` | `paymentMethod` |
| `RowID` | metadata and document link key |

### ClientPricingOptions.csv -> ClassCredit

| Mindbody field | Aurea field |
|---|---|
| `PaymentDataID`, `PmtRefNo` | `ClassCredit.externalId` |
| `ClientContractID` | `membershipId` lookup when present |
| `MBSystemID`, `BarcodeID` | `clientId` lookup |
| `NumClasses` | `totalCredits` |
| `Remaining` | `usedCredits = totalCredits - remaining` |
| `ExpDate` | `expiresAt` |
| `PmtRefNo` | `paymentRefNo` |
| `ProductID` | `productId` lookup |
| other fields | `metadata.raw` |

### VisitData.csv + ReservationData.csv -> StudioClass + StudioBooking + CheckIn

Class grouping key:

```text
Description + VisitDate + VisitStartTime + VisitEndTime + TrainerID + VisitLocation
```

Status mapping:

- Completed / attended -> `ATTENDED` booking and `IMPORT` check-in.
- No Show -> `NO_SHOW`.
- Cancelled / Late Cancel -> cancellation status where supported; details stay in metadata.
- Unknown -> `BOOKED`.

### Payments.csv -> StudioPayment

| Mindbody field | Aurea field |
|---|---|
| `SaleID` | `StudioPayment.externalId` |
| `MBSystemID`, `BarcodeID` | `clientId` lookup |
| `PaymentAmount` | `amount` |
| `PaymentTax` | `taxAmount` |
| `PaymentDiscount` | `discountAmount` |
| `PmtTypes` | `paymentMethod` |
| `PaymentNotes` | `description` |
| other fields | `metadata.raw` |

Payment card/type detail:

- `PmtTypes` is preserved exactly (`Visa/MC`, `AMEX`, `Apple Pay`, `Google Pay`, `Cash`, `Account`, `Comp/Guest`, etc.).
- `DebitCardExtID` is preserved in raw metadata even when blank in the Wembley export.

### ClientSales.csv -> StudioPaymentLineItem

| Mindbody field | Aurea field |
|---|---|
| `SDID` | `StudioPaymentLineItem.externalId` |
| `SaleID` | `saleId`, `paymentId` lookup |
| `PmtRefNo` | `mindbodyPmtRefNo` |
| `MBSystemID`, `BarcodeID` | `clientId` lookup |
| `ProductID` | `productId`, `productExternalId` |
| `Description` | `description` |
| `CategoryName` | `category` |
| `Quantity` | `quantity` |
| `UnitPrice` | `unitPrice` |
| `Discount` | `discountAmount` |
| `SDPaymentAmt` | `amount` |
| `Returned` | `returned` |
| `SaleDate` | `soldAt` |

If `Payments.csv` is missing a `SaleID`, the importer creates a shell `StudioPayment` from grouped `ClientSales.csv` lines so no sale detail is lost.

### VisitPaymentLinking.csv -> StudioBookingPayment

| Mindbody field | Aurea field |
|---|---|
| `VisitRefNo` | `bookingId` lookup and `visitRefNo` |
| `PmtRefNo` | `classCreditId`, `paymentId`, and `lineItemId` lookups where available |

Primary matching order:

1. `PmtRefNo` -> `ClassCredit.paymentRefNo`.
2. `PmtRefNo` -> `StudioPaymentLineItem.mindbodyPmtRefNo`.
3. `PmtRefNo` -> `StudioPayment.mindbodyPmtRefNo`.

### files/ and contractsignatures/ -> ClientDocument

- `files/<MBSystemID>/*` resolves by Mindbody/client numeric reference when possible.
- Waiver filenames (`signedwaiver`, `brandedweb-liabilitywaiversignature`) are stored as `WAIVER`.
- Contract filenames (`contractsignature...`) and `contractsignatures/<RowID>.jpg` are stored as `CONTRACT_SIGNATURE`.
- `contractsignatures/<RowID>.jpg` resolves through membership first.
- `sales/*` creates `SALE_IMAGE` documents linked to the matching payment/line item where resolvable.
- Orphan files are logged and not discarded silently.

## Onboarding and Import Edge Cases

| Scenario | Behavior |
|---|---|
| New studio starts from scratch | Existing onboarding creates org/location without import |
| Studio imports full Mindbody export | Upload files in onboarding or dashboard import page; import runs through Inngest |
| Studio imports only CSVs | Entity import runs; missing documents are not fatal |
| Studio imports documents before matching clients/contracts | Unresolved documents are logged as warnings for later enrichment |
| Export contains extra CSV headers | Headers are stored in `missingFields`; raw values are preserved in metadata |
| Export has duplicate Mindbody IDs | Upsert by first-class external IDs instead of creating duplicates |
| Export has duplicate/shared emails | Keep separate clients by Mindbody ID/barcode; do not collapse them by email |
| Export has partial row failures | Row-level errors go to `errorLog`; other rows can continue |
| Import should be tested first | Dry run parses/classifies/counts without final entity writes |
| More mappings are added later | User can run another `/studio/import` enrichment import |
| Admins need status visibility | Import notifications appear in `/settings/notifications` |

## Migrations and Commands

Implemented migrations:

- `drizzle/0000_prisma_baseline.sql`
- `drizzle/0001_studio-renames.sql`
- `drizzle/0002_mindbody_import_catalog.sql`
- `drizzle/0003_index_opclass_corrections.sql`
- `drizzle/0004_user_delete_cascade_tasks.sql`
- `drizzle/0005_mindbody_sale_details_staff.sql`
- `drizzle/0006_mindbody_document_payment_credit_links.sql`

Relevant scripts:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "node scripts/drizzle-migrate.mjs",
"db:push": "drizzle-kit push"
```

Detail backfill utility for local/staging imports that completed before sale-line/document/staff detail tables existed:

```bash
bun -e "await import('./scripts/backfill-mindbody-import-details.ts')"
```

`db:migrate` uses `scripts/drizzle-migrate.mjs` so runtime Drizzle migrations use this URL precedence:

```text
DRIZZLE_DATABASE_URL -> DATABASE_URL -> DIRECT_URL
```

This avoids applying the commented baseline and avoids accidentally preferring the wrong direct URL.

Applied/verified on 2026-05-20:

- `npm run db:generate`
- `npm run db:migrate`
- `npm run typecheck`
- `npm run build`

The migrated database has `Location`, `Client`, `StudioProduct`, and `ClientDocument`; old `Subaccount` and `Contact` tables are no longer present after the rename migration.

## Cutover Verification Checklist

Before a production customer cutover, run a staging import with the exact export snapshot and verify:

1. Row counts:
   - Clients imported = 4,310.
   - Locations imported = 2.
   - Staff records imported = 58.
   - Strict instructors imported = 11 active non-system teaching rows for this export.
   - Visit + reservation bookings imported = 53,569 minus intentional skips.
   - Payments imported = 11,706 payment records plus shell payments for sales present in `ClientSales.csv` but absent from `Payments.csv`.
   - Sale line items imported = 11,732.
   - Visit/payment/credit links imported = 53,400 because three `VisitPaymentLinking.csv` visit refs are not present in `VisitData.csv`.
   - Products imported = 159 catalog items.
   - Client documents imported = 3,689 (`files/` 3,084, `contractsignatures/` 603, `sales/` 2).
2. Referential integrity:
   - No bookings without `clientId` or `classId` unless logged.
   - No memberships without `clientId` unless logged.
   - No payments with unresolved `clientId` unless intentionally allowed and logged.
   - Visit payment links should resolve to `ClassCredit` for 53,400 Wembley rows.
   - No client documents without a resolved client unless logged as orphaned.
3. Financial reconciliation:
   - Sum `StudioPayment.amount` matches `Payments.PaymentAmount`.
   - Sum `StudioPaymentLineItem.amount` matches `ClientSales.SDPaymentAmt`.
   - Tax and discount sums match source `PaymentTax` and `PaymentDiscount` totals.
   - No imported money is stored in floating-point schema columns.
4. Attendance reconciliation:
   - Completed visits create `ATTENDED` bookings and `IMPORT` check-ins.
   - No Show and Late Cancel counts match parsed source counts.
5. Membership reconciliation:
   - Unique `ClientContractID` count equals imported `StudioMembership.externalId` count after dedupe.
   - Contract signature images link by RowID first.
   - Client files under `files/<MBSystemID>/` link to the folder client.
   - Sale images link to matching payment/line-item refs.
6. Product catalog reconciliation:
   - Clothing, fees, account payments, shipping, tips, Wellhub/external revenue, gifts, packs, and memberships are visible under `/studio/products`.
7. User-facing checks:
   - Onboarding Mindbody path redirects to `/studio/import`.
   - Dashboard import history shows counts, warnings, errors, and completion state.
   - `/settings/notifications` exposes import notification settings.
