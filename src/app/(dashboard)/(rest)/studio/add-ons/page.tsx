"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTabs } from "@/components/ui/page-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";

const channelProviders = ["RESERVE_WITH_GOOGLE", "CLASSPASS", "GYMPASS", "WELLHUB"] as const;
const accessProviders = ["KISI", "BRIVO", "SALTO", "HID", "GANTNER", "OTHER"] as const;
const installmentProviders = ["INTERNAL", "STRIPE", "AFFIRM", "KLARNA", "CLEARPAY", "PAYPAL"] as const;
const statusOptions = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "PAUSED"] as const;

const providerLabels: Record<(typeof channelProviders)[number], string> = {
  RESERVE_WITH_GOOGLE: "Reserve with Google",
  CLASSPASS: "ClassPass",
  GYMPASS: "Gympass",
  WELLHUB: "Wellhub",
};

type ChannelProvider = (typeof channelProviders)[number];
type StatusOption = (typeof statusOptions)[number];
type AccessProvider = (typeof accessProviders)[number];
type InstallmentProvider = (typeof installmentProviders)[number];

type SummaryRow = {
  id: string;
  name: string;
  category: string;
  detail: string;
  status: string;
};

const pageTabs = [
  { id: "channels", label: "Discovery channels" },
  { id: "pricing", label: "Pricing & payment" },
  { id: "content", label: "Content & access" },
  { id: "records", label: "Member records" },
];

const PRIMARY_COLUMN_ID = "name";

