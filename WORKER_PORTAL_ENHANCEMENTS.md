# Worker Portal Enhancements - Implementation Summary

This document outlines the comprehensive enhancements made to the worker portal system, focusing on earnings tracking, time management, and request workflows.

## ✅ Completed Features

### 1. Earnings Dashboard (`/portal/[workerId]/earnings`)

**Purpose**: Provide workers with complete visibility into their earnings, hours worked, and payment status.

**Features Implemented**:
- **Monthly View**: Select and view earnings data for any of the last 6 months
- **Summary Statistics**:
  - Total hours worked
  - Total earnings (calculated)
  - Approved earnings (ready for payment)
  - Pending earnings (submitted/draft status)

- **Hours Breakdown by Status**:
  - Approved hours & earnings (green)
  - Submitted hours & earnings (blue)
  - Draft hours & earnings (amber)
  - Overtime hours & earnings (purple) - with 1.5x rate calculation

- **Payment Status Tracking**:
  - Paid amount (from paid invoices)
  - Pending payment amount (from sent/overdue invoices)
  - Not yet invoiced amount (approved time logs without invoices)
  - Count of invoices in each status

- **Detailed Views**:
  - List of all time logs for the period with status badges
  - Related invoices with payment information
  - Export button (ready for implementation)

**Backend Support**:
- `workers.getEarnings` tRPC procedure
- Comprehensive statistics calculation
- Overtime earnings tracking
- Invoice relationship mapping

**Files Created/Modified**:
- `src/app/portal/[workerId]/earnings/page.tsx` (new)
- `src/features/workers/server/router.ts` (added getEarnings procedure)
- `src/app/portal/[workerId]/layout.tsx` (added nav link)

---

### 2. Shift Swap & Time Off Request System

**Already Implemented** (verified existing implementation):

**Database Schema** (`prisma/schema.prisma`):
- `ShiftSwapRequest` model with full workflow:
  - Status: PENDING, WORKER_ACCEPTED, ADMIN_APPROVED, ADMIN_REJECTED, WORKER_REJECTED, CANCELLED, EXPIRED
  - Support for targeting specific workers or open requests
  - Expiration dates for automatic cleanup
  - Admin approval tracking
  - Rejection reasons

- `WorkerAvailability` model:
  - Recurring weekly availability patterns
  - Date range support (effectiveFrom/effectiveTo)
  - Active/inactive toggles
  - Notes for special conditions

**UI Components** (`/portal/[workerId]/requests`):
- Unified request management interface
- Create shift swap requests from upcoming shifts
- Create time off requests with date ranges and half-day support
- Status-based filtering (All, Pending, Completed)
- Visual status badges and icons
- Cancel functionality for pending requests
- Detailed request information display

**Request Types Supported**:
1. **Shift Swaps**:
   - Select from upcoming shifts
   - Optional reason/explanation
   - Auto-expiry after 7 days
   - Worker acceptance → Admin approval workflow

2. **Time Off Requests**:
   - 9 types: Vacation, Sick, Personal, Bereavement, Parental, Unpaid, Compensatory, Public Holiday, Other
   - Date range selection
   - Half-day options for start/end dates
   - Reason field
   - PENDING → APPROVED/REJECTED workflow

---

### 3. Time Log Approval System

**Database Support** (already in schema):
- `TimeLog.status`: DRAFT, SUBMITTED, APPROVED, REJECTED
- `approvedAt`, `approvedBy`, `rejectedAt`, `rejectedBy` fields
- `rejectionReason` field
- `isOvertime` and `overtimeHours` tracking
- `complianceFlags` for break violations, etc.

**Worker Portal View** (already implemented):
- Time logs page with status visualization
- Recent time logs on dashboard
- Earnings page showing breakdown by approval status

---

## 🔄 Next Implementation Steps

### 1. Admin Time Log Approval UI

**Priority**: High
**Complexity**: Medium
**Location**: `/dashboard/time-logs` (admin side)

**Features Needed**:
- Bulk approval/rejection interface
- Filter by status (pending approval, approved, rejected)
- Filter by worker
- Quick action buttons (Approve, Reject, Request Changes)
- Rejection reason dialog
- Audit trail display
- Real-time notifications to workers

