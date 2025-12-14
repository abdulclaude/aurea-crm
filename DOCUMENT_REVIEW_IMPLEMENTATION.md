# Document Review Implementation

## Overview

Completed implementation of document approval/rejection functionality for the worker management system. Admins can now review worker-uploaded documents and approve or reject them with reasons.

---

## Implementation Summary

### Backend Mutations (NEW)

**Location**: [src/features/workers/server/router.ts](src/features/workers/server/router.ts)

#### 1. Approve Document Mutation
**Endpoint**: `workers.approveDocument`

**Input**:
```typescript
{
  workerId: string;
  documentId: string;
}
```

**Functionality**:
- Verifies worker belongs to current organization/subaccount
- Updates document status to "APPROVED"
- Records `reviewedAt` timestamp
- Records `reviewedBy` user ID
- Logs activity analytics with document type and action
- Returns updated document

**Security**:
- Protected procedure (requires auth)
- Organization context required
- Validates worker ownership

#### 2. Reject Document Mutation
**Endpoint**: `workers.rejectDocument`

**Input**:
```typescript
{
  workerId: string;
  documentId: string;
  rejectionReason: string; // Required
}
```

**Functionality**:
- Verifies worker belongs to current organization/subaccount
- Updates document status to "REJECTED"
- Stores rejection reason
- Records `reviewedAt` timestamp
- Records `reviewedBy` user ID
- Logs activity analytics with document type, action, and reason
- Returns updated document

**Security**:
- Protected procedure (requires auth)
- Organization context required
- Validates worker ownership
- Requires non-empty rejection reason

---

### Frontend Integration (UPDATED)

**Location**: [src/features/workers/components/worker-documents-table.tsx](src/features/workers/components/worker-documents-table.tsx)

#### New Mutations Added

```typescript
const approveDocumentMutation = useMutation(
  trpc.workers.approveDocument.mutationOptions({
    onSuccess: () => {
      toast.success("Document approved");
      refetch();
      setReviewingDoc(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve document");
    },
  })
);

const rejectDocumentMutation = useMutation(
  trpc.workers.rejectDocument.mutationOptions({
    onSuccess: () => {
      toast.success("Document rejected");
      refetch();
      setReviewingDoc(null);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject document");
    },
  })
);
```

#### UI Features

**Approve Flow**:
1. Admin clicks "Approve" button on PENDING_REVIEW document
2. Confirmation dialog opens
3. Shows document name and type
4. "Approve" button triggers mutation
5. Success toast displayed
6. Document status updates to "APPROVED" in real-time
7. Dialog closes automatically

**Reject Flow**:
1. Admin clicks "Reject" button on PENDING_REVIEW document
2. Rejection dialog opens
3. Shows document name and type
4. Admin must enter rejection reason (required)
5. "Reject" button triggers mutation
6. Success toast displayed
7. Document status updates to "REJECTED" in real-time
8. Rejection reason visible in table
9. Dialog closes automatically

**Loading States**:
- Buttons show "Processing..." during mutation
- All buttons disabled during processing
- Prevents duplicate submissions

**Validation**:
- Rejection reason must be non-empty
- Toast error if reason missing

---

## User Flow

### Admin Reviews Document

1. Navigate to `/workers/[workerId]`
2. Click "Documents" tab
3. See document stats showing pending count
4. Filter by "Pending Review" (optional)
5. Document shows "Approve" and "Reject" buttons
6. Click "View" or "Download" to review document
7. Click "Approve":
   - Confirmation dialog opens
   - Click "Approve" to confirm
   - Status changes to "APPROVED"
   - Green badge displayed
8. OR Click "Reject":
   - Rejection dialog opens
   - Enter reason (e.g., "Photo is blurry, please re-upload")
   - Click "Reject" to confirm
   - Status changes to "REJECTED"
   - Red badge displayed with reason

### Worker Sees Updated Status

1. Worker logs into portal
2. Goes to Documents page
3. Document status updated to:
   - "Approved" with green badge, OR
   - "Rejected" with red badge and reason shown
4. If rejected, worker can:
   - View rejection reason
   - Upload replacement document
   - Resubmit for review

---

## Database Updates

**Fields Updated in WorkerDocument**:
```prisma
model WorkerDocument {
  status           DocumentStatus // APPROVED or REJECTED
  rejectionReason  String?        // Reason text (only for rejected)
  reviewedAt       DateTime?      // When reviewed
  reviewedBy       String?        // User ID who reviewed
  updatedAt        DateTime       // Updated timestamp
}
```

---

## Analytics Tracking

Both mutations log detailed analytics:

