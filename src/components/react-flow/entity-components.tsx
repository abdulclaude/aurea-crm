import type { ReactNode } from "react";
import Link from "next/link";

import {
  AlertTriangleIcon,
  LinkIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PackageOpenIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "../ui/button";
import { Input } from "../ui/input";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";

import { Card, CardContent, CardDescription, CardTitle } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type EntityHeaderProps = {
  title: string;
  description?: string;
  newButtonLabel: string;
  disabled?: boolean;
  isCreating?: boolean;
} & (
  | { onNew: () => void; newButtonHref?: never }
  | { newButtonHref: string; onNew?: never }
  | { onNew?: never; newButtonHref?: never }
);

export const EntityHeader: React.FC<EntityHeaderProps> = ({
  title,
  description,
  onNew,
  newButtonHref,
  newButtonLabel,
  disabled,
  isCreating,
}) => {
  return (
    <div className="flex flex-row items-center justify-between gap-x-4">
      <div className="flex flex-col">
        <h1 className="text-lg md:text-xl font-semibold"> {title} </h1>

        {description && (
          <p className="text-xs md:text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {onNew && !newButtonHref && (
        <Button disabled={isCreating || disabled} size="sm" onClick={onNew}>
          <PlusIcon className="size-4" />
          {newButtonLabel}
        </Button>
      )}

      {newButtonHref && !onNew && (
        <Button size="sm" asChild>
          <Link href={newButtonHref} prefetch>
            <LinkIcon className="size-4" />
            {newButtonLabel}
          </Link>
        </Button>
      )}
    </div>
  );
};

type EntityContainerProps = {
  children: ReactNode;
  header?: ReactNode;
  search?: ReactNode;
  pagination?: ReactNode;
};

export const EntityContainer: React.FC<EntityContainerProps> = ({
  children,
  header,
  search,
  pagination,
}) => {
  return (
    <div className="p-4 md:px-10 md:py-6 h-full">
      <div className="mx-auto max-w-7xl w-full flex flex-col gap-y-8 h-full">
        {search}

        <div className="flex flex-col gap-y-4 h-full">
          {" "}
          {header}
          {children}
        </div>
        {pagination}
      </div>
    </div>
  );
};

interface EntitySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const EntitySearch: React.FC<EntitySearchProps> = ({
  value,
  onChange,
  placeholder = "Search",
}) => {
  return (
    <div className="relative">
      <SearchIcon className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
      <Input
        className="max-w-full bg-background shadow-none border-border pl-8 placeholder:text-muted-foreground/60"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

interface EntityPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export const EntityPagination: React.FC<EntityPaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  disabled,
}) => {
  return (
    <div className="flex items-center justify-between gap-x-2 w-full">
      <div className="flex-1 text-sm text-muted-foreground">
        Page {page} / {totalPages || 1}{" "}
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          disabled={page === 1 || disabled}
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>

        <Button
          disabled={page === totalPages || totalPages === 0 || disabled}
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

// UI components

interface StateViewProps {
  message?: string;
}

export const LoadingView: React.FC<StateViewProps> = ({ message }) => {
  return (
    <div className="flex justify-center items-center h-full flex-1 flex-col gap-y-3">
      <Loader2Icon className="size-6 animate-spin text-primary" />
      <div className="text-sm text-muted-foreground">
        {!!message && (
          <p className="text-sm text-primary font-semibold">{message}</p>
        )}
      </div>
    </div>
  );
};

export const ErrorView: React.FC<StateViewProps> = ({ message }) => {
  return (
    <div className="flex justify-center items-center h-full flex-1 flex-col gap-y-2">
      <AlertTriangleIcon className="size-6 text-primary" />
      <p className="text-sm text-muted-foreground font-semibold">
        {!!message && <p className="text-sm text-primary">{message}</p>}
      </p>
    </div>
  );
};

// empty component

interface EmptyViewProps extends StateViewProps {
  onNew?: () => void;
  label: string;
  title: string;
}

export const EmptyView: React.FC<EmptyViewProps> = ({
  onNew,
  message,
  label,
  title,
}) => {
  return (
    <Empty className="border border-dashed bg-white ">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-white">
          <PackageOpenIcon />
        </EmptyMedia>

        <EmptyTitle>{title}</EmptyTitle>

        {!!message && <EmptyDescription>{message}</EmptyDescription>}

        {!!onNew && (
          <EmptyContent className="mt-2">
            <Button onClick={onNew}>Add {label}</Button>
          </EmptyContent>
        )}
      </EmptyHeader>
    </Empty>
  );
};

interface EntityListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getKey?: (item: T, index: number) => string | number;
  emptyView?: React.ReactNode;
  className?: string;
}

export function EntityList<T>({
  items,
  renderItem,
  getKey,
  emptyView,
  className,
}: EntityListProps<T>) {
  if (items.length === 0 && emptyView) {
    return <div className="h-full w-full">{emptyView}</div>;
  }

  return (
    <div className={cn("flex flex-col gap-y-4", className)}>
      {items.map((item, index) => (
        <div key={getKey ? getKey(item, index) : index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

interface EntityItemProps {
  href: string;
  title: string;
  subtitle?: ReactNode;
  image?: ReactNode;
  actions?: ReactNode;
  onRemove?: () => void | Promise<void>;
  isRemoving?: boolean;
  className?: string;
}

export const EntityItem: React.FC<EntityItemProps> = ({
  href,
  title,
  subtitle,
  image,
  actions,
  onRemove,
  isRemoving,
  className,
}) => {
  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isRemoving) {
      return;
    }

    if (onRemove) {
      await onRemove();
    }
  };

  return (
    <Link href={href} prefetch>
      <Card
        className={cn(
          "p-4 shadow-none hover:shadow cursor-pointer",
          isRemoving && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <CardContent className="flex flex-row items-center justify-between p-0">
          <div className="flex items-center gap-3">
            {image}{" "}
            <div>
              <CardTitle className="text-base font-medium"> {title} </CardTitle>

              {!!subtitle && (
                <CardDescription className="text-xs">
                  {subtitle}
                </CardDescription>
              )}
            </div>
          </div>

          {(actions || onRemove) && (
            <div className="flex gap-x-4 items-center">
              {actions}
              {onRemove && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVerticalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuItem onClick={handleRemove}>
                      <TrashIcon className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
