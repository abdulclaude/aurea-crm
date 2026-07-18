"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, HistoryIcon } from "lucide-react";

import { IconCloudCheck as SaveIcon } from "central-icons/IconCloudCheck";

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
  useUpdateWorkflowName,
} from "@/features/workflows/hooks/use-workflows";
import { Input } from "@/components/ui/input";
import { useAtomValue } from "jotai";
import { editorAtom } from "../store/atoms";
import { useRouter } from "next/navigation";
import { WorkflowStateActions } from "./workflow-state-actions";
import { WorkflowBehaviorSheet } from "@/features/workflows/components/workflow-behavior-sheet";

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
      className="h-8 w-max gap-1.5 rounded-lg px-3.5 text-xs"
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
        className="h-8 w-auto min-w-[100px] rounded-lg border-black/10 bg-background px-2 text-xs text-primary hover:bg-primary-foreground/25 hover:text-primary dark:border-white/10"
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
    <Breadcrumb className="flex min-w-0 flex-1 items-center">
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

const EditorHeader = ({ workflowId }: { workflowId: string }) => {
  const router = useRouter();
  const { data: workflow } = useSuspenseWorkflow(workflowId);

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/workflows");
  };

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-black/10 bg-background px-3 text-primary dark:border-white/5 md:px-4">
      <div className="flex w-full items-center gap-3">
        <div className="flex shrink-0 items-center">
          <Button
            size="icon-sm"
            variant="ghost"
            className="rounded-lg text-primary hover:bg-primary-foreground hover:text-primary"
            onClick={handleGoBack}
            aria-label="Back to workflows"
            title="Back to workflows"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
        </div>
        <EditorBreadcrumbs workflowId={workflowId} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="hidden h-8 rounded-lg text-xs sm:inline-flex"
          >
            <Link
              href={`/executions?workflowId=${encodeURIComponent(workflow.id)}`}
            >
              <HistoryIcon className="size-3.5" />
              History
            </Link>
          </Button>
          {!workflow.isBundle ? (
            <WorkflowBehaviorSheet
              workflowId={workflow.id}
              behavior={workflow.behavior}
            />
          ) : null}
          <WorkflowStateActions workflowId={workflowId} />
          <EditorSaveButton workflowId={workflowId} />
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;
