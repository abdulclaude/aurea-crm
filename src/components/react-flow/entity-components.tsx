import type { ReactNode } from "react";
import Link from "next/link";

import {
  AlertTriangleIcon,
  LinkIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PackageOpenIcon,
  SearchIcon,
  Trash,
} from "lucide-react";

import { IconAddKeyframe } from "central-icons/IconAddKeyframe";
import { IconExplosion } from "central-icons/IconExplosion";
import { IconDotGrid1x3Vertical as ActionsIcon } from "central-icons/IconDotGrid1x3Vertical";

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
import { Separator } from "../ui/separator";

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
          <p className="text-xs md:text-xs text-primary/60">{description}</p>
        )}
      </div>

      {onNew && !newButtonHref && (
        <Button
          disabled={isCreating || disabled}
          size="sm"
          variant="outline"
          onClick={onNew}
          className="gap-2 text-xs w-max h-8.5 px-3.5"
        >
          <IconAddKeyframe className="size-3" />
          {newButtonLabel}
        </Button>
      )}

      {newButtonHref && !onNew && (
        <Button size="sm" variant="outline" asChild>
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
    <div className="h-full bg-background">
      <div className=" w-full flex flex-col gap-y-8 h-full">
        <div className="flex flex-col gap-y-4 h-full">
          {" "}
          <div className="px-6 py-6 pb-3">
            {header}
            {search}
          </div>
          <main className="px-6 ">{children}</main>
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
      <SearchIcon className="size-3.5 absolute z-10 left-3 top-1/2 -translate-y-1/2 text-primary/50" />
      <Input
        className="w-full  pl-8 "
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
    <div className="flex items-center justify-between gap-x-2 w-full max-w-7xl mx-auto">
      {totalPages > 1 && (
        <>
          <div className=" text-xs text-primary/50 bg-background w-max rounded-sm px-4 py-2">
            <span className="text-primary"> {page} </span> / {totalPages || 1}{" "}
          </div>

          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              disabled={page === 1 || disabled}
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="bg-background rounded-sm hover:bg-primary-foreground hover:text-black! transition duration-150 border-none text-xs"
            >
              Previous
            </Button>

            <Button
              disabled={page === totalPages || totalPages === 0 || disabled}
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              className="bg-background hover:bg-primary-foreground hover:text-black! transition duration-150 border-none text-xs"
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
      <div className="text-sm text-white">
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
      <IconExplosion className="size-6 text-primary" />
      <div className="text-sm text-muted-foreground font-semibold">
        {!!message && <p className="text-sm text-primary">{message}</p>}
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
    <Empty className="border border-dashed border-black/10 dark:border-white/5 bg-background rounded-sm">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="bg-background text-primary p-6 border border-black/10 dark:border-white/5"
        >
          <PackageOpenIcon className="stroke-1" />
        </EmptyMedia>

        <EmptyTitle>{title}</EmptyTitle>

        {!!message && (
          <EmptyDescription className="text-xs text-primary/50">
            {message}
          </EmptyDescription>
        )}

        {!!onNew && (
          <EmptyContent className="mt-2">
            <Button
              onClick={onNew}
              className="bg-background hover:bg-primary-foreground/25 hover:text-black! transition duration-150 text-xs px-5 border border-black/10 dark:border-white/5"
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
          "p-1.5 shadow-none cursor-pointer bg-background border-black/10 dark:border-white/5 text-primary rounded-sm hover:shadow-none hover:bg-primary-foreground/25",
          "transition duration-150",
          isRemoving && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <CardContent className="flex flex-row items-center justify-between  hover:bg-primary-foreground/25 rounded-sm p-3">
          <div className="flex items-center gap-3">
            {image}{" "}
            <div className="space-y-0">
              <CardTitle className="text-sm font-medium"> {title} </CardTitle>

              {!!subtitle && (
                <CardDescription className="text-xs text-primary/50 tracking-tight">
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
                      className="hover:bg-primary-foreground hover:text-black! transition duration-150 border border-black/10 dark:border-white/5 border-none"
                    >
                      <ActionsIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-background text-primary border-black/10 dark:border-white/5 transition duration-150"
                  >
                    {menuItems}

                    <DropdownMenuItem
                      className="text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
                      onClick={handleRemove}
                    >
                      <Trash className="mr-0.5 size-3.5" />
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
