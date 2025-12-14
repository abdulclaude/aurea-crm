"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Edit,
  Copy,
  Archive,
  Trash2,
  Eye,
  FileText,
  Search,
} from "lucide-react";
import { FormStatus } from "@prisma/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function FormsList() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: forms, isLoading } = useQuery({
    ...trpc.forms.list.queryOptions(),
  });

  const { mutate: createForm, isPending: isCreating } = useMutation(
    trpc.forms.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries();
        router.push(`/builder/forms/${data.id}/editor`);
      },
      onError: (error) => {
        toast.error("Failed to create form", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: deleteForm } = useMutation(
    trpc.forms.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Form deleted");
      },
      onError: (error) => {
        toast.error("Failed to delete form", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: archiveForm } = useMutation(
    trpc.forms.archive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Form archived");
      },
      onError: (error) => {
        toast.error("Failed to archive form", {
          description: error.message,
        });
      },
    })
  );

  const handleCreateForm = () => {
    createForm({
      name: "Untitled Form",
      isMultiStep: false,
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      deleteForm({ id });
    }
  };

  const filteredForms = forms?.filter((form) =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: FormStatus) => {
    switch (status) {
      case FormStatus.PUBLISHED:
        return (
          <Badge variant="default" className="bg-green-500">
            Published
          </Badge>
        );
      case FormStatus.DRAFT:
        return <Badge variant="secondary">Draft</Badge>;
      case FormStatus.ARCHIVED:
        return <Badge variant="outline">Archived</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleCreateForm} disabled={isCreating}>
          <Plus className="mr-2 h-4 w-4" />
          {isCreating ? "Creating..." : "Create Form"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading forms...</p>
        </div>
      ) : filteredForms && filteredForms.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredForms.map((form) => (
                <TableRow
                  key={form.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/builder/forms/${form.id}/editor`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {form.name}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(form.status)}</TableCell>
                  <TableCell>
                    {form._count.formStep} step{form._count.formStep !== 1 && "s"}
                  </TableCell>
                  <TableCell>{form._count.formSubmission}</TableCell>
                  <TableCell>
                    {form.Workflows ? (
                      <span className="text-sm text-muted-foreground">
                        {form.Workflows.name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(form.updatedAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/builder/forms/${form.id}/editor`);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/builder/forms/${form.id}/submissions`);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Submissions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveForm({ id: form.id });
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(form.id, form.name);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-md border border-dashed">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-semibold">No forms yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first form to get started
            </p>
          </div>
          <Button onClick={handleCreateForm} disabled={isCreating}>
            <Plus className="mr-2 h-4 w-4" />
            {isCreating ? "Creating..." : "Create Form"}
          </Button>
        </div>
      )}
    </div>
  );
}
