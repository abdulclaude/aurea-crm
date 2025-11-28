"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ChevronLeftIcon } from "lucide-react";

import { IconCloudCheck as SaveIcon } from "central-icons/IconCloudCheck";
import { IconSquareDotedBehindSquare as TemplateIcon } from "central-icons/IconSquareDotedBehindSquare";
import { IconArchive1 as ArchiveIcon } from "central-icons/IconArchive1";

import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import {
  useSuspenseWorkflow,
  useUpdateWorkflow,
  useCreateTemplateFromWorkflow,
  useUpdateWorkflowArchived,
  useUpdateWorkflowName,
} from "@/features/workflows/hooks/use-workflows";
import { Input } from "@/components/ui/input";
import { useAtomValue } from "jotai";
import { editorAtom } from "../store/atoms";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export const EditorSaveButton = ({ workflowId }: { workflowId: string }) => {
  const editor = useAtomValue(editorAtom);
  const saveWorkflow = useUpdateWorkflow();

  const handleSave = () => {
    if (!editor) {
      return;
    }

    const nodes = editor.getNodes();
    const edges = editor.getEdges();

    saveWorkflow.mutate({
      id: workflowId,
      nodes,
      edges,
    });
  };

  return (
    <Button
      size="sm"
      variant="gradient"
      onClick={handleSave}
      disabled={saveWorkflow.isPending}
      className=" gap-1.5 text-xs w-max"
    >
      <SaveIcon className="size-3.5" />
      Save changes
    </Button>
  );
};

export const EditorNameInput = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);
  const updateWorkflow = useUpdateWorkflowName();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(workflow.name);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (workflow.name) {
      setName(workflow.name);
    }
  }, [workflow.name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (name === workflow.name) {
      setIsEditing(false);
      return;
    }

    try {
      await updateWorkflow.mutateAsync({
        id: workflowId,
        name,
      });
    } catch {
      setName(workflow.name);
    } finally {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setName(workflow.name);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-7 w-auto min-w-[100px] px-2 text-xs text-primary bg-background border-none hover:bg-primary-foreground/25 hover:text-primary rounded-sm"
      />
    );
  }

  return (
    <BreadcrumbItem
      className="cursor-pointer transition-colors text-primary text-xs font-medium hover:text-primary tracking-tight"
      onClick={() => setIsEditing(true)}
    >
      {workflow.name}
    </BreadcrumbItem>
  );
};

export const EditorBreadcrumbs = ({ workflowId }: { workflowId: string }) => {
  return (
    <Breadcrumb className="flex w-full items-center justify-center">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              prefetch
              href="/workflows"
              className="text-primary/75 font-medium text-xs"
            >
              Workflows
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <EditorNameInput workflowId={workflowId} />
      </BreadcrumbList>
    </Breadcrumb>
  );
};

const WorkflowStateActions = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);
  const updateArchived = useUpdateWorkflowArchived();
  const createTemplate = useCreateTemplateFromWorkflow();

  const [hasNewTemplate, setHasNewTemplate] = useState(false);

  const isArchived = workflow.archived ?? false;
  const templated = (workflow.isTemplate ?? false) || hasNewTemplate;

  const handleArchive = () => {
    if (isArchived) {
      return;
    }
    updateArchived.mutate({ id: workflowId, archived: true });
  };

  const handleTemplate = () => {
    if (templated) {
      return;
    }
    createTemplate.mutate(
      { id: workflowId },
      {
        onSuccess: () => setHasNewTemplate(true),
      }
    );
  };

  return (
    <div className="flex items-center gap-2">
      {isArchived ? (
        <Badge className="bg-sky-800 rounded-sm h-7 text-sky-300 border border-white/5 px-3 cursor-default">
          Archived
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="gap-2 text-xs w-max h-8.5"
          disabled={updateArchived.isPending}
          onClick={handleArchive}
        >
          {/* <ArchiveIcon className="size-3.5" /> */}
          Archive
        </Button>
      )}
      {templated ? (
        <Badge className="bg-teal-700 rounded-sm h-7 text-teal-300 border border-white/5 px-3 cursor-default">
          Templated
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className=" gap-2 text-xs w-max h-8.5"
          disabled={createTemplate.isPending}
          onClick={handleTemplate}
        >
          {/* <TemplateIcon className="size-3.5" /> */}
          Template
        </Button>
      )}
    </div>
  );
};

const EditorHeader = ({ workflowId }: { workflowId: string }) => {
  const router = useRouter();

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/workflows");
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/10 dark:border-white/5 px-4 bg-background text-primary">
      <div className="flex flex-row items-center justify-between gap-x-4 w-full">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="text-primary hover:text-primary text-xs border-none hover:bg-primary-foreground gap-1.5 items-center"
            onClick={handleGoBack}
          >
            <ChevronLeftIcon className="mt-0.5 size-2.5" />
            Go back
          </Button>
        </div>
        <EditorBreadcrumbs workflowId={workflowId} />
        <div className="flex items-center gap-2">
          <WorkflowStateActions workflowId={workflowId} />
          <EditorSaveButton workflowId={workflowId} />
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;