**Approve Event**:
```typescript
{
  action: "UPDATED",
  entityType: "worker_document",
  entityId: documentId,
  entityName: documentName,
  metadata: {
    workerId,
    workerName,
    documentType,
    action: "approved"
  },
  posthogProperties: {
    document_type: type,
    action: "approved"
  }
}
```

**Reject Event**:
```typescript
{
  action: "UPDATED",
  entityType: "worker_document",
  entityId: documentId,
  entityName: documentName,
  metadata: {
    workerId,
    workerName,
    documentType,
    action: "rejected",
    rejectionReason
  },
  posthogProperties: {
    document_type: type,
    action: "rejected"
  }
}
```

---

## Complete Document Lifecycle

```
PENDING_UPLOAD (Worker creates entry)
     ↓
[Worker uploads file]
     ↓
PENDING_REVIEW (Waiting for admin)
     ↓
[Admin reviews]
     ↓
APPROVED or REJECTED
     ↓
[If rejected, worker can re-upload]
     ↓
PENDING_REVIEW (cycle repeats)
     ↓
APPROVED → [Check expiry date]
     ↓
EXPIRED (if past expiry date)
```

---

## Error Handling

**Backend Errors**:
- Worker not found (404)
- Document not found (404)
- Not in organization context (403)
- Worker not in user's organization (403)

**Frontend Errors**:
- Network failures → toast error
- Permission errors → toast error
- Missing rejection reason → toast error
- All errors prevent status change

---

## Testing Checklist

### Backend
- [x] Approve mutation updates status to APPROVED
- [x] Reject mutation updates status to REJECTED
- [x] Rejection reason stored correctly
- [x] reviewedAt timestamp set
- [x] reviewedBy user ID recorded
- [x] Analytics logged correctly
- [x] Permission checks enforce organization boundaries
- [x] Error handling for missing worker/document

### Frontend
- [x] Approve button visible on PENDING_REVIEW docs
- [x] Reject button visible on PENDING_REVIEW docs
- [x] Approve dialog shows correct document info
- [x] Reject dialog shows correct document info
- [x] Rejection reason textarea visible in reject dialog
- [x] Rejection requires non-empty reason
- [x] Loading states prevent duplicate submissions
- [x] Success toasts appear
- [x] Document list refreshes after mutation
- [x] Dialog closes after success
- [x] Rejection reason displayed in table
- [x] Error toasts appear on failure

---

## Files Modified

1. **src/features/workers/server/router.ts**
   - Added `approveDocument` mutation (lines 904-982)
   - Added `rejectDocument` mutation (lines 984-1065)
   - Imports already existed (ActivityAction, logAnalytics)

2. **src/features/workers/components/worker-documents-table.tsx**
   - Added `approveDocumentMutation` (lines 144-155)
   - Added `rejectDocumentMutation` (lines 157-169)
   - Added `handleApprove()` function (lines 177-183)
   - Added `handleReject()` function (lines 185-195)
   - Updated dialog footer with real mutations (lines 451-473)
   - Added loading states and disabled states

3. **ADMIN_WORKER_MANAGEMENT_IMPLEMENTATION.md**
   - Updated API endpoints section
   - Updated testing checklist
   - Updated status to 100% complete
   - Added recent updates section

---

## Performance Considerations

- Mutations use optimistic UI (refetch after success)
- Single document operations (no batch processing)
- Analytics logged asynchronously
- No N+1 queries

---

## Security Considerations

✅ **Organization Isolation**:
- Workers verified to belong to current org/subaccount
- Documents verified to belong to worker
- Reviewers authenticated via protectedProcedure

✅ **Audit Trail**:
- All approvals/rejections logged with user ID
- Timestamps recorded
- Rejection reasons stored
- Activity analytics captured

✅ **Input Validation**:
- Rejection reason required and trimmed
- Document IDs validated
- Worker IDs validated

---

## Future Enhancements

### High Priority
1. **Email Notifications** (templates already exist in `worker-emails.ts`):
   - Send email to worker when document approved
   - Send email to worker when document rejected (include reason)
   - Use existing `sendDocumentExpiryReminder` pattern

### Medium Priority
2. **Bulk Actions**:
   - Approve multiple documents at once
   - Reject multiple documents with same reason
   - Select checkboxes in table

3. **Re-review Workflow**:
   - Allow admins to request changes without rejecting
   - Status: NEEDS_CHANGES
   - Worker can update and resubmit

### Low Priority
4. **Review History**:
   - Track all review attempts
   - Show previous rejection reasons
   - Version history of documents

---

## Summary

✅ **Backend**: Fully implemented with security and analytics
✅ **Frontend**: Integrated with loading states and error handling
✅ **Testing**: All critical paths validated
✅ **Documentation**: Complete with user flows
✅ **Status**: Production-ready

**Impact**: Admins can now fully manage worker compliance documents, from upload through approval/rejection, completing the worker management workflow.
