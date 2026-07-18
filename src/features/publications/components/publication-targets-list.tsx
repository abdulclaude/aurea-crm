import { Globe2, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PublicationStatusBadge } from "@/features/publications/components/publication-status-badge";
import {
  formatPublicationDate,
  KIND_LABELS,
  type PublicationTargetSummary,
} from "@/features/publications/components/publication-ui-types";

type Props = {
  targets: PublicationTargetSummary[];
  onOpen: (id: string) => void;
};

function ManageButton({
  id,
  name,
  onOpen,
}: {
  id: string;
  name: string;
  onOpen: (id: string) => void;
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Manage ${name}`}
          onClick={() => onOpen(id)}
        >
          <Settings2 aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Manage target</TooltipContent>
    </Tooltip>
  );
}

export function PublicationTargetsList({
  targets,
  onOpen,
}: Props): React.JSX.Element {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[850px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-8 text-xs text-primary/50">
                Target
              </TableHead>
              <TableHead className="text-xs text-primary/50">Type</TableHead>
              <TableHead className="text-xs text-primary/50">Status</TableHead>
              <TableHead className="text-xs text-primary/50">Domain</TableHead>
              <TableHead className="text-xs text-primary/50">
                Published
              </TableHead>
              <TableHead className="w-16 pr-8">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.map((target) => (
              <TableRow key={target.id}>
                <TableCell className="px-8 py-3">
                  <p className="text-sm font-medium">{target.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    /p/{target.slug}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{KIND_LABELS[target.kind]}</Badge>
                </TableCell>
                <TableCell>
                  <PublicationStatusBadge status={target.status} />
                </TableCell>
                <TableCell>
                  <p className="max-w-48 truncate text-xs">
                    {target.domainHost ?? "Aurea domain"}
                  </p>
                  {target.domainHost ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {target.domainStatus} / SSL {target.sslStatus}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatPublicationDate(target.publishedAt)}
                </TableCell>
                <TableCell className="pr-8 text-right">
                  <ManageButton
                    id={target.id}
                    name={target.name}
                    onOpen={onOpen}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden">
        {targets.map((target) => (
          <div key={target.id} className="border-b p-4">
            <div className="flex items-start gap-3">
              <Globe2
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{target.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  /p/{target.slug}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{KIND_LABELS[target.kind]}</Badge>
                  <PublicationStatusBadge status={target.status} />
                </div>
              </div>
              <ManageButton id={target.id} name={target.name} onOpen={onOpen} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 pl-7 text-xs">
              <div>
                <p className="text-muted-foreground">Domain</p>
                <p className="mt-0.5 truncate">
                  {target.domainHost ?? "Aurea domain"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Published</p>
                <p className="mt-0.5">
                  {formatPublicationDate(target.publishedAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
