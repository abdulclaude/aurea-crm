"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  FileArchive,
  FileText,
  ListChecks,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { classifyMindbodyFileName } from "@/features/studio/import/lib/mindbody-csv";
import {
  uploadKey,
  uploadUrl,
} from "@/features/studio/import/lib/upload-responses";
import { useTRPC } from "@/trpc/client";
import { uploadFiles } from "@/utils/uploadthing";

const STATUS_CONFIG = {
  PENDING: { icon: Clock, tone: "text-yellow-400", label: "Pending" },
  PROCESSING: { icon: Loader2, tone: "text-blue-400", label: "Processing" },
  COMPLETED: { icon: CheckCircle2, tone: "text-green-400", label: "Completed" },
  FAILED: { icon: XCircle, tone: "text-red-400", label: "Failed" },
  ROLLED_BACK: {
    icon: XCircle,
    tone: "text-muted-foreground",
    label: "Rolled back",
  },
} as const;

type ImportTab = "upload" | "history";

const PAGE_TABS: Array<{ id: ImportTab; label: string }> = [
  { id: "upload", label: "Upload export" },
  { id: "history", label: "Import history" },
];

function relativePath(file: File): string {
  return (
    (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
    file.name
  );
}

export default function ImportPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [dryRun, setDryRun] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<ImportTab>("upload");

  const jobsQuery = useQuery(trpc.studioImport.list.queryOptions());
  const createMindbodyImport = useMutation(
    trpc.studioImport.createMindbodyImport.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.studioImport.list.queryOptions(),
        );
        toast.success("Mindbody import job started");
        setSelectedFiles([]);
      },
    }),
  );
  const deleteUploadedMindbodyFile = useMutation(
    trpc.studioImport.deleteUploadedMindbodyFile.mutationOptions(),
  );
  const deleteMindbodyUpload = useMutation(
    trpc.studioImport.deleteMindbodyImportUpload.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.studioImport.list.queryOptions(),
        );
        toast.success("Previous Mindbody upload deleted");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const existingMindbodyUpload = React.useMemo(() => {
    return (jobsQuery.data?.jobs ?? []).find(
      (job) =>
        job.source === "MINDBODY" &&
        (job.status === "PENDING" || job.status === "FAILED") &&
        (Boolean(job.rawFileUrl) ||
          (Array.isArray(job.sourceFilenames) &&
            job.sourceFilenames.length > 0)),
    );
  }, [jobsQuery.data?.jobs]);

  const processingMindbodyImport = React.useMemo(() => {
    return (jobsQuery.data?.jobs ?? []).find(
      (job) => job.source === "MINDBODY" && job.status === "PROCESSING",
    );
  }, [jobsQuery.data?.jobs]);

  const classified = React.useMemo(() => {
    return selectedFiles.reduce<Record<string, number>>((acc, file) => {
      const kind = classifyMindbodyFileName(relativePath(file));
      acc[kind] = (acc[kind] ?? 0) + 1;
      return acc;
    }, {});
  }, [selectedFiles]);

  async function startMindbodyImport() {
    if (selectedFiles.length === 0) {
      toast.error("Choose a Mindbody ZIP or export files first");
      return;
    }
    if (processingMindbodyImport) {
      toast.error("A Mindbody import is already processing.");
      return;
    }

    setIsUploading(true);
    let uploadedManifest: Array<{ url: string; uploadKey?: string }> = [];
    try {
      if (existingMindbodyUpload) {
        await deleteMindbodyUpload.mutateAsync({
          id: existingMindbodyUpload.id,
        });
      }
      const uploaded = await uploadFiles("mindbodyImportFile", {
        files: selectedFiles,
      });
      const manifest = selectedFiles.map((file, index) => ({
        name: file.name,
        relativePath: relativePath(file),
        url: uploadUrl(uploaded[index]),
        uploadKey: uploadKey(uploaded[index]),
        size: file.size,
        type: file.type || undefined,
      }));
      uploadedManifest = manifest
        .filter((file) => file.url)
        .map((file) => ({ url: file.url, uploadKey: file.uploadKey }));

      const missingUrls = manifest.filter((file) => !file.url);
      if (missingUrls.length > 0) {
        await Promise.all(
          uploadedManifest.map((file) =>
            deleteUploadedMindbodyFile
              .mutateAsync({ file })
              .catch(() => undefined),
          ),
        );
        uploadedManifest = [];
        toast.error("Some files did not upload cleanly");
        return;
      }

      await createMindbodyImport.mutateAsync({
        files: manifest,
        dryRun,
        source: "dashboard",
      });
      uploadedManifest = [];
      setActiveTab("history");
    } catch (error) {
      if (uploadedManifest.length > 0) {
        await Promise.all(
          uploadedManifest.map((file) =>
            deleteUploadedMindbodyFile
              .mutateAsync({ file })
              .catch(() => undefined),
          ),
        );
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start the Mindbody import.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-end justify-between gap-3 p-6">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-lg font-semibold text-primary">Import data</h1>
            <p className="text-xs text-primary/75">
              Import a full Mindbody export and review anything that needs
              mapping.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {existingMindbodyUpload ? (
            <Badge variant="outline">
              <FileArchive className="size-3" />
              Existing upload queued
            </Badge>
          ) : null}
          {selectedFiles.length > 0 ? (
            <Badge variant="outline">
              <FileArchive className="size-3" />
              {selectedFiles.length} upload item
              {selectedFiles.length === 1 ? "" : "s"} selected
            </Badge>
          ) : null}
          <Badge variant="outline">
            {dryRun ? "Dry run enabled" : "Writes enabled"}
          </Badge>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={PAGE_TABS}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as ImportTab)}
        className="px-6"
      />

      <Separator className="bg-black/5 dark:bg-white/5" />

      {activeTab === "upload" ? (
        <div className="grid min-h-[calc(100vh-220px)] lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6 p-6">
            {processingMindbodyImport ? (
              <div className="rounded-md border border-sky-500/20 bg-sky-500/5 p-4">
                <div className="flex gap-2">
                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-sky-500" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-primary">
                      Mindbody import is processing
                    </p>
                    <p className="text-xs leading-relaxed text-primary/65">
                      New uploads are paused until this import finishes.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {existingMindbodyUpload ? (
              <div className="rounded-md border border-sky-500/20 bg-sky-500/5 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-primary">
                      Existing Mindbody upload queued
                    </p>
                    <p className="text-xs leading-relaxed text-primary/65">
                      {Array.isArray(existingMindbodyUpload.sourceFilenames) &&
                      existingMindbodyUpload.sourceFilenames[0]
                        ? existingMindbodyUpload.sourceFilenames[0]
                        : "A previous Mindbody archive is waiting to process."}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deleteMindbodyUpload.isPending || isUploading}
                    onClick={() =>
                      deleteMindbodyUpload.mutate({
                        id: existingMindbodyUpload.id,
                      })
                    }
                  >
                    {deleteMindbodyUpload.isPending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : null}
                    Delete upload
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="rounded-md border border-dashed border-black/10 bg-primary-foreground/40 p-6 dark:border-white/10 flex-1 justify-between">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium text-primary">
                      Upload the Mindbody export
                    </h2>
                  </div>
                  <p className="text-xs leading-relaxed text-primary/65">
                    Upload the full ZIP when you have it. Loose CSVs, contract
                    signatures, client files, and sale images are still
                    supported. Extra CSV columns are preserved in metadata and
                    flagged for review.
                  </p>
                </div>

                <div className="flex place-self-end h-full">
                  <Button asChild size="sm" variant="outline">
                    <Label
                      htmlFor="mindbody-export-files"
                      className="cursor-pointer"
                    >
                      Choose ZIP or files
                    </Label>
                  </Button>
                  <Input
                    id="mindbody-export-files"
                    type="file"
                    multiple
                    accept=".zip,.csv,.jpg,.jpeg,.png,.pdf,.doc,.docx,.txt,application/zip,application/x-zip-compressed"
                    className="hidden"
                    onChange={(event) =>
                      setSelectedFiles(Array.from(event.target.files ?? []))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-primary">
                    File review
                  </h2>
                  <p className="text-xs text-primary/65">
                    Check the detected uploads before starting the import. ZIP
                    contents are inspected after upload.
                  </p>
                </div>
                {selectedFiles.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles([])}
                  >
                    Clear selection
                  </Button>
                ) : null}
              </div>

              {selectedFiles.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(classified).map(([kind, count]) => (
                      <Badge key={kind} variant="outline">
                        {kind}: {count}
                      </Badge>
                    ))}
                  </div>
                  <div className="max-h-[340px] overflow-auto rounded-md border border-black/5 bg-primary-foreground dark:border-white/5">
                    {selectedFiles.slice(0, 120).map((file) => (
                      <div
                        key={relativePath(file)}
                        className="grid grid-cols-[minmax(0,1fr)_160px] gap-4 border-b border-black/5 px-3 py-2 text-xs last:border-b-0 dark:border-white/5"
                      >
                        <span className="truncate text-primary">
                          {relativePath(file)}
                        </span>
                        <span className="truncate text-right text-primary/60">
                          {classifyMindbodyFileName(relativePath(file))}
                        </span>
                      </div>
                    ))}
                    {selectedFiles.length > 120 ? (
                      <div className="px-3 py-2 text-xs text-primary/60">
                        {selectedFiles.length - 120} more files selected
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-black/5 bg-primary-foreground p-8 text-center text-xs text-primary/60 dark:border-white/5">
                  No archive or files selected yet.
                </div>
              )}
            </div>

            <Separator className="bg-black/5 dark:bg-white/5" />

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Switch checked={dryRun} onCheckedChange={setDryRun} />
                <div>
                  <p className="text-sm font-medium text-primary">Dry run</p>
                  <p className="text-xs text-primary/65">
                    Parse and validate without creating records.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                disabled={
                  selectedFiles.length === 0 ||
                  isUploading ||
                  createMindbodyImport.isPending ||
                  deleteMindbodyUpload.isPending ||
                  Boolean(processingMindbodyImport)
                }
                onClick={startMindbodyImport}
              >
                {isUploading ||
                createMindbodyImport.isPending ||
                deleteMindbodyUpload.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : null}
                {existingMindbodyUpload
                  ? "Replace upload and start import"
                  : "Start import"}
              </Button>
            </div>
          </section>

          <aside className="border-t border-black/5 bg-primary-foreground/35 p-6 dark:border-white/5 lg:border-l lg:border-t-0">
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ListChecks className="size-4 text-primary/60" />
                  <h2 className="text-sm font-medium text-primary">
                    What will be mapped
                  </h2>
                </div>
                <p className="text-xs leading-relaxed text-primary/65">
                  The importer maps the main Mindbody export into Aurea studio
                  records and logs anything that needs follow-up.
                </p>
              </div>

              <Separator className="bg-black/5 dark:bg-white/5" />

              <div className="space-y-3 text-xs">
                {[
                  "Clients, tags, notes, notification preferences",
                  "Locations, instructors, classes, visits, check-ins",
                  "Memberships, class credits, payments, products",
                  "Client files, contract signatures, sale images",
                  "Full ZIP exports, expanded and classified server-side",
                ].map((item) => (
                  <div key={item} className="flex gap-2 text-primary/75">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Separator className="bg-black/5 dark:bg-white/5" />

              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-primary">
                      Extra fields are preserved
                    </p>
                    <p className="text-xs leading-relaxed text-primary/65">
                      Unmapped CSV headers are stored in the import job for
                      review, while raw row data is kept in metadata.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="min-h-[calc(100vh-220px)]">
          <div className="flex items-center justify-between gap-3 p-6">
            <div>
              <h2 className="text-sm font-medium text-primary">
                Import history
              </h2>
              <p className="text-xs text-primary/65">
                Track processing status, warnings, and source file counts.
              </p>
            </div>
          </div>

          <Separator className="bg-black/5 dark:bg-white/5" />

          {jobsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 border-b border-black/5 bg-primary-foreground p-6 text-sm text-primary dark:border-white/5">
              <Loader2 className="size-4 animate-spin" />
              Loading jobs
            </div>
          ) : null}

          <div className="divide-y divide-black/5 dark:divide-white/5">
            {(jobsQuery.data?.jobs ?? []).map((job) => {
              const StatusIcon = STATUS_CONFIG[job.status].icon;
              const progress =
                job.totalRecords > 0
                  ? Math.round((job.processedRecords / job.totalRecords) * 100)
                  : 0;
              const warningCount = Array.isArray(job.warningLog)
                ? job.warningLog.length
                : 0;
              return (
                <div key={job.id} className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusIcon
                          className={`size-4 ${STATUS_CONFIG[job.status].tone} ${job.status === "PROCESSING" ? "animate-spin" : ""}`}
                        />
                        <span className="text-sm font-medium text-primary lowercase">
                          <span className="capitalize">{job.source}</span>{" "}
                          import
                        </span>

                        <Badge variant="outline" className="shadow-none">
                          {STATUS_CONFIG[job.status].label}
                        </Badge>

                        {warningCount > 0 ? (
                          <Badge
                            variant="outline"
                            className="ring-amber-300 shadow-none text-amber-500 bg-amber-50"
                          >
                            <AlertTriangle className="size-3" />
                            {warningCount} review items
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-primary/60 px-6">
                        <span>
                          {job.createdAt
                            ? formatDistanceToNow(new Date(job.createdAt), {
                                addSuffix: true,
                              })
                            : "Recently created"}
                        </span>
                        {Array.isArray(job.sourceFilenames) &&
                        job.sourceFilenames.length > 0 ? (
                          <span className="flex items-center gap-1">
                            <FileText className="size-3" />
                            {job.sourceFilenames.length} source files
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="min-w-48 space-y-2 text-xs text-primary/60">
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          {job.processedRecords}/{job.totalRecords} records
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!jobsQuery.isLoading &&
            (jobsQuery.data?.jobs ?? []).length === 0 ? (
              <div className="p-10 text-center text-sm text-primary/60">
                No import jobs yet.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
