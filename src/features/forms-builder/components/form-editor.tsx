"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Save,
  Upload,
  Settings,
  Eye,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { FormFieldType, FormStatus } from "@prisma/client";

interface FormEditorProps {
  formId: string;
}

export function FormEditor({ formId }: FormEditorProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [formName, setFormName] = useState("");

  const { data: form, isLoading } = useQuery({
    ...trpc.forms.get.queryOptions({ id: formId }),
  });

  const { mutate: updateForm } = useMutation(
    trpc.forms.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Form updated");
      },
      onError: (error) => {
        toast.error("Failed to update form", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: publishForm } = useMutation(
    trpc.forms.publish.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Form published");
      },
      onError: (error) => {
        toast.error("Failed to publish form", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: addStep } = useMutation(
    trpc.forms.addStep.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Step added");
      },
      onError: (error) => {
        toast.error("Failed to add step", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: addField } = useMutation(
    trpc.forms.addField.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Field added");
      },
      onError: (error) => {
        toast.error("Failed to add field", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: deleteField } = useMutation(
    trpc.forms.deleteField.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Field deleted");
      },
      onError: (error) => {
        toast.error("Failed to delete field", {
          description: error.message,
        });
      },
    })
  );

  const handleSave = () => {
    if (formName !== form?.name) {
      updateForm({ id: formId, name: formName });
    }
  };

  const handlePublish = () => {
    publishForm({ id: formId });
  };

  const handleAddStep = () => {
    const stepCount = (form as any)?.formStep?.length || 0;
    addStep({
      formId,
      name: `Step ${stepCount + 1}`,
    });
  };

  const handleAddField = (stepId: string, type: FormFieldType) => {
    addField({
      stepId,
      type,
      label: `New ${type.toLowerCase().replace("_", " ")} field`,
      required: false,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading form...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Form not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b bg-background p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/builder/forms")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <Input
              value={formName || form.name}
              onChange={(e) => setFormName(e.target.value)}
              onBlur={handleSave}
              className="border-none text-xl font-semibold focus-visible:ring-0"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={form.status === FormStatus.PUBLISHED ? "default" : "secondary"}>
                {form.status}
              </Badge>
              <span>•</span>
              <span>{(form as any)._count?.formSubmission || 0} submissions</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button size="sm" onClick={handlePublish}>
            <Upload className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Steps and Fields Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Form Builder</h2>
              {form.isMultiStep && (
                <Button variant="outline" size="sm" onClick={handleAddStep}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Step
                </Button>
              )}
            </div>

            {(form as any).formStep?.map((step: any, stepIndex: number) => (
              <div key={step.id} className="rounded-lg border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    {form.isMultiStep ? step.name : "Form Fields"}
                  </h3>
                  <Select
                    onValueChange={(value) =>
                      handleAddField(step.id, value as FormFieldType)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Add field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FormFieldType.SHORT_TEXT}>
                        Short Text
                      </SelectItem>
                      <SelectItem value={FormFieldType.LONG_TEXT}>
                        Long Text
                      </SelectItem>
                      <SelectItem value={FormFieldType.EMAIL}>Email</SelectItem>
                      <SelectItem value={FormFieldType.PHONE}>Phone</SelectItem>
                      <SelectItem value={FormFieldType.NUMBER}>
                        Number
                      </SelectItem>
                      <SelectItem value={FormFieldType.SELECT}>
                        Dropdown
                      </SelectItem>
                      <SelectItem value={FormFieldType.RADIO}>
                        Radio Buttons
                      </SelectItem>
                      <SelectItem value={FormFieldType.CHECKBOX}>
                        Checkbox
                      </SelectItem>
                      <SelectItem value={FormFieldType.DATE}>Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {step.formField?.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">
                      No fields yet. Add a field to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {step.formField?.map((field: any) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between rounded-md border p-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Label className="font-medium">{field.label}</Label>
                            {field.required && (
                              <Badge variant="outline" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {field.type.replace("_", " ").toLowerCase()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteField({ id: field.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Settings Panel */}
        <div className="w-80 overflow-y-auto border-l bg-muted/30 p-6">
          <Tabs defaultValue="settings">
            <TabsList className="w-full">
              <TabsTrigger value="settings" className="flex-1">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="mt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Form Type</Label>
                  <Select
                    value={form.isMultiStep ? "multi" : "single"}
                    onValueChange={(value) =>
                      updateForm({
                        id: formId,
                        isMultiStep: value === "multi",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Step</SelectItem>
                      <SelectItem value="multi">Multi-Step</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Success Message</Label>
                  <Input
                    value={form.successMessage}
                    onChange={(e) =>
                      updateForm({
                        id: formId,
                        successMessage: e.target.value,
                      })
                    }
                    placeholder="Thank you for your submission!"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Redirect URL (optional)</Label>
                  <Input
                    value={form.redirectUrl || ""}
                    onChange={(e) =>
                      updateForm({
                        id: formId,
                        redirectUrl: e.target.value || undefined,
                      })
                    }
                    placeholder="https://example.com/thank-you"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
