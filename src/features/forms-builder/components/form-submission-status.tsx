import { Badge } from "@/components/ui/badge";
import { FormSubmissionResolveMemberDialog } from "@/features/forms-builder/components/form-submission-resolve-member-dialog";

type Member = { name: string; email: string | null } | null;

export function FormSubmissionMemberStatus({
  formId,
  submissionId,
  member,
  status,
  error,
}: {
  formId: string;
  submissionId: string;
  member: Member;
  status: string;
  error: string | null;
}) {
  if (member) {
    return (
      <div className="min-w-40">
        <div className="font-medium">{member.name}</div>
        <div className="text-xs text-muted-foreground">
          {member.email ?? "No email"}
        </div>
      </div>
    );
  }
  if (status === "REVIEW" || status === "FAILED") {
    return (
      <div className="flex min-w-40 flex-col items-start gap-2">
        <Badge variant={status === "FAILED" ? "destructive" : "outline"}>
          {status === "FAILED" ? "Match failed" : "Needs a match"}
        </Badge>
        <FormSubmissionResolveMemberDialog
          formId={formId}
          submissionId={submissionId}
          resolutionError={error}
        />
      </div>
    );
  }
  if (status === "PENDING" || status === "RESOLVING") {
    return <Badge variant="secondary">Finding member</Badge>;
  }
  return <span className="text-muted-foreground">Not linked</span>;
}

export function FormSubmissionAutomationStatus({
  status,
  error,
}: {
  status: string | null;
  error: string | null;
}) {
  if (status === "WAITING_FOR_CLIENT") {
    return <Badge variant="outline">Waiting for member</Badge>;
  }
  if (status === "PENDING" || status === "DISPATCHING") {
    return <Badge variant="secondary">Queued</Badge>;
  }
  if (status === "DISPATCHED") return <Badge variant="default">Started</Badge>;
  if (status === "FAILED") {
    return (
      <Badge variant="destructive" title={error ?? undefined}>
        Failed
      </Badge>
    );
  }
  return <span className="text-muted-foreground">None</span>;
}
