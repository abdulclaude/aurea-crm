"use client";

import { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, addDays } from "date-fns";
import {
  FileText,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPES = [
  { value: "PASSPORT", label: "Passport", category: "Identity" },
  { value: "DRIVING_LICENCE", label: "Driving Licence", category: "Identity" },
  { value: "NATIONAL_ID", label: "National ID", category: "Identity" },
  { value: "VISA", label: "Visa", category: "Identity" },
  { value: "RIGHT_TO_WORK", label: "Right to Work", category: "Identity" },
  { value: "BIRTH_CERTIFICATE", label: "Birth Certificate", category: "Identity" },
  { value: "DBS_CERTIFICATE", label: "DBS Certificate", category: "Compliance" },
  { value: "DBS_UPDATE_SERVICE", label: "DBS Update Service", category: "Compliance" },
  { value: "PROOF_OF_ADDRESS", label: "Proof of Address", category: "Compliance" },
  { value: "PROOF_OF_NI", label: "Proof of NI Number", category: "Compliance" },
  { value: "QUALIFICATION", label: "Qualification", category: "Qualifications" },
  { value: "CERTIFICATION", label: "Certification", category: "Qualifications" },
  { value: "TRAINING_CERTIFICATE", label: "Training Certificate", category: "Qualifications" },
  { value: "FIRST_AID_CERTIFICATE", label: "First Aid Certificate", category: "Qualifications" },
  { value: "FOOD_HYGIENE", label: "Food Hygiene", category: "Qualifications" },
  { value: "MANUAL_HANDLING", label: "Manual Handling", category: "Qualifications" },
  { value: "SAFEGUARDING", label: "Safeguarding", category: "Qualifications" },
  { value: "CONTRACT", label: "Contract", category: "Employment" },
  { value: "SIGNED_POLICY", label: "Signed Policy", category: "Employment" },
  { value: "REFERENCE", label: "Reference", category: "Employment" },
  { value: "HEALTH_DECLARATION", label: "Health Declaration", category: "Health" },
  { value: "FIT_NOTE", label: "Fit Note", category: "Health" },
  { value: "VACCINATION_RECORD", label: "Vaccination Record", category: "Health" },
  { value: "OCCUPATIONAL_HEALTH", label: "Occupational Health", category: "Health" },
  { value: "PHOTO", label: "Photo", category: "Other" },
  { value: "OTHER", label: "Other", category: "Other" },
];

const STATUS_CONFIG = {
  PENDING_UPLOAD: {
    label: "Pending Upload",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: AlertTriangle,
  },
  PENDING_REVIEW: {
    label: "Pending Review",
    color: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    icon: AlertTriangle,
  },
};

function DocumentStatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", config.color)}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

interface WorkerDocumentsTableProps {
  workerId: string;
}

export function WorkerDocumentsTable({ workerId }: WorkerDocumentsTableProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [reviewingDoc, setReviewingDoc] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: documents, refetch } = useSuspenseQuery(
    trpc.workers.getDocuments.queryOptions({ workerId })
  );

  const deleteDocumentMutation = useMutation(
    trpc.workers.deleteDocument.mutationOptions({
      onSuccess: () => {
        toast.success("Document deleted");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete document");
      },
    })
  );

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

  const handleDelete = (documentId: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocumentMutation.mutate({ documentId, workerId });
    }
  };

  const handleApprove = () => {
    if (!reviewingDoc) return;
    approveDocumentMutation.mutate({
      workerId,
      documentId: reviewingDoc.id,
    });
  };

  const handleReject = () => {
    if (!reviewingDoc || !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectDocumentMutation.mutate({
      workerId,
      documentId: reviewingDoc.id,
      rejectionReason: rejectionReason.trim(),
    });
  };

  const filteredDocuments = documents?.filter((doc) => {
    if (filterStatus === "all") return true;
    return doc.status === filterStatus;
  });

  const stats = {
    total: documents?.length || 0,
    approved: documents?.filter((d) => d.status === "APPROVED").length || 0,
    pending: documents?.filter((d) => d.status === "PENDING_REVIEW").length || 0,
    expired:
      documents?.filter(
        (d) => d.status === "EXPIRED" || (d.expiryDate && isPast(new Date(d.expiryDate)))
      ).length || 0,
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-primary/60">Total Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-500">{stats.approved}</div>
            <p className="text-sm text-primary/60">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-sky-500">{stats.pending}</div>
            <p className="text-sm text-primary/60">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{stats.expired}</div>
            <p className="text-sm text-primary/60">Expired/Expiring</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Documents
              </CardTitle>
              <CardDescription>Manage worker compliance documents</CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="PENDING_UPLOAD">Pending Upload</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments?.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="size-12 mx-auto text-primary/20 mb-4" />
              <h3 className="text-lg font-medium text-primary">No documents found</h3>
              <p className="text-sm text-primary/60 mt-1">
                {filterStatus === "all"
                  ? "This worker hasn't uploaded any documents yet"
                  : "No documents match the selected filter"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments?.map((doc) => {
                  const isExpired = doc.expiryDate && isPast(new Date(doc.expiryDate));
                  const isExpiringSoon =
                    doc.expiryDate &&
                    !isExpired &&
                    isPast(addDays(new Date(doc.expiryDate), -30));

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{doc.name}</div>
                          {doc.documentNumber && (
                            <div className="text-xs text-primary/60">#{doc.documentNumber}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || doc.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={doc.status as keyof typeof STATUS_CONFIG} />
                        {doc.status === "REJECTED" && doc.rejectionReason && (
                          <p className="text-xs text-red-500 mt-1">{doc.rejectionReason}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.expiryDate ? (
                          <div>
                            {isExpired ? (
                              <Badge
                                variant="outline"
                                className="bg-red-500/10 text-red-500 border-red-500/20 gap-1"
                              >
                                <AlertTriangle className="size-3" />
                                Expired
                              </Badge>
                            ) : isExpiringSoon ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1"
                              >
                                <Clock className="size-3" />
                                Expiring Soon
                              </Badge>
                            ) : (
                              <span className="text-sm text-primary/60">
                                {format(new Date(doc.expiryDate), "dd MMM yyyy")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-primary/40">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-primary/60">
                          {format(new Date(doc.createdAt), "dd MMM yyyy")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {doc.fileUrl && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(doc.fileUrl!, "_blank")}
                              >
                                <Eye className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(doc.fileUrl!, "_blank")}
                              >
                                <Download className="size-4" />
                              </Button>
                            </>
                          )}
                          {doc.status === "PENDING_REVIEW" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                onClick={() => {
                                  setReviewingDoc(doc);
                                  setReviewAction("approve");
                                }}
                              >
                                <CheckCircle className="size-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                onClick={() => {
                                  setReviewingDoc(doc);
                                  setReviewAction("reject");
                                }}
                              >
                                <XCircle className="size-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog - Placeholder for future implementation */}
      {reviewingDoc && (
        <Dialog open={!!reviewingDoc} onOpenChange={() => setReviewingDoc(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewAction === "approve" ? "Approve Document" : "Reject Document"}
              </DialogTitle>
              <DialogDescription>
                {reviewAction === "approve"
                  ? "Confirm that you want to approve this document"
                  : "Provide a reason for rejecting this document"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm font-medium">{reviewingDoc.name}</p>
              <p className="text-sm text-primary/60">
                {DOCUMENT_TYPES.find((t) => t.value === reviewingDoc.type)?.label}
              </p>
              {reviewAction === "reject" && (
                <textarea
                  className="w-full mt-4 p-2 border rounded-md"
                  placeholder="Reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setReviewingDoc(null);
                  setRejectionReason("");
                }}
                disabled={approveDocumentMutation.isPending || rejectDocumentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant={reviewAction === "approve" ? "default" : "destructive"}
                onClick={reviewAction === "approve" ? handleApprove : handleReject}
                disabled={approveDocumentMutation.isPending || rejectDocumentMutation.isPending}
              >
                {(approveDocumentMutation.isPending || rejectDocumentMutation.isPending)
                  ? "Processing..."
                  : reviewAction === "approve"
                    ? "Approve"
                    : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
