"use client";

import { use, useState } from "react";
import { format, formatDistanceToNow, isPast, addDays } from "date-fns";
import {
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  Trash2,
  Plus,
  Filter,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { DocumentUploadButton } from "./document-upload-button";

const DOCUMENT_TYPES = [
  // Identity & Right to Work
  { value: "PASSPORT", label: "Passport", category: "Identity" },
  { value: "DRIVING_LICENCE", label: "Driving Licence", category: "Identity" },
  { value: "NATIONAL_ID", label: "National ID", category: "Identity" },
  { value: "VISA", label: "Visa", category: "Identity" },
  { value: "RIGHT_TO_WORK", label: "Right to Work", category: "Identity" },
  { value: "BIRTH_CERTIFICATE", label: "Birth Certificate", category: "Identity" },

  // Compliance
  { value: "DBS_CERTIFICATE", label: "DBS Certificate", category: "Compliance" },
  { value: "DBS_UPDATE_SERVICE", label: "DBS Update Service", category: "Compliance" },
  { value: "PROOF_OF_ADDRESS", label: "Proof of Address", category: "Compliance" },
  { value: "PROOF_OF_NI", label: "Proof of NI Number", category: "Compliance" },

  // Qualifications
  { value: "QUALIFICATION", label: "Qualification", category: "Qualifications" },
  { value: "CERTIFICATION", label: "Certification", category: "Qualifications" },
  { value: "TRAINING_CERTIFICATE", label: "Training Certificate", category: "Qualifications" },
  { value: "FIRST_AID_CERTIFICATE", label: "First Aid Certificate", category: "Qualifications" },
  { value: "FOOD_HYGIENE", label: "Food Hygiene", category: "Qualifications" },
  { value: "MANUAL_HANDLING", label: "Manual Handling", category: "Qualifications" },
  { value: "SAFEGUARDING", label: "Safeguarding", category: "Qualifications" },

  // Employment
  { value: "CONTRACT", label: "Contract", category: "Employment" },
  { value: "SIGNED_POLICY", label: "Signed Policy", category: "Employment" },
  { value: "REFERENCE", label: "Reference", category: "Employment" },

  // Health
  { value: "HEALTH_DECLARATION", label: "Health Declaration", category: "Health" },
  { value: "FIT_NOTE", label: "Fit Note", category: "Health" },
  { value: "VACCINATION_RECORD", label: "Vaccination Record", category: "Health" },
  { value: "OCCUPATIONAL_HEALTH", label: "Occupational Health", category: "Health" },

  // Other
  { value: "PHOTO", label: "Photo", category: "Other" },
  { value: "OTHER", label: "Other", category: "Other" },
];

const STATUS_CONFIG = {
  PENDING_UPLOAD: {
    label: "Pending Upload",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: Upload,
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

function ExpiryBadge({ expiryDate }: { expiryDate: Date | null }) {
  if (!expiryDate) return null;

  const isExpired = isPast(new Date(expiryDate));
  const isExpiringSoon = !isExpired && isPast(addDays(new Date(expiryDate), -30));

  if (isExpired) {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
        <AlertTriangle className="size-3" />
        Expired
      </Badge>
    );
  }

  if (isExpiringSoon) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
        <Clock className="size-3" />
        Expires {formatDistanceToNow(new Date(expiryDate), { addSuffix: true })}
      </Badge>
    );
  }

  return (
    <span className="text-sm text-primary/60">
      Expires {format(new Date(expiryDate), "dd MMM yyyy")}
    </span>
  );
}

