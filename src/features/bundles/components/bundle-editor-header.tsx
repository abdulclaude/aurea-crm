"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

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
  useSuspenseBundle,
  useUpdateBundle,
  useUpdateBundleName,
} from "@/features/bundles/hooks/use-bundles";
import { Input } from "@/components/ui/input";
import { useAtomValue } from "jotai";
import { editorAtom } from "@/features/editor/store/atoms";
import { useRouter } from "next/navigation";

export const BundleEditorSaveButton = ({ bundleId }: { bundleId: string }) => {
  const editor = useAtomValue(editorAtom);
  const saveBundle = useUpdateBundle();

  const handleSave = () => {
    if (!editor) {
      return;
    }

    const nodes = editor.getNodes();
    const edges = editor.getEdges();

    saveBundle.mutate({
      id: bundleId,
      nodes,
      edges,
    });
  };

  return (
    <Button
      size="sm"
      onClick={handleSave}
      disabled={saveBundle.isPending}
      variant="gradient"
    >
      <SaveIcon className="size-3.5" />
      Save changes
    </Button>
  );
};

export const BundleNameInput = ({ bundleId }: { bundleId: string }) => {
  const { data: bundle } = useSuspenseBundle(bundleId);
  const updateBundle = useUpdateBundleName();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(bundle.name);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bundle.name) {
      setName(bundle.name);
    }
  }, [bundle.name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (name === bundle.name) {
      setIsEditing(false);
      return;
    }

    try {
      await updateBundle.mutateAsync({
        id: bundleId,
        name,
      });
    } catch {
      setName(bundle.name);
    } finally {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setName(bundle.name);
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
        className="h-7 w-auto min-w-[100px] px-2 text-xs text-primary bg-background hover:bg-primary-foreground hover:text-primary rounded-sm"
      />
    );
  }

  return (
    <BreadcrumbItem
      className="cursor-pointer transition-colors text-primary text-xs font-medium hover:text-primary "
      onClick={() => setIsEditing(true)}
    >
      {bundle.name}
    </BreadcrumbItem>
  );
};

export const BundleEditorBreadcrumbs = ({ bundleId }: { bundleId: string }) => {
  return (
    <Breadcrumb className="flex w-full items-center justify-center">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              prefetch
              href="/workflows"
              className="text-primary/50 text-xs"
            >
              Workflows
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator className="text-black/25 dark:text-white/25" />

        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link prefetch href="/bundles" className="text-primary/50 text-xs">
              Bundles
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator className="text-primary" />

        <BundleNameInput bundleId={bundleId} />
      </BreadcrumbList>
    </Breadcrumb>
  );
};

const BundleEditorHeader = ({ bundleId }: { bundleId: string }) => {
  const router = useRouter();

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/bundles");
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/5 dark:border-white/5 px-4 bg-background text-primary">
      <div className="flex flex-row items-center justify-between gap-x-4 w-full">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="text-primary/75 hover:text-primary text-xs border-none hover:bg-primary-foreground gap-1.5 items-center"
            onClick={handleGoBack}
          >
            <ChevronLeftIcon className="mt-0.5 size-2.5" />
            Go back
          </Button>
        </div>
        <BundleEditorBreadcrumbs bundleId={bundleId} />
        <div className="flex items-center gap-2">
          <BundleEditorSaveButton bundleId={bundleId} />
        </div>
      </div>
    </header>
  );
};

export default BundleEditorHeader;
