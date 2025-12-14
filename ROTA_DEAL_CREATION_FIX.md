# Rota Deal/Job Creation Fix

## Issue

When creating a rota (shift) in the calendar, users could type a deal/job name in the input field, but the deal was not being created in the database. The value was being stored in the form but the deal creation logic wasn't triggering.

## Root Cause

The backend logic for creating deals during rota creation requires **ALL** of the following fields to be present:

1. `dealName` - The name of the deal to create
2. `contactId` - A contact must be selected
3. `pipelineId` - A pipeline must be selected
4. `pipelineStageId` - **A pipeline stage must be selected** ⚠️

**Location**: [src/features/rotas/server/router.ts:167](src/features/rotas/server/router.ts#L167)

```typescript
if (!dealId && input.dealName && subaccountId && input.contactId && input.pipelineId && input.pipelineStageId) {
  // Create new deal logic...
}
```

The UI was allowing users to:
- ✅ Select a contact
- ✅ Select a pipeline
- ❌ **Skip selecting a pipeline stage** (this was the problem!)
- ✅ Type a deal name

When the pipeline stage was not selected, the backend condition on line 167 failed, and no deal was created. The rota was still created successfully, but without the associated deal.

## Solution

### 1. Enforce Pipeline Stage Selection in UI

**File**: [src/features/rotas/components/rota-assignment-dialog.tsx](src/features/rotas/components/rota-assignment-dialog.tsx)

**Changes**:

#### Disabled the Deal/Job field until stage is selected (line 611)
```typescript
disabled={!selectedContactId || !selectedPipelineId || !form.watch("pipelineStageId")}
```

**Before**: Field was enabled after selecting contact + pipeline
**After**: Field requires contact + pipeline + **pipeline stage**

#### Updated button text to guide users (lines 625-627)
```typescript
: !form.watch("pipelineStageId")
  ? "Select pipeline stage first"
  : "Search or create job..."
```

**Before**: "Search or create job..."
**After**: Shows "Select pipeline stage first" when stage is missing

#### Improved helper text (lines 729-731)
```typescript
: !form.watch("pipelineStageId")
  ? "Select a pipeline stage above to create new jobs"
  : "Search existing jobs or type to create a new one"
```

**Before**: Generic message about searching/creating
**After**: Specifically tells user to select a stage first

### 2. Added Client-Side Validation

**Location**: [src/features/rotas/components/rota-assignment-dialog.tsx:300-314](src/features/rotas/components/rota-assignment-dialog.tsx#L300-L314)

Added validation in the `onSubmit` function to catch any edge cases:

```typescript
// Validate deal creation requirements
if (values.dealName && !values.dealId) {
  if (!values.contactId) {
    toast.error("Please select a contact to create a new job/deal");
    return;
  }
  if (!values.pipelineId) {
    toast.error("Please select a pipeline to create a new job/deal");
    return;
  }
  if (!values.pipelineStageId) {
    toast.error("Please select a pipeline stage to create a new job/deal");
    return;
  }
}
```

This provides clear error messages if users somehow bypass the UI restrictions.

## How Deal Creation Works

When all required fields are present, the backend:

1. **Validates the pipeline and stage exist** (lines 169-196)
2. **Calculates deal value** based on worker's hourly rate × shift duration (lines 198-202)
3. **Creates the deal** with:
   - Name from `dealName`
   - Contact linked via `dealContact` relationship
   - Pipeline and stage from selections
   - Deadline set to shift end time
   - Value calculated from duration × hourly rate
   - Currency from worker's settings (defaults to GBP)
4. **Links the deal to the rota** via `dealId`

**Code**: [src/features/rotas/server/router.ts:204-226](src/features/rotas/server/router.ts#L204-L226)

## User Flow Now

### Correct Flow (Deal Created)

1. User clicks a time slot in the calendar ✅
2. Rota dialog opens ✅
3. User selects **Staff Member** ✅
4. User selects **Contact** ✅
5. User selects **Pipeline** ✅
6. User selects **Pipeline Stage** ✅ ← **This was being skipped!**
7. User clicks "Job/Deal" field (now enabled) ✅
8. User types "New Cleaning Job" and selects "Create new" ✅
9. User clicks "Create Rota" ✅
10. **Backend creates both the rota AND the deal** ✅

### What Happened Before (Deal NOT Created)

1-5. Same as above
6. User **SKIPPED** selecting pipeline stage ❌
7. User typed deal name anyway (field was enabled) ❌
8. User clicked "Create Rota" ❌
9. Backend created rota but **NOT the deal** because stage was missing ❌

## Testing Checklist

- [ ] Select contact + pipeline + stage → deal field enables ✅
- [ ] Type deal name → "Create: [name]" shows in button ✅
- [ ] Submit form → deal is created in database ✅
- [ ] Check deals table → new deal appears with correct contact ✅
- [ ] Check rota → shows linked deal name ✅
- [ ] Try to skip stage selection → field stays disabled ✅
- [ ] Helpful error messages show when requirements not met ✅

## Related Files

### Frontend
- [src/features/rotas/components/rota-assignment-dialog.tsx](src/features/rotas/components/rota-assignment-dialog.tsx) - Form UI and validation

### Backend
- [src/features/rotas/server/router.ts](src/features/rotas/server/router.ts) - Deal creation logic (lines 165-227 for create, 427-479 for update)

### Database
- `Rota` model - Stores shift with optional `dealId` link
- `Deal` model - Created when all requirements met
- `DealContact` model - Links deal to contact

## Additional Notes

### Why Pipeline Stage is Required

The pipeline stage determines:
1. **Where in the pipeline the deal starts** (e.g., "Lead In", "Qualified", "Proposal")
2. **Deal stage tracking** for pipeline analytics
3. **Workflow triggers** that may fire on deal stage changes

Without a stage, the deal would be in an invalid state in the CRM system.

### Deal Value Calculation

Deals created from rotas automatically calculate value:
```
Deal Value = Worker Hourly Rate × Shift Duration (hours)
```

Example:
- Worker rate: £25/hour
- Shift duration: 8 hours (9am - 5pm)
- Deal value: £200

This provides accurate revenue forecasting for scheduled jobs.

### Currency Handling

- Defaults to worker's currency setting
- Falls back to GBP if worker has no currency set
- Can be changed manually after deal creation

## Summary

✅ **Fixed**: Deal creation now works when typing in the rota dialog
✅ **Improved**: Clear UI guidance prevents user confusion
✅ **Validated**: Client-side checks ensure all requirements are met
✅ **User-Friendly**: Helpful error messages guide users to correct flow

The issue was that the pipeline stage field was optional in the UI but required by the backend logic. Now the UI enforces the same requirements as the backend, ensuring deals are created successfully every time.