export default function WorkerDocumentsPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = use(params);
  const trpc = useTRPC();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [documentName, setDocumentName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: documents, refetch } = useSuspenseQuery(
    trpc.workers.getDocuments.queryOptions({ workerId })
  );

  const uploadDocumentMutation = useMutation(
    trpc.workers.createDocument.mutationOptions({
      onSuccess: () => {
        toast.success("Document created successfully. Please upload the file.");
        setUploadDialogOpen(false);
        resetForm();
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create document");
      },
    })
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

  const resetForm = () => {
    setSelectedType("");
    setDocumentName("");
    setDocumentNumber("");
    setExpiryDate("");
  };

  const handleCreateDocument = () => {
    if (!selectedType) {
      toast.error("Please select a document type");
      return;
    }

    const docType = DOCUMENT_TYPES.find((t) => t.value === selectedType);

    uploadDocumentMutation.mutate({
      workerId,
      type: selectedType as any,
      name: documentName || docType?.label || "Document",
      documentNumber: documentNumber || undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
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
    expired: documents?.filter((d) => d.status === "EXPIRED" || (d.expiryDate && isPast(new Date(d.expiryDate)))).length || 0,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Documents</h1>
          <p className="text-sm text-primary/60">
            Manage your certifications, compliance documents, and qualifications
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Document</DialogTitle>
              <DialogDescription>
                Add a new document to your profile. You can upload the file after creating the entry.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(
                      DOCUMENT_TYPES.reduce((acc, type) => {
                        if (!acc[type.category]) acc[type.category] = [];
                        acc[type.category].push(type);
                        return acc;
                      }, {} as Record<string, typeof DOCUMENT_TYPES>)
                    ).map(([category, types]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-primary/60">
                          {category}
                        </div>
                        {types.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Document Name (Optional)</Label>
                <Input
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="e.g., First Aid Level 3"
                />
              </div>

              <div className="space-y-2">
                <Label>Document/Certificate Number (Optional)</Label>
                <Input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="e.g., DBS123456789"
                />
              </div>

              <div className="space-y-2">
                <Label>Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateDocument}
                disabled={uploadDocumentMutation.isPending}
              >
                {uploadDocumentMutation.isPending ? "Creating..." : "Create Document"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <CardDescription>
                All your uploaded documents and certifications
              </CardDescription>
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
                  ? "Add your first document to get started"
                  : "No documents match the selected filter"}
              </p>
              {filterStatus === "all" && (
                <Button
                  className="mt-4"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Plus className="size-4 mr-2" />
                  Add Document
                </Button>
              )}
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
                {filteredDocuments?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        {doc.documentNumber && (
                          <div className="text-xs text-primary/60">
                            #{doc.documentNumber}
                          </div>
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
                    </TableCell>
                    <TableCell>
                      <ExpiryBadge expiryDate={doc.expiryDate} />
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
                        {!doc.fileUrl && doc.status === "PENDING_UPLOAD" && (
                          <DocumentUploadButton
                            workerId={workerId}
                            documentId={doc.id}
                            onSuccess={refetch}
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this document?")) {
                              deleteDocumentMutation.mutate({ documentId: doc.id, workerId });
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Required Documents Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Required Documents Checklist</CardTitle>
          <CardDescription>
            Ensure you have uploaded all required documents for compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { type: "RIGHT_TO_WORK", label: "Right to Work", required: true },
              { type: "DBS_CERTIFICATE", label: "DBS Certificate", required: true },
              { type: "PROOF_OF_ADDRESS", label: "Proof of Address", required: true },
              { type: "PROOF_OF_NI", label: "Proof of NI Number", required: false },
            ].map((item) => {
              const doc = documents?.find((d) => d.type === item.type && d.status === "APPROVED");
              const pending = documents?.find((d) => d.type === item.type && d.status !== "APPROVED");

              return (
                <div
                  key={item.type}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    doc ? "border-emerald-500/20 bg-emerald-500/5" : "border-primary/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {doc ? (
                      <CheckCircle className="size-5 text-emerald-500" />
                    ) : pending ? (
                      <Clock className="size-5 text-amber-500" />
                    ) : (
                      <XCircle className="size-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-primary/60">
                        {item.required ? "Required" : "Optional"}
                      </div>
                    </div>
                  </div>
                  {!doc && !pending && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedType(item.type);
                        setUploadDialogOpen(true);
                      }}
                    >
                      Add
                    </Button>
                  )}
                  {pending && !doc && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500">
                      {STATUS_CONFIG[pending.status as keyof typeof STATUS_CONFIG]?.label}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
