"use client";
import * as React from "react";

import { useRouter } from "next/navigation";

import { IconImagineAi } from "central-icons/IconImagineAi";

import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/react-flow/entity-components";

import {
  useCreateBundle,
  useRemoveBundle,
  useSuspenseBundles,
} from "../hooks/use-bundles";

import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { useBundlesParams } from "../hooks/use-bundles-params";
import { useEntitySearch } from "@/hooks/use-entity-search";

import type { Workflows } from "@prisma/client";
import { NodeType } from "@prisma/client";

type BundleNodePreview = {
  id?: string;
  type?: NodeType;
  createdAt?: string | Date | null;
  position?: Record<string, unknown> | null;
};

type BundleEntity = Omit<Workflows, "nodes"> & {
  nodes?: BundleNodePreview[];
};

const BundlesList = () => {
  const bundles = useSuspenseBundles();
  return (
    <EntityList
      items={bundles.data.items as BundleEntity[]}
      getKey={(bundle) => bundle.id}
      renderItem={(bundle) => <BundleItem data={bundle} />}
      emptyView={<BundlesEmpty />}
    />
  );
};

export default BundlesList;

export const BundlesHeader = ({ disabled }: { disabled?: boolean }) => {
  const createBundle = useCreateBundle();
  const { handleError, modal } = useUpgradeModal();

  const router = useRouter();

  const handleCreate = () => {
    createBundle.mutate(undefined, {
      onSuccess: (data) => {
        router.push(`/bundles/${data.id}`);
      },
      onError: (error) => {
        handleError(error);
      },
    });
  };

  return (
    <>
      {modal}
      <EntityHeader
        title="Bundle Workflows"
        description="Create and manage reusable workflow bundles"
        onNew={handleCreate}
        newButtonLabel="New bundle"
        disabled={disabled}
        isCreating={createBundle.isPending}
      />
    </>
  );
};

export const BundlesContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={
        <div className="flex flex-col gap-2">
          <BundlesHeader />
        </div>
      }
      search={
        <div className="flex gap-2 justify-end mt-4">
          <BundlesSearch className="w-96" />
        </div>
      }
      pagination={<BundlesPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const BundlesSearch = ({ className }: { className?: string }) => {
  const [params, setParams] = useBundlesParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      className={className}
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search bundles..."
    />
  );
};

const BundlesPagination = () => {
  const bundles = useSuspenseBundles();
  const [params, setParams] = useBundlesParams();
  return (
    <EntityPagination
      disabled={bundles.isFetching}
      totalPages={bundles.data.totalPages}
      page={bundles.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const BundlesLoading = () => {
  return <LoadingView message="Loading bundles..." />;
};

export const BundlesError = () => {
  return <ErrorView message="Error loading bundles..." />;
};

export const BundlesEmpty = () => {
  const createBundle = useCreateBundle();
  const { handleError, modal } = useUpgradeModal();

  const router = useRouter();

  const handleCreate = () => {
    createBundle.mutate(undefined, {
      onSuccess: (data) => {
        router.push(`/bundles/${data.id}`);
      },
      onError: (error) => {
        handleError(error);
      },
    });
  };

  return (
    <>
      {modal}
      <EmptyView
        title="No bundles"
        label="bundle"
        onNew={handleCreate}
        message="No bundle workflows have been found. Get started by creating a bundle."
      />
    </>
  );
};

// Bundle Item

export const BundleItem = ({ data }: { data: BundleEntity }) => {
  const removeBundle = useRemoveBundle();

  const handleRemove = () => {
    removeBundle.mutate({ id: data.id });
  };

  return (
    <EntityItem
      href={`/bundles/${data.id}`}
      title={<div className="flex items-center gap-2">{data.name}</div>}
      subtitle={
        <>
          Created {formatDistanceToNow(data.createdAt, { addSuffix: true })}{" "}
          &bull; Updated{" "}
          {formatDistanceToNow(data.updatedAt, {
            addSuffix: true,
          })}{" "}
        </>
      }
      image={
        <div className="size-8 rounded-sm bg-[#202E32] border border-white/10 flex items-center justify-center">
          <IconImagineAi className="size-4 text-white" />
        </div>
      }
      menuItems={
        <DropdownMenuContent
          align="end"
          className="bg-[#1A2326] text-white border-white/5"
        >
          <DropdownMenuItem className="bg-[#1A2326] hover:bg-[#202E32]! hover:text-white! transition duration-150 w-full">
            Configure inputs/outputs
          </DropdownMenuItem>
        </DropdownMenuContent>
      }
      onRemove={handleRemove}
      isRemoving={removeBundle.isPending}
    />
  );
};
