"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Pencil, Copy, Trash, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTRPC } from "@/trpc/client";
import { PRESET_TEMPLATES } from "../lib/template-presets";

export function TemplatesManagement() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  // Fetch templates
  const { data: templatesData, isLoading } = useQuery({
    ...trpc.invoices.listTemplates.queryOptions({
      limit: 100,
    }),
  });

  const templates = templatesData?.items ?? [];

  // Delete mutation
  const { mutate: deleteTemplate, isPending: isDeleting } = useMutation(
    trpc.invoices.deleteTemplate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [["invoices", "listTemplates"]],
        });
        toast.success("Template deleted successfully");
        setDeleteTemplateId(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete template");
      },
    })
  );

  // Duplicate mutation
  const { mutate: duplicateTemplate, isPending: isDuplicating } = useMutation(
    trpc.invoices.duplicateTemplate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [["invoices", "listTemplates"]],
        });
        toast.success("Template duplicated successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to duplicate template");
      },
    })
  );

  const handleDelete = (templateId: string) => {
    deleteTemplate({ id: templateId });
  };

  const handleDuplicate = (templateId: string) => {
    duplicateTemplate({ id: templateId });
  };

  const presetTemplates = Object.entries(PRESET_TEMPLATES).map(([key, template]) => ({
    id: key,
    name: template.name,
    description: template.description,
    isSystem: true,
  }));

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {templates.length} custom template{templates.length !== 1 ? "s" : ""}
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preset Templates Section */}
      {!isLoading && (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-4">System Templates</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {presetTemplates.map((template) => (
                <Card key={template.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        System
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-[8.5/11] bg-muted rounded-lg flex items-center justify-center">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement duplicate from preset
                        toast.info("Feature coming soon");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Templates Section */}
          {templates.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Custom Templates</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                        {template.isDefault && (
                          <Badge variant="default" className="ml-2">
                            Default
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-[8.5/11] bg-muted rounded-lg flex items-center justify-center">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(template.id)}
                        disabled={isDuplicating}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {!template.isSystem && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTemplateId(template.id)}
                          disabled={isDeleting}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {templates.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No custom templates yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Create your first custom invoice template or use one of our system templates
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
              Invoices using this template will revert to the default template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateId && handleDelete(deleteTemplateId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