function buildSummaryColumns(): ColumnDef<SummaryRow>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      meta: { label: "Name" },
      enableHiding: false,
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-primary">{row.original.name}</p>
          <p className="text-[11px] text-primary/45">{row.original.detail}</p>
        </div>
      ),
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Category",
      meta: { label: "Category" },
      cell: ({ row }) => <span className="text-xs text-primary/55">{row.original.category}</span>,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => {
        const s = row.original.status;
        const tone = s === "active" || s === "published"
          ? "border-emerald-500/40 text-emerald-500"
          : s === "inactive" || s === "draft"
            ? "border-amber-500/40 text-amber-500"
            : "border-primary/20 text-primary/40";
        return (
          <Badge variant="outline" className={tone}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Badge>
        );
      },
    },
  ];
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export default function StudioAddOnsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("channels");
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("name.asc");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  // Dialog states
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelProvider, setChannelProvider] = useState<ChannelProvider>("RESERVE_WITH_GOOGLE");
  const [channelStatus, setChannelStatus] = useState<StatusOption>("DRAFT");
  const [channelUrl, setChannelUrl] = useState("");

  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [pricingName, setPricingName] = useState("");
  const [pricingValue, setPricingValue] = useState("10");

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentName, setPaymentName] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<InstallmentProvider>("INTERNAL");
  const [installments, setInstallments] = useState("3");

  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [accessProvider, setAccessProvider] = useState<AccessProvider>("KISI");
  const [accessLocation, setAccessLocation] = useState("");

  const [listingDialogOpen, setListingDialogOpen] = useState(false);
  const [listingTitle, setListingTitle] = useState("");
  const [listingDescription, setListingDescription] = useState("");

  const [metricDialogOpen, setMetricDialogOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [metricType, setMetricType] = useState("Heart rate");
  const [metricValue, setMetricValue] = useState("");

  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [workoutBlocks, setWorkoutBlocks] = useState("");

  const [soapDialogOpen, setSoapDialogOpen] = useState(false);
  const [soapText, setSoapText] = useState("");

  // Queries
  const { data: channels = [], isLoading: channelsLoading } = useQuery(trpc.studioAddOns.listChannels.queryOptions());
  const { data: pricingRules = [], isLoading: pricingLoading } = useQuery(trpc.studioAddOns.listPricingRules.queryOptions());
  const { data: paymentPlans = [] } = useQuery(trpc.studioAddOns.listPaymentPlans.queryOptions());
  const { data: videos = [], isLoading: contentLoading } = useQuery(trpc.studioAddOns.listVideos.queryOptions());
  const { data: access = [] } = useQuery(trpc.studioAddOns.listAccessIntegrations.queryOptions());
  const { data: listings = [] } = useQuery(trpc.studioAddOns.listMarketplaceListings.queryOptions());
  const { data: metrics = [], isLoading: recordsLoading } = useQuery(trpc.studioAddOns.listPerformanceMetrics.queryOptions());
  const { data: workouts = [] } = useQuery(trpc.studioAddOns.listWorkoutPrograms.queryOptions());
  const { data: soapNotes = [] } = useQuery(trpc.studioAddOns.listSoapNotes.queryOptions());
  const { data: clients } = useQuery(trpc.clients.list.queryOptions({ limit: 50 }));

  const invalidate = async () => { await queryClient.invalidateQueries(); };
  const mutOpts = (message: string) => ({
    onSuccess: async () => { await invalidate(); toast.success(message); },
    onError: (error: { message: string }) => { toast.error(error.message); },
  });

  const upsertChannel = useMutation(trpc.studioAddOns.upsertChannel.mutationOptions(mutOpts("Channel saved")));
  const createPricingRule = useMutation(trpc.studioAddOns.createPricingRule.mutationOptions(mutOpts("Pricing rule added")));
  const createPaymentPlan = useMutation(trpc.studioAddOns.createPaymentPlan.mutationOptions(mutOpts("Payment plan added")));
  const createVideo = useMutation(trpc.studioAddOns.createVideo.mutationOptions(mutOpts("Video added")));
  const createAccess = useMutation(trpc.studioAddOns.createAccessIntegration.mutationOptions(mutOpts("Access integration added")));
  const createMetric = useMutation(trpc.studioAddOns.createPerformanceMetric.mutationOptions(mutOpts("Metric added")));
  const createWorkout = useMutation(trpc.studioAddOns.createWorkoutProgram.mutationOptions(mutOpts("Workout saved")));
  const createSoap = useMutation(trpc.studioAddOns.createSoapNote.mutationOptions(mutOpts("SOAP note saved")));
  const upsertListing = useMutation(trpc.studioAddOns.upsertMarketplaceListing.mutationOptions(mutOpts("Listing saved")));

  const firstClientId = clientId || clients?.items[0]?.id || "";

  const columns = useMemo(() => buildSummaryColumns(), []);
  const COLUMN_IDS = columns.map((c, i) => c.id ?? `col-${i}`);
  const columnOrderFinal = columnOrder.length > 0 ? columnOrder : COLUMN_IDS;

  // Row builders
  const channelRows: SummaryRow[] = channels.map((ch) => ({
    id: ch.id,
    name: providerLabels[ch.provider as ChannelProvider] ?? ch.provider,
    category: "Discovery",
    detail: ch.bookingUrl ?? ch.externalAccountId ?? "No account detail",
    status: ch.status.replaceAll("_", " ").toLowerCase(),
  }));

  const pricingRows: SummaryRow[] = [
    ...pricingRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      category: "Dynamic pricing",
      detail: `${rule.adjustmentValue}% adjustment${rule.classType ? ` for ${rule.classType.name}` : ""}`,
      status: rule.isActive ? "active" : "inactive",
    })),
    ...paymentPlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      category: "Payment plan",
      detail: `${plan.installmentCount} ${plan.interval.toLowerCase()} installments via ${plan.provider}`,
      status: plan.isActive ? "active" : "inactive",
    })),
  ];

  const contentRows: SummaryRow[] = [
    ...videos.map((video) => ({
      id: video.id,
      name: video.title,
      category: "Video",
      detail: video.classType?.name ?? video.instructor?.name ?? video.accessLevel,
      status: video.isPublished ? "published" : "draft",
    })),
    ...access.map((item) => ({
      id: item.id,
      name: item.locationName ?? item.provider,
      category: "Door access",
      detail: item.provider,
      status: item.status.toLowerCase(),
    })),
    ...listings.map((listing) => ({
      id: listing.id,
      name: listing.title,
      category: "Marketplace",
      detail: listing.description,
      status: listing.status.toLowerCase(),
    })),
  ];

  const recordRows: SummaryRow[] = [
    ...metrics.map((metric) => ({
      id: metric.id,
      name: `${metric.client.name}: ${metric.metricType}`,
      category: "Performance",
      detail: `${metric.value} ${metric.unit}`,
      status: metric.source.toLowerCase(),
    })),
    ...workouts.map((workout) => ({
      id: workout.id,
      name: workout.title,
      category: "Workout",
      detail: workout.classType?.name ?? workout.coach?.name ?? "General programming",
      status: workout.isPublished ? "published" : "draft",
    })),
    ...soapNotes.map((note) => ({
      id: note.id,
      name: note.client.name,
      category: "SOAP note",
      detail: note.author?.name ?? "No author",
      status: "recorded",
    })),
  ];

  const activeRows = activeTab === "channels" ? channelRows
    : activeTab === "pricing" ? pricingRows
    : activeTab === "content" ? contentRows
    : recordRows;

  const isLoading = activeTab === "channels" ? channelsLoading
    : activeTab === "pricing" ? pricingLoading
    : activeTab === "content" ? contentLoading
    : recordsLoading;

  const filteredRows = useMemo(() => {
    let result = activeRows;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q),
      );
    }
    const [col, dir] = sortValue.split(".");
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (col === "name") cmp = a.name.localeCompare(b.name);
      else if (col === "category") cmp = a.category.localeCompare(b.category);
      else if (col === "status") cmp = a.status.localeCompare(b.status);
      return dir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [activeRows, search, sortValue]);

  const addButtonLabel = activeTab === "channels" ? "Add channel"
    : activeTab === "pricing" ? "Add rule"
    : activeTab === "content" ? "Add content"
    : "Add record";

  function openAddDialog() {
    if (activeTab === "channels") { setChannelProvider("RESERVE_WITH_GOOGLE"); setChannelStatus("DRAFT"); setChannelUrl(""); setChannelDialogOpen(true); }
    else if (activeTab === "pricing") { setPricingName(""); setPricingValue("10"); setPricingDialogOpen(true); }
    else if (activeTab === "content") { setVideoTitle(""); setVideoUrl(""); setVideoDialogOpen(true); }
    else { setMetricType("Heart rate"); setMetricValue(""); setMetricDialogOpen(true); }
  }

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Studio add-ons</h1>
          <p className="text-xs text-primary/70">
            Configure sales channels, pricing tools, content, access, and member records.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openAddDialog}>
          <Plus className="size-3.5" />
          {addButtonLabel}
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs tabs={pageTabs} activeTab={activeTab} onTabChange={setActiveTab} className="px-6" />

      <Separator className="bg-black/5 dark:bg-white/5" />

      <DataTable
        columns={columns}
        data={filteredRows}
        isLoading={isLoading}
        getRowId={(row) => row.id}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={(updater) =>
          setColumnVisibility(typeof updater === "function" ? (updater as (s: VisibilityState) => VisibilityState)(columnVisibility) : updater)
        }
        columnOrder={columnOrderFinal}
        onColumnOrderChange={(order) => setColumnOrder(order)}
        initialColumnOrder={COLUMN_IDS}
        enableGlobalSearch={false}
        toolbar={{
          filters: (ctx) => (
            <StudioTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={`Search ${activeTab}...`}
              sortOptions={[
                { value: "name.asc", label: "Name A–Z" },
                { value: "name.desc", label: "Name Z–A" },
                { value: "category.asc", label: "Category A–Z" },
                { value: "status.asc", label: "Status A–Z" },
              ]}
              sortValue={sortValue}
              onSortChange={setSortValue}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrderFinal}
              onColumnOrderChange={(order) => setColumnOrder(order)}
              initialColumnOrder={COLUMN_IDS}
              primaryColumnId={PRIMARY_COLUMN_ID}
            />
          ),
        }}
        emptyState={
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-primary/50">No {activeTab} configured yet.</p>
          </div>
        }
      />

      {/* Channel dialog */}
      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add discovery channel</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Provider">
              <Select value={channelProvider} onValueChange={(v) => setChannelProvider(v as ChannelProvider)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{channelProviders.map((p) => <SelectItem key={p} value={p}>{providerLabels[p]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={channelStatus} onValueChange={(v) => setChannelStatus(v as StatusOption)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s.replaceAll("_", " ").toLowerCase()}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Booking URL">
              <Input value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="https://..." />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChannelDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { upsertChannel.mutate({ provider: channelProvider, status: channelStatus, bookingUrl: channelUrl || undefined }); setChannelDialogOpen(false); }}>
              Save channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing rule dialog */}
      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add pricing rule</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Rule name">
              <Input value={pricingName} onChange={(e) => setPricingName(e.target.value)} placeholder="Peak demand" />
            </Field>
            <Field label="Adjustment %">
              <Input value={pricingValue} onChange={(e) => setPricingValue(e.target.value)} type="number" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPricingDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" disabled={!pricingName.trim()} onClick={() => { createPricingRule.mutate({ name: pricingName, adjustmentType: "PERCENT", adjustmentValue: Number(pricingValue), demandThresholdPercent: 80 }); setPricingDialogOpen(false); }}>
              Add rule
            </Button>
          </DialogFooter>
          <div className="border-t border-black/5 pt-4 mt-2">
            <p className="text-[11px] font-medium text-primary/40 mb-3">Or add a payment plan</p>
            <div className="space-y-4">
              <Field label="Plan name">
                <Input value={paymentName} onChange={(e) => setPaymentName(e.target.value)} placeholder="3 month plan" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Provider">
                  <Select value={paymentProvider} onValueChange={(v) => setPaymentProvider(v as InstallmentProvider)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{installmentProviders.map((p) => <SelectItem key={p} value={p}>{p.toLowerCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Installments">
                  <Input value={installments} onChange={(e) => setInstallments(e.target.value)} type="number" />
                </Field>
              </div>
              <Button variant="outline" size="sm" className="w-full" disabled={!paymentName.trim()} onClick={() => { createPaymentPlan.mutate({ name: paymentName, provider: paymentProvider, installmentCount: Number(installments), interval: "MONTHLY" }); setPricingDialogOpen(false); }}>
                Add payment plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add content</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-[11px] font-medium text-primary/40">Video</p>
            <Field label="Title"><Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} /></Field>
            <Field label="Video URL"><Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." /></Field>
            <Button variant="outline" size="sm" className="w-full" disabled={!videoTitle || !videoUrl} onClick={() => { createVideo.mutate({ title: videoTitle, videoUrl }); setVideoDialogOpen(false); }}>
              Add video
            </Button>
          </div>
          <Separator />
          <div className="space-y-4">
            <p className="text-[11px] font-medium text-primary/40">Door access</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Provider">
                <Select value={accessProvider} onValueChange={(v) => setAccessProvider(v as AccessProvider)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{accessProviders.map((p) => <SelectItem key={p} value={p}>{p.toLowerCase()}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Location"><Input value={accessLocation} onChange={(e) => setAccessLocation(e.target.value)} placeholder="Front door" /></Field>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => { createAccess.mutate({ provider: accessProvider, locationName: accessLocation || undefined }); setVideoDialogOpen(false); }}>
              Add access
            </Button>
          </div>
          <Separator />
          <div className="space-y-4">
            <p className="text-[11px] font-medium text-primary/40">Marketplace listing</p>
            <Field label="Title"><Input value={listingTitle} onChange={(e) => setListingTitle(e.target.value)} /></Field>
            <Field label="Description"><Input value={listingDescription} onChange={(e) => setListingDescription(e.target.value)} /></Field>
            <Button variant="outline" size="sm" className="w-full" disabled={!listingTitle || !listingDescription} onClick={() => { upsertListing.mutate({ title: listingTitle, description: listingDescription, categories: ["studio"], status: "DRAFT" }); setVideoDialogOpen(false); }}>
              Save listing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Metric dialog */}
      <Dialog open={metricDialogOpen} onOpenChange={setMetricDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add member record</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Member">
              <Select value={firstClientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{clients?.items.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <p className="text-[11px] font-medium text-primary/40">Performance metric</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Metric"><Input value={metricType} onChange={(e) => setMetricType(e.target.value)} /></Field>
              <Field label="Value"><Input value={metricValue} onChange={(e) => setMetricValue(e.target.value)} type="number" /></Field>
            </div>
            <Button variant="outline" size="sm" className="w-full" disabled={!firstClientId || !metricValue} onClick={() => { createMetric.mutate({ clientId: firstClientId, metricType, value: Number(metricValue), unit: "bpm" }); setMetricDialogOpen(false); }}>
              Add metric
            </Button>
          </div>
          <Separator />
          <div className="space-y-4">
            <p className="text-[11px] font-medium text-primary/40">Workout program</p>
            <Field label="Title"><Input value={workoutTitle} onChange={(e) => setWorkoutTitle(e.target.value)} placeholder="Monday strength" /></Field>
            <Field label="Blocks"><Textarea value={workoutBlocks} onChange={(e) => setWorkoutBlocks(e.target.value)} placeholder="Warm-up, strength, conditioning..." /></Field>
            <Button variant="outline" size="sm" className="w-full" disabled={!workoutTitle || !workoutBlocks} onClick={() => { createWorkout.mutate({ title: workoutTitle, blocks: workoutBlocks }); setMetricDialogOpen(false); }}>
              Save workout
            </Button>
          </div>
          <Separator />
          <div className="space-y-4">
            <p className="text-[11px] font-medium text-primary/40">SOAP note</p>
            <Field label="Subjective notes"><Textarea value={soapText} onChange={(e) => setSoapText(e.target.value)} placeholder="Subjective notes..." /></Field>
            <Button variant="outline" size="sm" className="w-full" disabled={!firstClientId || !soapText} onClick={() => { createSoap.mutate({ clientId: firstClientId, subjective: soapText }); setMetricDialogOpen(false); }}>
              Save SOAP note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