**Backend Requirements**:
- `timeLogs.bulkApprove` mutation
- `timeLogs.bulkReject` mutation
- `timeLogs.requestChanges` mutation
- Notification system integration

---

### 2. Auto-Invoice Generation from Time Logs

**Priority**: High
**Complexity**: Medium
**Location**: New button/dialog on time logs admin page

**Features**:
- "Generate Invoice" button on approved time logs table
- Group selection options:
  - By worker
  - By date range
  - By client/contact
  - By project/deal
- Preview before creating:
  - Line items auto-populated
  - Rates from worker hourly rate
  - Subtotal calculation
  - Ability to adjust before finalizing
- Batch invoice creation
- Link time logs to invoices automatically

**Backend Requirements**:
- `invoices.generateFromTimeLogs` mutation
- Group time logs by selected criteria
- Calculate totals and apply rates
- Create invoice with line items
- Update time log `invoiceId` references

---

### 3. Availability Calendar UI

**Priority**: Medium
**Complexity**: Medium
**Location**: `/portal/[workerId]/availability` (new page)

**Features**:
- Weekly recurring availability view
- Drag-to-set time blocks
- Different patterns per day of week
- Special date ranges (e.g., "unavailable Dec 20-27")
- Visual calendar display
- Quick templates (e.g., "9-5 weekdays", "flexible")
- Save and apply availability

**Backend Requirements** (mostly exists):
- `availability.set` mutation (create WorkerAvailability records)
- `availability.get` query (fetch current patterns)
- `availability.checkConflicts` query (validate against scheduled rotas)

---

### 4. Overtime Detection & Notifications

**Priority**: Medium
**Complexity**: Low
**Location**: Background job + dashboard alerts

**Features**:
- Automatic detection when time log exceeds:
  - 8 hours in a day (configurable)
  - 40 hours in a week (configurable)
  - Scheduled shift end time
- Flag time logs with `isOvertime: true`
- Calculate overtime hours
- Apply overtime rate (1.5x or configurable)
- Notifications:
  - Alert worker when overtime logged
  - Alert admin/manager for approval
  - Weekly summary of overtime hours

**Backend Requirements**:
- Background job to check submitted time logs
- Overtime calculation logic
- Update `isOvertime` and `overtimeHours` fields
- Notification triggers
- Configuration table for overtime rules

---

### 5. Rota Conflict Detection

**Priority**: High (prevents scheduling errors)
**Complexity**: Low
**Location**: Rota creation/edit dialog

**Features**:
- Check for overlapping shifts when scheduling
- Visual warnings for conflicts
- Cross-reference with:
  - Other rotas
  - Time off requests (approved)
  - Worker availability patterns
- Suggested alternatives
- Override option with confirmation

**Backend Requirements**:
- `rotas.checkConflicts` query
- Overlap detection algorithm
- Integration with availability and time off

---

### 6. Admin Requests Management

**Priority**: Medium
**Complexity**: Low
**Location**: `/dashboard/requests` (admin side)

**Features**:
- View all shift swap requests org-wide
- View all time off requests org-wide
- Bulk approval/rejection
- Assignment of replacement workers
- Calendar view of pending requests
- Email notifications to workers

**Backend Requirements**:
- `shiftSwaps.adminList` query
- `shiftSwaps.approve` mutation
- `shiftSwaps.reject` mutation
- `shiftSwaps.assignReplacement` mutation
- Similar mutations for time off

---

## 📊 Data Flow Diagrams

### Earnings Calculation Flow
```
Time Logs (with status & rates)
  ↓
getEarnings procedure
  ↓
Calculate: total, approved, submitted, draft, overtime
  ↓
Group by invoice status
  ↓
Return stats + logs + invoices
  ↓
Earnings Page (visualize data)
```

### Time Log Approval Flow
```
Worker clocks in/out → TimeLog (DRAFT)
  ↓
Worker submits → TimeLog (SUBMITTED)
  ↓
Manager reviews → Approve/Reject action
  ↓
If approved: TimeLog (APPROVED) → Ready for invoicing
If rejected: TimeLog (REJECTED) → Worker notified
```

