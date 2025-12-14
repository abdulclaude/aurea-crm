"use client";

import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FormSubmissionsProps {
  formId: string;
}

export function FormSubmissions({ formId }: FormSubmissionsProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const { data: form } = useQuery({
    ...trpc.forms.get.queryOptions({ id: formId }),
  });

  const { data: submissionsData, isLoading } = useQuery({
    ...trpc.forms.getSubmissions.queryOptions({ formId, limit: 50 }),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading submissions...</p>
      </div>
    );
  }

  const submissions = submissionsData?.submissions || [];

  return (
    <div className="flex h-full flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b bg-background p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/builder/forms/${formId}/editor`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editor
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{form?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {submissions.length} submission{submissions.length !== 1 && "s"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Submissions Table */}
      <div className="flex-1 overflow-y-auto p-6">
        {submissions.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-md border border-dashed">
            <div className="text-center">
              <h3 className="font-semibold">No submissions yet</h3>
              <p className="text-sm text-muted-foreground">
                Submissions will appear here once users fill out your form
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      {formatDistanceToNow(new Date(submission.submittedAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      {submission.contact ? (
                        <div>
                          <div className="font-medium">
                            {submission.contact.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {submission.contact.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          No contact
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {submission.utmSource || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {submission.ipAddress || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
