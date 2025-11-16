import type { ReactNode } from "react";
import Link from "next/link";

import {
  AlertTriangleIcon,
  LinkIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PackageOpenIcon,
  SearchIcon,
} from "lucide-react";

import { IconAddKeyframe } from "central-icons/IconAddKeyframe";
import { IconExplosion } from "central-icons/IconExplosion";

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
  newButtonLabel?: string;
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
    <div className="flex flex-row items-end justify-between gap-x-4">
      <div className="flex flex-col">
        <h1 className="text-base md:text-lg font-semibold"> {title} </h1>

        {description && (
          <p className="text-xs md:text-xs text-white/50 tracking-wide">
            {description}
          </p>
        )}
      </div>

      {onNew && !newButtonHref && (
        <Button
          disabled={isCreating || disabled}
          size="sm"
          onClick={onNew}
          className="bg-[#202E32] hover:bg-[#202E32] hover:brightness-110  hover:text-white! transition duration-150 gap-2 text-xs"
        >
          <IconAddKeyframe className="size-3" />
          {newButtonLabel}
        </Button>
      )}

      {newButtonHref && !onNew && (
        <Button
          size="sm"
          className="bg-[#202E32] hover:bg-[#202E32] hover:brightness-110  hover:text-white! transition duration-150 text-xs"
          asChild
        >
          <Link href={newButtonHref} prefetch className="gap-2">
            <LinkIcon className="size-2.5" />
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
    <div className="p-4 md:px-10 md:py-6 h-full bg-[#1A2326] ">
      <div className="mx-auto max-w-7xl w-full flex flex-col gap-y-8 h-full">
        <div className="flex flex-col gap-y-4 h-full">
          {" "}
          {header}
          {search}
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
  className?: string;
}

export const EntitySearch: React.FC<EntitySearchProps> = ({
  value,
  onChange,
  placeholder = "Search",
  className,
}) => {
  return (
    <div className={cn("relative w-full h-max", className)}>
      <SearchIcon className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
      <Input
        className="w-full bg-[#1A2326] shadow-none border border-white/5 pl-8 placeholder:text-white/50 rounded-sm"
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
      {totalPages !== 1 && (
        <>
          <div className=" text-sm text-muted-foreground bg-[#202E32] w-max rounded-xl px-4 py-2">
            <span className="text-white"> {page} </span> / {totalPages || 1}{" "}
          </div>

          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              disabled={page === 1 || disabled}
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="bg-[#202E32]  hover:bg-[#202E32]! hover:text-white! transition duration-150 border-none"
            >
              Previous
            </Button>

            <Button
              disabled={page === totalPages || totalPages === 0 || disabled}
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              className="bg-[#202E32] hover:bg-[#202E32]! hover:brightness-110 hover:text-white! transition duration-150 border-none"
            >
              Next
            </Button>
          </div>
        </>
      )}
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
    <div className="flex justify-center items-center h-full flex-1 flex-col gap-y-1.5">
      <IconExplosion className="size-6 text-white" />
      <div className="text-sm text-muted-foreground font-semibold">
        {!!message && <p className="text-sm text-white">{message}</p>}
      </div>
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
    <Empty className="border border-dashed border-white/5 bg-[#202E32] ">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="bg-[#202E32] brightness-120 text-white p-6 "
        >
          <PackageOpenIcon className="stroke-1" />
        </EmptyMedia>

        <EmptyTitle>{title}</EmptyTitle>

        {!!message && (
          <EmptyDescription className="text-xs text-white/50">
            {message}
          </EmptyDescription>
        )}

        {!!onNew && (
          <EmptyContent className="mt-2">
            <Button
              onClick={onNew}
              className="bg-[#202E32] brightness-120 hover:bg-[#202E32] hover:brightness-130  hover:text-white! transition duration-150 text-xs px-5"
            >
              Add {label}
            </Button>
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
  title: ReactNode;
  subtitle?: ReactNode;
  image?: ReactNode;
  actions?: ReactNode;
  menuItems?: ReactNode;
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
  menuItems,
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
          "p-1.5 shadow-none hover:shadow cursor-pointer bg-[#1A2326] border-white/5 text-white rounded-sm",
          "transition duration-150",
          isRemoving && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <CardContent className="flex flex-row items-center justify-between  hover:bg-[#1A2326] rounded-sm hover:brightness-110 p-3">
          <div className="flex items-center gap-3">
            {image}{" "}
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium"> {title} </CardTitle>

              {!!subtitle && (
                <CardDescription className="text-xs text-white/50">
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
                      className="hover:bg-[#1A2326]! hover:brightness-90 hover:text-white transition duration-150"
                    >
                      <MoreVerticalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#1A2326] text-white border-white/5 transition duration-150"
                  >
                    {menuItems}
                    <DropdownMenuItem
                      onClick={handleRemove}
                      className="bg-[#1A2326] hover:bg-[#202E32]! hover:text-white! transition duration-150 w-full"
                    >
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