### Auto-Invoice Generation Flow
```
Admin selects approved time logs
  ↓
Groups by worker/client/period
  ↓
Calculates totals (hours × hourly rate)
  ↓
Previews invoice with line items
  ↓
Admin confirms
  ↓
Creates Invoice + InvoiceLineItems
  ↓
Links TimeLog.invoiceId
  ↓
Optionally sends invoice to client
```

---

## 🎯 Impact Summary

### Worker Benefits
- **Transparency**: See exactly what's been approved, pending, and paid
- **Self-Service**: Request shift swaps and time off without phone calls
- **Clarity**: Understand overtime calculations and payment status
- **Control**: Set availability to prevent overscheduling

### Manager/Admin Benefits
- **Efficiency**: Bulk approve time logs instead of one-by-one
- **Accuracy**: Auto-generate invoices from approved hours
- **Conflict Prevention**: System catches double-bookings automatically
- **Visibility**: See all pending requests and earnings across workforce

### Business Benefits
- **Reduced Admin Time**: Automation saves hours per week
- **Faster Payments**: Streamlined approval → invoice → payment flow
- **Better Planning**: Availability data enables smarter scheduling
- **Compliance**: Track overtime, breaks, and working time regulations
- **Audit Trail**: Full history of approvals, rejections, and changes

---

## 🔧 Technical Architecture

### Key Models
- `Worker` - Employee records with rates and metadata
- `TimeLog` - Time entries with approval workflow
- `Invoice` - Billing documents linked to time logs
- `Rota` - Scheduled shifts
- `ShiftSwapRequest` - Shift swap workflow
- `TimeOffRequest` - Leave request workflow
- `WorkerAvailability` - Recurring availability patterns

### API Layers
- **tRPC Routers**:
  - `workers` - Worker management and portal endpoints
  - `timeLogs` - Time tracking and approval
  - `invoices` - Billing and payment
  - `rotas` - Scheduling
  - `shiftSwaps` - Shift swap workflow
  - `availability` - Availability management

### Frontend Structure
- **Worker Portal** (`/portal/[workerId]/*`):
  - Dashboard - Clock in/out, overview
  - Earnings - Detailed earnings breakdown
  - Time Logs - Work history
  - Schedule - Upcoming shifts
  - Requests - Shift swaps & time off
  - Documents - Compliance docs
  - Profile - Personal information

- **Admin Dashboard** (`/dashboard/*`):
  - Workers - Employee management
  - Rotas - Scheduling interface
  - Time Logs - Approval & review
  - Invoices - Billing management
  - Requests - Approvals (to be implemented)

---

## 📋 Implementation Checklist

- [x] Earnings dashboard with monthly view
- [x] Payment status tracking
- [x] Overtime calculations
- [x] Shift swap request system
- [x] Time off request system
- [ ] Admin time log approval UI
- [ ] Bulk approval/rejection
- [ ] Auto-invoice generation from time logs
- [ ] Invoice preview and adjustment
- [ ] Availability calendar UI
- [ ] Recurring availability patterns
- [ ] Overtime detection automation
- [ ] Overtime notifications
- [ ] Rota conflict detection
- [ ] Availability-based conflict checking
- [ ] Admin requests management dashboard
- [ ] Request notification system

---

## 🚀 Deployment Notes

### Database Migrations
All necessary schema changes are already in place via existing migrations:
- Shift swap tables
- Time log approval fields
- Overtime tracking fields
- Availability tables

### Environment Variables
No new environment variables required for current features.

### Background Jobs
For future overtime detection:
- Add Inngest function to check time logs daily
- Configure overtime thresholds per organization

---

## 📖 User Documentation Needed

### For Workers
- How to view earnings and payment status
- How to request shift swaps
- How to request time off
- How to set availability
- Understanding overtime pay

### For Admins
- How to approve time logs
- How to generate invoices from time logs
- How to manage shift swap requests
- How to handle time off requests
- How to configure overtime rules

---

This implementation provides a solid foundation for comprehensive workforce management while maintaining the flexibility to extend with additional features as needed.
