import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const OUTPUT_DIR =
  "/Users/abdul/.codex/visualizations/2026/07/18/019f76f7-ea1f-7493-9229-004c75d2bcf8/outputs/aurea-third-party-cost-report";
const REPO_REPORT =
  "/Users/abdul/Desktop/aurea-crm/docs/THIRD_PARTY_COST_MODEL_2026-07-18.md";
const WORKBOOK_PATH = path.join(
  OUTPUT_DIR,
  "Aurea_Third_Party_Cost_Model_2026-07-18.xlsx",
);
const MODEL_JSON_PATH = path.join(OUTPUT_DIR, "model-results.json");

const AS_OF = "2026-07-18";
const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const GBP2 = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const PCT = new Intl.NumberFormat("en-GB", {
  style: "percent",
  maximumFractionDigits: 1,
});

const locations = [1, 10, 25, 50, 100, 250, 500, 1000];
const cases = {
  Low: {
    activeMembers: 300,
    apiRequests: 150_000,
    workflowRuns: 2_000,
    workflowSteps: 3,
    productEvents: 10_000,
    identifiedShare: 0.5,
    redisCommands: 50_000,
    redisStorageGb: 0.01,
    dbStorageGb: 0.05,
    dbEgressGb: 1,
    errors: 100,
    logsGb: 0.05,
    spans: 25_000,
    replays: 25,
    emails: 1_000,
    outboundSms: 250,
    inboundSms: 50,
    voiceMinutes: 25,
    uploadStorageGb: 1,
    vercelTransferGb: 2,
    vercelCpuHours: 1,
    vercelMemoryGbHours: 50,
    mapLoads: 1_000,
    badDebtRate: 0.005,
    providerFeeContingency: 0,
    forecastHeadroom: 0.1,
    retryFactor: 0.05,
    nonProdDbProjects: 0,
    sentrySpanPlanningRate: 0.000001,
    sentryReplayPlanningRate: 0.003,
  },
  Base: {
    activeMembers: 750,
    apiRequests: 500_000,
    workflowRuns: 10_000,
    workflowSteps: 5,
    productEvents: 40_000,
    identifiedShare: 0.7,
    redisCommands: 200_000,
    redisStorageGb: 0.05,
    dbStorageGb: 0.25,
    dbEgressGb: 3,
    errors: 500,
    logsGb: 0.2,
    spans: 100_000,
    replays: 100,
    emails: 6_000,
    outboundSms: 1_000,
    inboundSms: 200,
    voiceMinutes: 100,
    uploadStorageGb: 2,
    vercelTransferGb: 5,
    vercelCpuHours: 3,
    vercelMemoryGbHours: 150,
    mapLoads: 3_000,
    badDebtRate: 0.01,
    providerFeeContingency: 0.05,
    forecastHeadroom: 0.2,
    retryFactor: 0.1,
    nonProdDbProjects: 1,
    sentrySpanPlanningRate: 0.0000015,
    sentryReplayPlanningRate: 0.005,
  },
  High: {
    activeMembers: 1_500,
    apiRequests: 1_500_000,
    workflowRuns: 25_000,
    workflowSteps: 7,
    productEvents: 100_000,
    identifiedShare: 0.9,
    redisCommands: 750_000,
    redisStorageGb: 0.2,
    dbStorageGb: 1,
    dbEgressGb: 10,
    errors: 2_000,
    logsGb: 0.75,
    spans: 500_000,
    replays: 300,
    emails: 15_000,
    outboundSms: 3_000,
    inboundSms: 500,
    voiceMinutes: 300,
    uploadStorageGb: 10,
    vercelTransferGb: 15,
    vercelCpuHours: 8,
    vercelMemoryGbHours: 500,
    mapLoads: 10_000,
    badDebtRate: 0.03,
    providerFeeContingency: 0.15,
    forecastHeadroom: 0.3,
    retryFactor: 0.2,
    nonProdDbProjects: 2,
    sentrySpanPlanningRate: 0.0000025,
    sentryReplayPlanningRate: 0.01,
  },
};

const general = {
  pricePerLocationGbp: 500,
  vatRate: 0.2,
  usdToGbp: 0.75,
  communicationsTargetMargin: 0.25,
  communicationsCollectionRate: 0.022,
  stripeSubscriptionCardMix: 0.2,
  inngestFixedExecutions: 602_880,
};

const rates = {
  vercel: {
    seat: 20,
    includedUsageCredit: 20,
    includedRequests: 10_000_000,
    requestPerMillion: 2,
    includedCpuHours: 4,
    cpuPerHour: 0.128,
    includedMemoryGbHours: 360,
    memoryPerGbHour: 0.0106,
    includedTransferGb: 1_024,
    transferPerGb: 0.15,
  },
  supabase: {
    proBase: 25,
    computeCredit: 10,
    includedDiskGb: 8,
    diskPerGb: 0.125,
    includedEgressGb: 250,
    egressPerGb: 0.09,
  },
  inngest: {
    proBase: 99,
    includedExecutions: 1_000_000,
    overagePerMillion: 50,
    hobbyExecutions: 50_000,
  },
  uploadThing: {
    privateBase: 10,
    privateIncludedGb: 100,
    usageBase: 25,
    usageIncludedGb: 250,
    overagePerGb: 0.08,
  },
  upstash: {
    freeCommands: 500_000,
    freeStorageGb: 0.256,
    commandPer100k: 0.2,
    storageFreeGb: 1,
    storagePerGb: 0.25,
    prodPack: 200,
  },
  sentry: {
    teamBase: 26,
    businessBase: 80,
    developerErrors: 5_000,
    paidErrors: 50_000,
    logsIncludedGb: 5,
    logsPerGb: 0.5,
    spansIncluded: 5_000_000,
    replaysIncluded: 50,
  },
  posthog: {
    freeEvents: 1_000_000,
    identifiedStartingRate: 0.000248,
  },
  mapbox: { freeLoads: 50_000 },
  twilio: {
    outboundSms: 0.056,
    inboundSms: 0.0075,
    ukMobileNumber: 2.5,
    blendedVoiceMinute: 0.021,
  },
  stripe: {
    billingRate: 0.007,
    ukCardRate: 0.015,
    ukCardFixed: 0.2,
    bacsRate: 0.01,
    bacsMinimum: 0.2,
    bacsCap: 4,
  },
  connect: {
    gmvPerLocationGbp: 30_000,
    averageTicketGbp: 75,
    payoutsPerLocation: 4,
    accountMonthly: 2,
    payoutRate: 0.0025,
    payoutFixed: 0.1,
    lossReserveRate: 0.001,
  },
};

const sourceRows = [
  [
    "Vercel",
    "Pro and usage pricing",
    "https://vercel.com/pricing",
    "Commercial production plan; validate invoices and current rate card.",
  ],
  [
    "Supabase",
    "Pro, compute, disk and egress",
    "https://supabase.com/pricing",
    "Provider is an architectural assumption until the production database contract is confirmed.",
  ],
  [
    "Inngest",
    "Execution definition and Pro rate",
    "https://www.inngest.com/pricing",
    "One function run plus every durable step is an execution.",
  ],
  [
    "UploadThing",
    "Storage plans",
    "https://uploadthing.com/pricing",
    "Paid/private plan assumed when documents and regional controls are enabled.",
  ],
  [
    "Upstash",
    "Redis plans and PAYG",
    "https://upstash.com/pricing/redis",
    "Prod Pack is a resilience decision, not a pure volume threshold.",
  ],
  [
    "Sentry",
    "Team/Business quotas and known overages",
    "https://sentry.io/pricing/",
    "Span/replay rates in this model are internal planning placeholders pending a live calculator export or quote.",
  ],
  [
    "PostHog",
    "Product analytics pricing",
    "https://posthog.com/pricing",
    "Headline uses standard event pricing; identified-event upper bound is separate.",
  ],
  [
    "Resend",
    "Transactional email tiers",
    "https://resend.com/pricing",
    "Contacts/Broadcasts pricing is excluded because no current API use was found.",
  ],
  [
    "Twilio",
    "UK SMS pricing",
    "https://www.twilio.com/en-us/sms/pricing/gb",
    "Carrier, failed-message, international and regulatory fees require invoice telemetry.",
  ],
  [
    "Twilio",
    "UK Voice pricing",
    "https://www.twilio.com/en-us/voice/pricing/gb",
    "Model uses a blended local/mobile planning rate.",
  ],
  [
    "Stripe",
    "UK payment pricing",
    "https://stripe.com/gb/pricing",
    "Subscription collection assumes 80% Bacs and 20% UK cards.",
  ],
  [
    "Stripe Billing",
    "Billing pricing",
    "https://stripe.com/gb/billing/pricing",
    "Headline uses 0.7% PAYG until a contracted plan is signed.",
  ],
  [
    "Stripe Connect",
    "Charge type and liability",
    "https://docs.stripe.com/connect/charges?locale=en-GB",
    "Current destination charges debit Aurea for processing, refunds and chargebacks.",
  ],
  [
    "Mapbox",
    "Mapbox GL JS map loads",
    "https://www.mapbox.com/pricing",
    "Proposed commercial replacement for current CARTO public basemap assumption.",
  ],
  [
    "Google Cloud Pub/Sub",
    "Pub/Sub pricing",
    "https://cloud.google.com/pubsub/pricing",
    "Expected to remain within the first 10 GiB allowance initially.",
  ],
  [
    "Bank of England",
    "Exchange rates",
    "https://www.bankofengland.co.uk/boeapps/database/Rates.asp?Travel=NIxIRx&into=GBP",
    "The workbook uses a round planning rate of USD 1 = GBP 0.75 and includes FX sensitivities.",
  ],
];

const inventoryRows = [
  ["Vercel", "Hosting/serverless", "Live central", "Aurea", "Included", "Yes", "Pro from launch", "High", "Pro plus usage; Enterprise only for controls/SLA."],
  ["PostgreSQL / Supabase", "Database", "Live; vendor assumption", "Aurea", "Included", "No", "Pro from launch", "Medium", "Generic DATABASE_URL is authoritative; confirm provider, PITR, replicas and staging."],
  ["Inngest", "Durable jobs", "Live central", "Aurea", "Included", "No", "Pro from launch", "High", "602,880 minimum monthly executions before customer workflow load."],
  ["UploadThing", "File storage", "Live central", "Aurea", "Included allowance + overage", "Partial", "Paid/private from document launch", "High", "Logos, waivers, invoices, instructor files and import bursts."],
  ["Upstash Redis", "Cache/rate limiting", "Live central", "Aurea", "Included", "No", "PAYG; Prod Pack by resilience trigger", "High", "Free tier only while noncritical and within quota."],
  ["Sentry", "Observability", "Live central", "Aurea", "Included", "No", "Team/Business when production telemetry is controlled", "High", "Current 100% traces/logs/replays/PII configuration is not cost-safe."],
  ["PostHog", "Product analytics", "Live central", "Aurea", "Included", "No", "PAYG after free allowance", "High", "Identified users are captured; validate billing mode."],
  ["MapLibre + CARTO styles", "Maps", "Live with licensing risk", "Aurea", "Included", "No", "Replace with commercial map contract", "High", "Current public CARTO styles should not be treated as a commercial free tier."],
  ["Mapbox", "Maps", "Target commercial provider", "Aurea", "Included", "No", "PAYG map loads", "Medium", "Used as the modelled commercial replacement; current token appears legacy/unused."],
  ["Resend", "Email", "Live managed", "Aurea", "Metered add-on", "Yes", "Pro/Scale by volume and domain count", "High", "Transactional sending only in headline; no Resend Contacts/Broadcasts API found."],
  ["Twilio", "SMS/voice/numbers", "Live managed", "Aurea", "Metered add-on", "Yes", "PAYG then committed quote", "High", "Usage ledger exists but customer collection is not yet implemented."],
  ["Stripe Billing", "Aurea SaaS billing", "Target; not implemented", "Aurea", "Included in subscription economics", "No", "PAYG until contracted tier", "High", "No current £500 subscription creation, entitlement webhook or usage invoice export found."],
  ["Stripe Connect", "Studio customer payments", "Live destination charges", "Aurea today; target Studio", "Application fee or Studio direct", "Yes", "Direct charges target or full recovery", "High", "Current funds flow makes Aurea liable for fees/refunds/disputes."],
  ["Better Auth", "Authentication", "Live open source", "Aurea", "Included", "No", "No SaaS fee", "High", "Polar packages removed from current auth code."],
  ["Polar", "Legacy subscriptions", "Removed; stale env/docs", "None", "None", "No", "£0", "High", "Remove remaining environment names and documentation."],
  ["Google Workspace / Gmail / Calendar / Drive / Forms", "Studio productivity", "Live tenant-owned", "Studio", "Studio direct", "Yes", "Studio plan", "High", "OAuth/API use does not make Aurea the licence payer by default."],
  ["Microsoft 365 / Outlook / OneDrive", "Studio productivity", "Live tenant-owned", "Studio", "Studio direct", "Yes", "Studio plan", "High", "Same ownership rule as Google."],
  ["Slack", "Messaging integration", "Live tenant-owned", "Studio", "Studio direct", "Yes", "Studio plan", "High", "Aurea bears adapter/runtime cost only."],
  ["Discord", "Messaging integration", "Live tenant-owned", "Studio", "Studio direct", "Yes", "Studio plan", "High", "Aurea bears adapter/runtime cost only."],
  ["Telegram", "Messaging integration", "Live tenant-owned", "Studio", "Studio direct", "Yes", "Studio plan", "High", "Bot/platform fees are Studio responsibility unless bundled later."],
  ["Cal.com", "Scheduling", "Live tenant-owned", "Studio", "Studio direct", "Yes", "Studio plan", "Medium", "Tenant contract should remain separate."],
  ["Mindbody", "Studio data/import", "Live integration", "Studio", "Studio direct", "Yes", "Studio contract", "Medium", "Import limits create temporary storage and background-job stress."],
  ["Meta / Facebook / Instagram / WhatsApp", "Ads/messaging", "Mixed live/configured", "Studio", "Studio direct", "Yes", "Studio/ad spend", "Medium", "WhatsApp send billing path must be validated before a central forecast."],
  ["Google Ads", "Advertising", "Integrated/tenant-owned", "Studio", "Studio direct", "Yes", "Studio/ad spend", "Medium", "Media spend excluded from Aurea technology COGS."],
  ["TikTok Ads", "Advertising", "Integrated/tenant-owned", "Studio", "Studio direct", "Yes", "Studio/ad spend", "Medium", "Media spend excluded from Aurea technology COGS."],
  ["OpenAI", "AI", "BYOK", "Studio", "Studio direct", "Yes", "Tenant credential", "High", "Aurea AI credits are a future product decision."],
  ["Anthropic", "AI", "BYOK", "Studio", "Studio direct", "Yes", "Tenant credential", "High", "Same policy as OpenAI."],
  ["Google Gemini", "AI", "BYOK; model migration required", "Studio", "Studio direct", "Yes", "Tenant credential", "Medium", "Current Gemini 2.0 Flash lifecycle is a production-readiness issue."],
  ["Vonage", "Alternative communications", "Implemented but inactive", "None until selected", "None", "Potential", "£0 base", "Medium", "Migration option, not concurrent base spend."],
  ["MessageBird", "Alternative communications", "Implemented but inactive", "None until selected", "None", "Potential", "£0 base", "Medium", "Migration option, not concurrent base spend."],
  ["ClassPass", "Partner/catalogue", "Catalogue only", "Studio", "Studio direct", "Yes", "£0 Aurea until adapter exists", "Medium", "No committed central spend."],
  ["Wellhub", "Partner/catalogue", "Catalogue only", "Studio", "Studio direct", "Yes", "£0 Aurea until adapter exists", "Medium", "No committed central spend."],
  ["Kisi", "Access control/catalogue", "Catalogue only", "Studio", "Studio direct", "Yes", "£0 Aurea until adapter exists", "Medium", "No committed central spend."],
  ["Mailchimp", "Marketing/catalogue", "Catalogue only", "Studio", "Studio direct", "Yes", "£0 Aurea until adapter exists", "Medium", "No committed central spend."],
  ["Zoom", "Meetings/catalogue", "Catalogue only", "Studio", "Studio direct", "Yes", "£0 Aurea until adapter exists", "Medium", "No committed central spend."],
  ["Spivi", "Fitness/catalogue", "Catalogue only", "Studio", "Studio direct", "Yes", "£0 Aurea until adapter exists", "Medium", "No committed central spend."],
  ["Google Cloud Pub/Sub", "Provider notifications", "Live indirect dependency", "Aurea or Studio cloud project", "Included", "Potential", "Likely £0 initially", "Medium", "Monitor egress and project ownership."],
  ["Domains / DNS / registrar", "Platform operations", "Not evidenced", "TBC", "TBC", "Potential", "TBC", "Low", "Add confirmed registrar, DNS, email-domain and certificate contracts from invoices."],
  ["GitHub / CI", "Development operations", "Not evidenced", "Aurea", "Included overhead", "No", "TBC", "Low", "Repository code does not prove plan or seat count."],
  ["Status / uptime / security scanning", "Operations", "Not evidenced", "Aurea", "Included overhead", "No", "TBC", "Low", "Do not silently assume these are free; procurement decision required."],
  ["Open-source npm libraries", "Application dependencies", "Live", "Aurea", "Included", "No", "£0 licence fee unless support purchased", "High", "Engineering/maintenance cost is outside this technology-vendor report."],
];

const ownershipRows = [
  ["Vercel, database, Inngest, baseline storage, Redis, Sentry, PostHog, maps", "Aurea", "Aurea", "Included in £500", "None", "Platform limits", "Degrade noncritical features; preserve core service", "Current"],
  ["Resend transactional email", "Aurea", "Aurea then Studio", "Stripe usage line / prepaid credits", "25% contribution after collection", "Per-location daily/monthly send cap", "Pause outbound sends; retain inbound/history", "Target; ledger exists, cash collection missing"],
  ["Twilio SMS, voice and numbers", "Aurea", "Aurea then Studio", "Stripe usage line / prepaid credits", "25% contribution after collection", "Per-channel spend cap and alert", "Pause new outbound usage; preserve emergency/inbound policy", "Target; ledger exists, cash collection missing"],
  ["Exceptional private storage/import burst", "Aurea", "Aurea then Studio", "Included allowance then overage bundle", "25% contribution after collection", "File size, import and retention limits", "Block new excess uploads; never delete without policy", "Target"],
  ["Stripe Connect, current destination charges", "Aurea", "Aurea", "Application fee", "Full cost + risk reserve + platform margin", "GMV, dispute and negative-balance controls", "Hold/restrict payouts and new charges per policy", "Current architecture; recovery policy incomplete"],
  ["Stripe Connect, recommended direct charges", "Studio connected account", "Studio", "Stripe deducts from Studio; optional application fee to Aurea", "Contracted platform fee", "Stripe/Studio risk controls", "Studio resolves negative balance", "Target decision"],
  ["OpenAI, Anthropic, Gemini", "Studio", "Studio", "BYOK", "None", "Tenant provider budget", "Disable AI actions requiring a key", "Current target"],
  ["Google Workspace, Microsoft 365, Cal.com, Slack, Zoom and specialist apps", "Studio", "Studio", "Studio direct contract", "None", "Provider-native", "Feature unavailable until Studio reconnects/pays", "Current"],
  ["Advertising spend", "Studio", "Studio", "Studio ad account", "None", "Studio budget and provider controls", "Pause campaign actions only", "Current"],
  ["Premium support, enterprise compliance and vendor quotes", "Aurea", "Aurea", "Included or enterprise uplift", "N/A", "Board-approved procurement threshold", "Escalate before commitment", "TBC"],
];

const decisionRows = [
  ["D01", "Stripe Connect charge type", "Switch Studio customer payments to direct charges, or retain destination charges with complete recovery?", "Direct charges for SaaS-style Studio relationships unless marketplace control is required", "Before production payments", "Product + Finance + Engineering", "Open", "Critical"],
  ["D02", "Aurea subscription billing", "Implement the £500/location Stripe Billing contract, entitlements, webhooks, dunning and reconciliation.", "£500 ex VAT; 80% Bacs / 20% card planning mix", "Before first paid Studio", "Finance + Engineering", "Open", "Critical"],
  ["D03", "Communications recovery", "Choose prepaid credits versus monthly metering; implement invoice export and reconciliation.", "Prepaid or funded usage with 25% contribution target and spend caps", "Before managed communications launch", "Product + Finance", "Open", "Critical"],
  ["D04", "Sentry production policy", "Reduce traces/logs/replays and PII before relying on the model.", "Sampling, inbound filters, budgets, data minimisation", "Before production", "Engineering + Privacy", "Open", "Critical"],
  ["D05", "Maps licensing", "Replace current CARTO public basemap assumption with a commercial contract.", "Mapbox PAYG is modelled; compare MapTiler/self-hosting", "Before commercial launch", "Engineering + Procurement", "Open", "High"],
  ["D06", "Database vendor and resilience", "Confirm production PostgreSQL provider, staging, PITR, replicas, egress and support.", "Supabase Pro is a modelling proxy only", "Before production", "Engineering", "Open", "High"],
  ["D07", "Price and VAT", "Confirm whether £500 is plus VAT, and annual/trial/discount policy.", "Model assumes £500 net of VAT; invoice £600", "Before contracts", "Finance", "Open", "High"],
  ["D08", "Retention and storage", "Set retention for uploads, recordings, webhook payloads, events and audit logs.", "Tenant-configurable within compliance minimums", "Before scale", "Product + Privacy", "Open", "High"],
  ["D09", "AI commercial policy", "Keep BYOK or introduce Aurea-funded credits and overage.", "BYOK by default", "Before selling AI-inclusive plans", "Product + Finance", "Open", "Medium"],
  ["D10", "Enterprise/SLA thresholds", "Define when quotes, premium support, SSO, audit logs, DR or contractual SLA are required.", "Quote gates are decisions, not automatic cost savings", "Before 100-250 locations", "Leadership", "Open", "Medium"],
];

function progressive(value, tiers) {
  let cost = 0;
  let previous = 0;
  for (const tier of tiers) {
    const upper = tier.upTo ?? Number.POSITIVE_INFINITY;
    const quantity = Math.max(0, Math.min(value, upper) - previous);
    cost += quantity * tier.rate;
    previous = upper;
    if (value <= upper) break;
  }
  return cost;
}

function vercelSeats(locationCount) {
  if (locationCount <= 25) return 1;
  if (locationCount <= 50) return 2;
  if (locationCount <= 100) return 3;
  if (locationCount <= 250) return 4;
  if (locationCount <= 500) return 6;
  return 10;
}

function supabaseCompute(locationCount, caseName) {
  const schedules = {
    Low: [
      [10, "Micro", 10],
      [25, "Small", 15],
      [100, "Medium", 60],
      [250, "Large", 110],
      [500, "XL", 210],
      [1000, "2XL", 410],
    ],
    Base: [
      [1, "Micro", 10],
      [10, "Small", 15],
      [50, "Medium", 60],
      [100, "Large", 110],
      [250, "XL", 210],
      [500, "2XL", 410],
      [1000, "4XL", 960],
    ],
    High: [
      [1, "Small", 15],
      [25, "Medium", 60],
      [50, "Large", 110],
      [100, "XL", 210],
      [250, "2XL", 410],
      [500, "4XL", 960],
      [1000, "8XL", 1870],
    ],
  };
  return schedules[caseName].find(([max]) => locationCount <= max).slice(1);
}

function resendCostUsd(locationCount, emailVolume) {
  const tiers = [
    { base: 20, included: 50_000, overagePerThousand: 0.9, domains: 10 },
    { base: 35, included: 100_000, overagePerThousand: 0.9, domains: 10 },
    { base: 90, included: 100_000, overagePerThousand: 0.9, domains: 1_000 },
    { base: 160, included: 200_000, overagePerThousand: 0.8, domains: 1_000 },
    { base: 350, included: 500_000, overagePerThousand: 0.7, domains: 1_000 },
    { base: 650, included: 1_000_000, overagePerThousand: 0.65, domains: 1_000 },
    { base: 825, included: 1_500_000, overagePerThousand: 0.52, domains: 1_000 },
    { base: 1150, included: 2_500_000, overagePerThousand: 0.46, domains: 1_000 },
  ];
  if (emailVolume >= 3_000_000) {
    return emailVolume * 0.00046 * 1.15 + 30;
  }
  const candidates = tiers
    .filter((tier) => locationCount <= tier.domains)
    .map(
      (tier) =>
        tier.base +
        (Math.max(0, emailVolume - tier.included) / 1000) *
          tier.overagePerThousand,
    );
  return Math.min(...candidates);
}

function calculateScenario(locationCount, caseName) {
  const driver = cases[caseName];
  const headroom = 1 + driver.forecastHeadroom;
  const fx = general.usdToGbp;
  const grossRevenue = locationCount * general.pricePerLocationGbp;
  const netRevenue = grossRevenue * (1 - driver.badDebtRate);
  const invoicePerLocation =
    general.pricePerLocationGbp * (1 + general.vatRate);

  const requests = locationCount * driver.apiRequests * headroom;
  const cpu = locationCount * driver.vercelCpuHours * headroom;
  const memory = locationCount * driver.vercelMemoryGbHours * headroom;
  const transfer = locationCount * driver.vercelTransferGb * headroom;
  const vercelUsage =
    (Math.max(0, requests - rates.vercel.includedRequests) / 1_000_000) *
      rates.vercel.requestPerMillion +
    Math.max(0, cpu - rates.vercel.includedCpuHours) *
      rates.vercel.cpuPerHour +
    Math.max(0, memory - rates.vercel.includedMemoryGbHours) *
      rates.vercel.memoryPerGbHour +
    Math.max(0, transfer - rates.vercel.includedTransferGb) *
      rates.vercel.transferPerGb;
  const vercelUsd =
    vercelSeats(locationCount) * rates.vercel.seat +
    Math.max(0, vercelUsage - rates.vercel.includedUsageCredit);

  const [computeTier, computeUsd] = supabaseCompute(locationCount, caseName);
  const dbStorage = locationCount * driver.dbStorageGb * headroom;
  const dbEgress = locationCount * driver.dbEgressGb * headroom;
  const supabaseUsd =
    rates.supabase.proBase +
    driver.nonProdDbProjects * rates.supabase.proBase +
    Math.max(0, computeUsd - rates.supabase.computeCredit) +
    Math.max(0, dbStorage - rates.supabase.includedDiskGb) *
      rates.supabase.diskPerGb +
    Math.max(0, dbEgress - rates.supabase.includedEgressGb) *
      rates.supabase.egressPerGb;

  const customerExecutions =
    locationCount *
    driver.workflowRuns *
    (1 + driver.workflowSteps) *
    headroom *
    (1 + driver.retryFactor);
  const inngestExecutions =
    general.inngestFixedExecutions + customerExecutions;
  const inngestUsd =
    rates.inngest.proBase +
    (Math.max(0, inngestExecutions - rates.inngest.includedExecutions) /
      1_000_000) *
      rates.inngest.overagePerMillion;

  const uploadStorage =
    locationCount * driver.uploadStorageGb * headroom;
  const uploadThingUsd =
    uploadStorage <= rates.uploadThing.privateIncludedGb
      ? rates.uploadThing.privateBase
      : rates.uploadThing.usageBase +
        Math.max(0, uploadStorage - rates.uploadThing.usageIncludedGb) *
          rates.uploadThing.overagePerGb;

  const redisCommands = locationCount * driver.redisCommands * headroom;
  const redisStorage =
    locationCount * driver.redisStorageGb * headroom;
  const redisFree =
    redisCommands <= rates.upstash.freeCommands &&
    redisStorage <= rates.upstash.freeStorageGb;
  const prodPackThreshold =
    (caseName === "Low" && locationCount >= 500) ||
    (caseName === "Base" && locationCount >= 100) ||
    (caseName === "High" && locationCount >= 25);
  const upstashUsd =
    (redisFree
      ? 0
      : (redisCommands / 100_000) * rates.upstash.commandPer100k +
        Math.max(0, redisStorage - rates.upstash.storageFreeGb) *
          rates.upstash.storagePerGb) +
    (prodPackThreshold ? rates.upstash.prodPack : 0);

  const errors = locationCount * driver.errors * headroom;
  const logsGb = locationCount * driver.logsGb * headroom;
  const spans = locationCount * driver.spans * headroom;
  const replays = locationCount * driver.replays * headroom;
  const sentryPlan =
    locationCount >= 250
      ? "Business"
      : locationCount >= 10 ||
          errors > rates.sentry.developerErrors ||
          spans > rates.sentry.spansIncluded ||
          replays > rates.sentry.replaysIncluded
        ? "Team"
        : "Developer";
  const sentryBase =
    sentryPlan === "Business"
      ? rates.sentry.businessBase
      : sentryPlan === "Team"
        ? rates.sentry.teamBase
        : 0;
  const errorOverage = progressive(Math.max(0, errors - rates.sentry.paidErrors), [
    { upTo: 50_000, rate: 0.0003625 },
    { upTo: 450_000, rate: 0.0002188 },
    { upTo: 9_950_000, rate: 0.0001875 },
    { upTo: 19_950_000, rate: 0.0001625 },
    { rate: 0.00015 },
  ]);
  const sentryUsd =
    sentryBase +
    errorOverage +
    Math.max(0, logsGb - rates.sentry.logsIncludedGb) * rates.sentry.logsPerGb +
    Math.max(0, spans - rates.sentry.spansIncluded) *
      driver.sentrySpanPlanningRate +
    Math.max(0, replays - rates.sentry.replaysIncluded) *
      driver.sentryReplayPlanningRate;

  const productEvents =
    locationCount * driver.productEvents * headroom;
  const posthogUsd = progressive(productEvents, [
    { upTo: 1_000_000, rate: 0 },
    { upTo: 2_000_000, rate: 0.00005 },
    { upTo: 15_000_000, rate: 0.0000343 },
    { upTo: 50_000_000, rate: 0.0000295 },
    { upTo: 100_000_000, rate: 0.0000218 },
    { upTo: 250_000_000, rate: 0.000015 },
    { rate: 0.000009 },
  ]);
  const posthogIdentifiedStressUsd =
    Math.max(0, productEvents - rates.posthog.freeEvents) *
    rates.posthog.identifiedStartingRate;

  const mapLoads = locationCount * driver.mapLoads * headroom;
  const mapsUsd = progressive(mapLoads, [
    { upTo: 50_000, rate: 0 },
    { upTo: 100_000, rate: 5 / 1000 },
    { upTo: 200_000, rate: 4 / 1000 },
    { upTo: 1_000_000, rate: 3 / 1000 },
    { upTo: 5_000_000, rate: 2.5 / 1000 },
    { rate: 2.5 / 1000 },
  ]);

  const emails = locationCount * driver.emails;
  const resendUsd = resendCostUsd(locationCount, emails);
  const twilioRawUsd =
    locationCount *
    (rates.twilio.ukMobileNumber +
      driver.outboundSms * rates.twilio.outboundSms +
      driver.inboundSms * rates.twilio.inboundSms +
      driver.voiceMinutes * rates.twilio.blendedVoiceMinute);
  const twilioUsd =
    twilioRawUsd * (1 + driver.providerFeeContingency);

  const coreGbp =
    (vercelUsd +
      supabaseUsd +
      inngestUsd +
      uploadThingUsd +
      upstashUsd +
      sentryUsd +
      posthogUsd +
      mapsUsd) *
    fx;
  const communicationsGbp = (resendUsd + twilioUsd) * fx;
  const cardFeePerLocation =
    invoicePerLocation * rates.stripe.ukCardRate +
    rates.stripe.ukCardFixed;
  const bacsFeePerLocation = Math.max(
    rates.stripe.bacsMinimum,
    Math.min(
      rates.stripe.bacsCap,
      invoicePerLocation * rates.stripe.bacsRate,
    ),
  );
  const stripeCollectionGbp =
    locationCount *
    (invoicePerLocation * rates.stripe.billingRate +
      general.stripeSubscriptionCardMix * cardFeePerLocation +
      (1 - general.stripeSubscriptionCardMix) * bacsFeePerLocation);
  const currentCostGbp = coreGbp + communicationsGbp + stripeCollectionGbp;
  const currentContributionGbp = netRevenue - currentCostGbp;
  const currentMargin =
    netRevenue === 0 ? 0 : currentContributionGbp / netRevenue;
  const communicationsChargeGbp =
    communicationsGbp /
    (1 -
      general.communicationsTargetMargin -
      general.communicationsCollectionRate);
  const addOnCollectionGbp =
    communicationsChargeGbp * general.communicationsCollectionRate;
  const afterOffsetRevenueGbp = netRevenue + communicationsChargeGbp;
  const afterOffsetCostGbp =
    coreGbp +
    stripeCollectionGbp +
    communicationsGbp +
    addOnCollectionGbp;
  const afterOffsetContributionGbp =
    afterOffsetRevenueGbp - afterOffsetCostGbp;
  const afterOffsetMargin =
    afterOffsetRevenueGbp === 0
      ? 0
      : afterOffsetContributionGbp / afterOffsetRevenueGbp;

  return {
    scenario: `${locationCount}-${caseName}`,
    locations: locationCount,
    caseName,
    grossRevenue,
    netRevenue,
    annualNetRevenue: netRevenue * 12,
    invoicePerLocation,
    vercelGbp: vercelUsd * fx,
    supabaseGbp: supabaseUsd * fx,
    supabaseComputeTier: computeTier,
    inngestGbp: inngestUsd * fx,
    inngestExecutions,
    uploadThingGbp: uploadThingUsd * fx,
    upstashGbp: upstashUsd * fx,
    sentryGbp: sentryUsd * fx,
    sentryPlan,
    posthogGbp: posthogUsd * fx,
    posthogIdentifiedStressGbp: posthogIdentifiedStressUsd * fx,
    mapsGbp: mapsUsd * fx,
    coreGbp,
    resendGbp: resendUsd * fx,
    twilioGbp: twilioUsd * fx,
    communicationsGbp,
    stripeCollectionGbp,
    currentCostGbp,
    currentContributionGbp,
    currentMargin,
    communicationsChargeGbp,
    addOnCollectionGbp,
    afterOffsetRevenueGbp,
    afterOffsetCostGbp,
    afterOffsetContributionGbp,
    afterOffsetMargin,
    corePerLocationGbp: coreGbp / locationCount,
    communicationsPerLocationGbp: communicationsGbp / locationCount,
    totalPerLocationGbp: currentCostGbp / locationCount,
    requests,
    dbStorage,
    dbEgress,
    productEvents,
    mapLoads,
    emails,
    uploadStorage,
    redisCommands,
    errors,
    logsGb,
    spans,
    replays,
  };
}

const results = locations.flatMap((locationCount) =>
  Object.keys(cases).map((caseName) =>
    calculateScenario(locationCount, caseName),
  ),
);

function scenario(locationCount, caseName = "Base") {
  return results.find(
    (row) => row.locations === locationCount && row.caseName === caseName,
  );
}

function stripeConnectStress(locationCount) {
  const gmv = locationCount * rates.connect.gmvPerLocationGbp;
  const charges =
    gmv / rates.connect.averageTicketGbp;
  const processing =
    charges * rates.stripe.ukCardFixed + gmv * rates.stripe.ukCardRate;
  const connect =
    locationCount *
      (rates.connect.accountMonthly +
        rates.connect.payoutsPerLocation * rates.connect.payoutFixed) +
    gmv * rates.connect.payoutRate;
  const reserve = gmv * rates.connect.lossReserveRate;
  return {
    locations: locationCount,
    gmv,
    processing,
    connect,
    reserve,
    total: processing + connect + reserve,
  };
}

function stressTests() {
  const base100 = scenario(100, "Base");
  const zeroFixed =
    (rates.vercel.seat +
      rates.supabase.proBase * 2 +
      rates.inngest.proBase +
      rates.uploadThing.privateBase +
      rates.sentry.teamBase) *
    general.usdToGbp;
  return [
    ["Prelaunch with zero paying Studios", 0, zeroFixed, "Fixed production/staging tooling before revenue; excludes payroll and unpriced tools."],
    ["No managed communications", 100, base100.coreGbp + base100.stripeCollectionGbp, "Shows subscription platform cost without Resend/Twilio usage."],
    ["Base managed communications", 100, base100.currentCostGbp, "Reference case from the 24-scenario model."],
    ["Email-heavy: 30k emails/location", 100, base100.currentCostGbp + (resendCostUsd(100, 3_000_000) * general.usdToGbp - base100.resendGbp), "Requires Resend Enterprise quote at 3m emails; numeric value is a planning placeholder."],
    ["SMS-heavy: 10k outbound segments/location", 100, base100.currentCostGbp + 100 * 9_000 * rates.twilio.outboundSms * 1.15 * general.usdToGbp, "Carrier and international fees can increase this."],
    ["Voice-heavy: 1,000 minutes/location", 100, base100.currentCostGbp + 100 * 900 * rates.twilio.blendedVoiceMinute * 1.15 * general.usdToGbp, "Recording storage/transcription is not included without an approved product policy."],
    ["Automation-heavy: 100k runs, 8 steps/location", 100, base100.currentCostGbp + Math.max(0, ((100 * 100_000 * 9 * 1.2 * 1.1 + general.inngestFixedExecutions - base100.inngestExecutions) / 1_000_000) * rates.inngest.overagePerMillion * general.usdToGbp), "Concurrency, event volume and Enterprise quote gates may dominate before the linear overage."],
    ["Import/storage burst: 500 GB/location", 100, base100.currentCostGbp + ((50_000 - base100.uploadStorage) * rates.uploadThing.overagePerGb * general.usdToGbp), "A single permissive import can create a large temporary storage and egress event."],
    ["Analytics-heavy: 500k events/location", 100, base100.currentCostGbp + (progressive(60_000_000, [{ upTo: 1_000_000, rate: 0 }, { upTo: 2_000_000, rate: 0.00005 }, { upTo: 15_000_000, rate: 0.0000343 }, { upTo: 50_000_000, rate: 0.0000295 }, { upTo: 100_000_000, rate: 0.0000218 }]) - base100.posthogGbp / general.usdToGbp) * general.usdToGbp, "Validate event taxonomy and identified-event billing mode."],
    ["Current Connect destination charges: £30k GMV/location", 100, stripeConnectStress(100).total, "Separate Studio-payment cost surface; must be recovered with application fees or removed through direct charges."],
  ];
}

const stressRows = stressTests();

const COLORS = {
  navy: "#14213D",
  ink: "#17212B",
  teal: "#0F766E",
  blue: "#1D4ED8",
  green: "#15803D",
  red: "#B91C1C",
  amber: "#B45309",
  lightBlue: "#EAF2FF",
  lightGreen: "#EAF7EF",
  lightRed: "#FDECEC",
  lightAmber: "#FFF6E5",
  lightGray: "#F3F5F7",
  midGray: "#D5DBE1",
  white: "#FFFFFF",
  inputBlue: "#0000FF",
  linkGreen: "#008000",
};

function applyTitle(sheet, range, text, subtitle = null) {
  const [titleRange] = range.split(":");
  sheet.getRange(range).merge();
  sheet.getRange(titleRange).values = [[text]];
  sheet.getRange(range).format = {
    fill: COLORS.navy,
    font: { color: COLORS.white, bold: true, size: 20 },
    verticalAlignment: "center",
    rowHeight: 36,
  };
  if (subtitle) {
    const titleRow = Number(titleRange.match(/\d+/)[0]);
    const subtitleRange = range.replace(
      new RegExp(String(titleRow), "g"),
      String(titleRow + 1),
    );
    const subtitleCell = subtitleRange.split(":")[0];
    sheet.getRange(subtitleRange).merge();
    sheet.getRange(subtitleCell).values = [[subtitle]];
    sheet.getRange(subtitleRange).format = {
      fill: COLORS.navy,
      font: { color: "#DCE6F2", italic: true, size: 10 },
      verticalAlignment: "center",
      rowHeight: 23,
    };
  }
}

function applyHeader(range) {
  range.format = {
    fill: COLORS.teal,
    font: { color: COLORS.white, bold: true, size: 10 },
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "outside", style: "thin", color: COLORS.teal },
  };
}

function applySection(sheet, range, text) {
  sheet.getRange(range).merge();
  const cell = range.split(":")[0];
  sheet.getRange(cell).values = [[text]];
  sheet.getRange(range).format = {
    fill: COLORS.lightBlue,
    font: { color: COLORS.navy, bold: true, size: 11 },
    verticalAlignment: "center",
    rowHeight: 24,
    borders: {
      bottom: { style: "medium", color: COLORS.blue },
    },
  };
}

function setColumnWidths(sheet, widths) {
  for (const [column, width] of Object.entries(widths)) {
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  }
}

function styleTableBody(range) {
  range.format = {
    font: { color: COLORS.ink, size: 9 },
    verticalAlignment: "center",
    wrapText: true,
    borders: {
      insideHorizontal: { style: "thin", color: "#E5E7EB" },
      bottom: { style: "thin", color: "#E5E7EB" },
    },
  };
}

function styleInput(range) {
  range.format = {
    fill: "#F7FBFF",
    font: { color: COLORS.inputBlue, size: 9 },
  };
}

function styleLinked(range) {
  range.format.font = { color: COLORS.linkGreen, size: 9 };
}

function styleFormula(range) {
  range.format.font = { color: "#000000", size: 9 };
}

function addSourceComment(workbook, sheet, cell, text) {
  workbook.comments.addThread({ cell: sheet.getRange(cell) }, text);
}

function buildWorkbook() {
  const workbook = Workbook.create();
  workbook.comments.setSelf({ displayName: "Abdul" });
  const cover = workbook.worksheets.add("Executive Summary");
  const assumptions = workbook.worksheets.add("Assumptions");
  const model = workbook.worksheets.add("Scenario Model");
  const appCosts = workbook.worksheets.add("Application Costs");
  const offset = workbook.worksheets.add("Customer Offset");
  const rateCard = workbook.worksheets.add("Rate Card");
  const stress = workbook.worksheets.add("Stress Tests");
  const inventory = workbook.worksheets.add("Application Inventory");
  const decisions = workbook.worksheets.add("Risks & Decisions");
  const checks = workbook.worksheets.add("Checks");
  const sources = workbook.worksheets.add("Sources");
  const sheets = [
    cover,
    assumptions,
    model,
    appCosts,
    offset,
    rateCard,
    stress,
    inventory,
    decisions,
    checks,
    sources,
  ];
  for (const sheet of sheets) {
    sheet.showGridLines = false;
  }

  buildAssumptions(assumptions, workbook);
  buildRateCard(rateCard, workbook);
  buildScenarioModel(model);
  buildApplicationCosts(appCosts);
  buildExecutiveSummary(cover);
  buildCustomerOffset(offset);
  buildStressTests(stress);
  buildInventory(inventory);
  buildDecisions(decisions);
  buildChecks(checks);
  buildSources(sources);

  return workbook;
}

const assumptionDriverRows = {};

function buildAssumptions(sheet, workbook) {
  applyTitle(
    sheet,
    "A1:F1",
    "Aurea third-party cost model assumptions",
    "Blue cells are editable inputs. Amounts are monthly unless stated otherwise.",
  );
  applySection(sheet, "A4:F4", "Commercial and model conventions");
  const generalRows = [
    ["Input", "Value", "Unit", "Status", "Owner", "Notes"],
    ["Price per location", general.pricePerLocationGbp, "GBP ex VAT / month", "Decision", "Finance", "The report assumes £500 plus VAT, not VAT-inclusive."],
    ["VAT rate", general.vatRate, "%", "Assumption", "Finance", "UK standard VAT planning assumption; tax advice required."],
    ["USD to GBP", general.usdToGbp, "GBP per USD", "Planning", "Finance", "Round planning rate; sensitivity shown separately."],
    ["Communications target contribution margin", general.communicationsTargetMargin, "%", "Target", "Product + Finance", "Margin after provider cost and add-on collection fee."],
    ["Communications collection rate", general.communicationsCollectionRate, "% of usage bill", "Planning", "Finance", "Blended card/failed-payment allowance for usage add-ons."],
    ["Stripe subscription card mix", general.stripeSubscriptionCardMix, "%", "Planning", "Finance", "Remainder is Bacs Direct Debit."],
    ["Fixed Inngest executions", general.inngestFixedExecutions, "executions / month", "Code-derived", "Engineering", "Minimum scheduled/event-dispatch baseline before customer work."],
  ];
  sheet.getRange(`A5:F${4 + generalRows.length}`).values = generalRows;
  applyHeader(sheet.getRange("A5:F5"));
  styleTableBody(sheet.getRange(`A6:F${4 + generalRows.length}`));
  styleInput(sheet.getRange(`B6:B${4 + generalRows.length}`));
  sheet.getRange("B6").format.numberFormat = '"£"#,##0';
  sheet.getRange("B7:B10").format.numberFormat = "0.0%";
  sheet.getRange("B8").format.numberFormat = "0.00";
  sheet.getRange("B11").format.numberFormat = "0.0%";
  sheet.getRange("B12").format.numberFormat = "#,##0";

  applySection(sheet, "A15:F15", "Per-location operating drivers by usage case");
  const driverLabels = [
    ["Driver", "Low", "Base", "High", "Unit", "Why it matters"],
    ["Active members", "activeMembers", "members", "Database, app traffic and support volume."],
    ["App/API/edge requests", "apiRequests", "requests", "Vercel request usage."],
    ["Customer workflow runs", "workflowRuns", "runs", "Inngest function runs before durable steps."],
    ["Average durable steps per run", "workflowSteps", "steps", "Each step is separately billable by Inngest."],
    ["Product analytics events", "productEvents", "events", "PostHog usage."],
    ["Identified event share", "identifiedShare", "%", "Upper-bound PostHog billing sensitivity."],
    ["Redis commands", "redisCommands", "commands", "Upstash usage."],
    ["Redis storage", "redisStorageGb", "GB", "Upstash data footprint."],
    ["Database storage", "dbStorageGb", "GB", "Postgres disk."],
    ["Database egress", "dbEgressGb", "GB", "Database/network egress."],
    ["Sentry errors", "errors", "errors", "Error Monitoring."],
    ["Sentry logs", "logsGb", "GB", "Logs quota."],
    ["Sentry spans", "spans", "spans", "Tracing quota."],
    ["Sentry replays", "replays", "replays", "Replay quota."],
    ["Transactional emails", "emails", "emails", "Resend transactional volume."],
    ["Outbound SMS segments", "outboundSms", "segments", "Twilio usage; long messages can be multiple segments."],
    ["Inbound SMS segments", "inboundSms", "segments", "Twilio usage."],
    ["Voice minutes", "voiceMinutes", "minutes", "Twilio voice."],
    ["Private uploaded storage", "uploadStorageGb", "GB", "UploadThing storage."],
    ["Vercel data transfer", "vercelTransferGb", "GB", "Vercel transfer usage."],
    ["Vercel CPU", "vercelCpuHours", "hours", "Active CPU usage."],
    ["Vercel memory", "vercelMemoryGbHours", "GB-hours", "Function memory."],
    ["Map loads", "mapLoads", "loads", "Commercial map usage."],
    ["Bad debt/credits", "badDebtRate", "% of revenue", "Failed collection, refunds and credits."],
    ["Carrier/provider fee contingency", "providerFeeContingency", "% of Twilio list cost", "Carrier, failure and list-price variance."],
    ["Forecast headroom", "forecastHeadroom", "% of usage", "Non-production, bursts and estimation uncertainty."],
    ["Retry/duplicate execution factor", "retryFactor", "% of customer executions", "Inngest retries and duplicate work."],
    ["Paid non-production database projects", "nonProdDbProjects", "projects", "Staging/QA database environments."],
    ["Sentry span planning rate", "sentrySpanPlanningRate", "USD/span over quota", "Internal placeholder, not a vendor quote."],
    ["Sentry replay planning rate", "sentryReplayPlanningRate", "USD/replay over quota", "Internal placeholder, not a vendor quote."],
  ];
  const assumptionMatrix = [driverLabels[0]];
  for (let index = 1; index < driverLabels.length; index += 1) {
    const [label, key, unit, note] = driverLabels[index];
    assumptionMatrix.push([
      label,
      cases.Low[key],
      cases.Base[key],
      cases.High[key],
      unit,
      note,
    ]);
    assumptionDriverRows[key] = 16 + index;
  }
  const endRow = 15 + assumptionMatrix.length;
  sheet.getRange(`A16:F${endRow}`).values = assumptionMatrix;
  applyHeader(sheet.getRange("A16:F16"));
  styleTableBody(sheet.getRange(`A17:F${endRow}`));
  styleInput(sheet.getRange(`B17:D${endRow}`));
  sheet.getRange(`B22:D22`).format.numberFormat = "0.0%";
  sheet.getRange(`B40:D43`).format.numberFormat = "0.0%";
  sheet.getRange(`B46:D47`).format.numberFormat = "0.0000000";

  applySection(sheet, `A${endRow + 3}:F${endRow + 3}`, "Database compute planning schedule");
  const scheduleHeader = endRow + 4;
  const scheduleData = [
    ["Locations", "Low tier", "Low USD", "Base tier", "Base USD", "High tier / USD"],
    [1, "Micro", 10, "Micro", 10, "Small / 15"],
    [10, "Micro", 10, "Small", 15, "Medium / 60"],
    [25, "Small", 15, "Medium", 60, "Medium / 60"],
    [50, "Medium", 60, "Medium", 60, "Large / 110"],
    [100, "Medium", 60, "Large", 110, "XL / 210"],
    [250, "Large", 110, "XL", 210, "2XL / 410"],
    [500, "XL", 210, "2XL", 410, "4XL / 960"],
    [1000, "2XL", 410, "4XL", 960, "8XL / 1870"],
  ];
  sheet.getRange(`A${scheduleHeader}:F${scheduleHeader + 8}`).values =
    scheduleData;
  applyHeader(sheet.getRange(`A${scheduleHeader}:F${scheduleHeader}`));
  styleTableBody(
    sheet.getRange(`A${scheduleHeader + 1}:F${scheduleHeader + 8}`),
  );
  styleInput(
    sheet.getRange(`A${scheduleHeader + 1}:F${scheduleHeader + 8}`),
  );

  applySection(sheet, `A${scheduleHeader + 11}:F${scheduleHeader + 11}`, "Input legend and control notes");
  const legendRow = scheduleHeader + 12;
  sheet.getRange(`A${legendRow}:F${legendRow + 4}`).values = [
    ["Style", "Meaning", "Control", "Update cadence", "Evidence", "Comment"],
    ["Blue font", "Editable input", "Change only with an owner and rationale", "Quarterly or before board use", "Vendor rate/invoice/decision", "Inputs drive formulas."],
    ["Green font", "Cross-sheet reference", "Do not hardcode over it", "Automatic", "Workbook link", "Trace to assumptions/rates."],
    ["Black font", "Formula", "Do not overwrite", "Automatic", "Calculation", "Checks should remain PASS."],
    ["Yellow note", "Quote/decision required", "Resolve before contractual commitment", "As required", "Vendor quote or leadership decision", "Not assumed free."],
  ];
  applyHeader(sheet.getRange(`A${legendRow}:F${legendRow}`));
  styleTableBody(sheet.getRange(`A${legendRow + 1}:F${legendRow + 4}`));
  sheet.getRange(`A${legendRow + 1}:A${legendRow + 1}`).format.font = {
    color: COLORS.inputBlue,
  };
  sheet.getRange(`A${legendRow + 2}:A${legendRow + 2}`).format.font = {
    color: COLORS.linkGreen,
  };
  sheet.getRange(`A${legendRow + 3}:A${legendRow + 3}`).format.font = {
    color: "#000000",
  };
  sheet.getRange(`A${legendRow + 4}:F${legendRow + 4}`).format.fill =
    COLORS.lightAmber;

  setColumnWidths(sheet, {
    A: 34,
    B: 14,
    C: 14,
    D: 14,
    E: 22,
    F: 58,
  });
  sheet.freezePanes.freezeRows(5);
  addSourceComment(
    workbook,
    sheet,
    "B12",
    "Code-derived minimum: 219,720 scheduled function runs plus statically observed durable steps and the minutely delivery-dispatch event/function path. Dynamic recovery work is excluded.",
  );
}

const rateCells = {};

function buildRateCard(sheet, workbook) {
  applyTitle(
    sheet,
    "A1:F1",
    "Vendor rate card",
    "Native-currency public list prices and explicit internal planning placeholders.",
  );
  const sections = [
    ["Vercel", [
      ["Pro seat", rates.vercel.seat, "USD/month", "Published", "https://vercel.com/pricing", "Commercial production minimum"],
      ["Usage credit", rates.vercel.includedUsageCredit, "USD/month", "Published", "https://vercel.com/pricing", "Applied once to usage"],
      ["Included requests", rates.vercel.includedRequests, "requests", "Published", "https://vercel.com/pricing", ""],
      ["Requests overage", rates.vercel.requestPerMillion, "USD/million", "Published", "https://vercel.com/pricing", ""],
      ["Included CPU", rates.vercel.includedCpuHours, "hours", "Published", "https://vercel.com/pricing", ""],
      ["CPU overage", rates.vercel.cpuPerHour, "USD/hour", "Published", "https://vercel.com/pricing", ""],
      ["Included memory", rates.vercel.includedMemoryGbHours, "GB-hours", "Published", "https://vercel.com/pricing", ""],
      ["Memory overage", rates.vercel.memoryPerGbHour, "USD/GB-hour", "Published", "https://vercel.com/pricing", ""],
      ["Included transfer", rates.vercel.includedTransferGb, "GB", "Published", "https://vercel.com/pricing", ""],
      ["Transfer overage", rates.vercel.transferPerGb, "USD/GB", "Published", "https://vercel.com/pricing", ""],
    ]],
    ["Supabase", [
      ["Pro base", rates.supabase.proBase, "USD/month/project", "Published", "https://supabase.com/pricing", ""],
      ["Compute credit", rates.supabase.computeCredit, "USD/month", "Published", "https://supabase.com/pricing", ""],
      ["Included disk", rates.supabase.includedDiskGb, "GB", "Published", "https://supabase.com/pricing", ""],
      ["Disk overage", rates.supabase.diskPerGb, "USD/GB", "Published", "https://supabase.com/pricing", ""],
      ["Included egress", rates.supabase.includedEgressGb, "GB", "Published", "https://supabase.com/pricing", ""],
      ["Egress overage", rates.supabase.egressPerGb, "USD/GB", "Published", "https://supabase.com/pricing", ""],
    ]],
    ["Inngest", [
      ["Pro base", rates.inngest.proBase, "USD/month", "Published", "https://www.inngest.com/pricing", ""],
      ["Included executions", rates.inngest.includedExecutions, "executions", "Published", "https://www.inngest.com/pricing", ""],
      ["Overage", rates.inngest.overagePerMillion, "USD/million executions", "Published", "https://www.inngest.com/pricing", ""],
      ["Hobby allowance", rates.inngest.hobbyExecutions, "executions", "Published", "https://www.inngest.com/pricing", "Not viable with current fixed schedules"],
    ]],
    ["UploadThing", [
      ["Private base", rates.uploadThing.privateBase, "USD/month", "Published", "https://uploadthing.com/pricing", ""],
      ["Private included", rates.uploadThing.privateIncludedGb, "GB", "Published", "https://uploadthing.com/pricing", ""],
      ["Usage base", rates.uploadThing.usageBase, "USD/month", "Published", "https://uploadthing.com/pricing", ""],
      ["Usage included", rates.uploadThing.usageIncludedGb, "GB", "Published", "https://uploadthing.com/pricing", ""],
      ["Storage overage", rates.uploadThing.overagePerGb, "USD/GB", "Published", "https://uploadthing.com/pricing", ""],
    ]],
    ["Upstash", [
      ["Free commands", rates.upstash.freeCommands, "commands", "Published", "https://upstash.com/pricing/redis", ""],
      ["Free storage", rates.upstash.freeStorageGb, "GB", "Published", "https://upstash.com/pricing/redis", ""],
      ["PAYG commands", rates.upstash.commandPer100k, "USD/100k commands", "Published", "https://upstash.com/pricing/redis", ""],
      ["PAYG included storage", rates.upstash.storageFreeGb, "GB", "Published", "https://upstash.com/pricing/redis", ""],
      ["PAYG storage", rates.upstash.storagePerGb, "USD/GB", "Published", "https://upstash.com/pricing/redis", ""],
      ["Prod Pack", rates.upstash.prodPack, "USD/month/database", "Published", "https://upstash.com/pricing/redis", "Resilience/compliance decision"],
    ]],
    ["Sentry", [
      ["Team base", rates.sentry.teamBase, "USD/month annual", "Published", "https://sentry.io/pricing/", ""],
      ["Business base", rates.sentry.businessBase, "USD/month annual", "Published", "https://sentry.io/pricing/", ""],
      ["Developer errors", rates.sentry.developerErrors, "errors", "Published", "https://sentry.io/pricing/", ""],
      ["Paid plan errors", rates.sentry.paidErrors, "errors", "Published", "https://sentry.io/pricing/", ""],
      ["Included logs", rates.sentry.logsIncludedGb, "GB", "Published", "https://sentry.io/pricing/", ""],
      ["Log overage", rates.sentry.logsPerGb, "USD/GB", "Published", "https://sentry.io/pricing/", ""],
      ["Included spans", rates.sentry.spansIncluded, "spans", "Published", "https://sentry.io/pricing/", ""],
      ["Included replays", rates.sentry.replaysIncluded, "replays", "Published", "https://sentry.io/pricing/", ""],
    ]],
    ["PostHog", [
      ["Free events", rates.posthog.freeEvents, "events", "Published", "https://posthog.com/pricing", ""],
      ["Identified starting rate", rates.posthog.identifiedStartingRate, "USD/event", "Published starting rate", "https://posthog.com/pricing", "Upper-bound sensitivity only"],
    ]],
    ["Mapbox", [
      ["Free map loads", rates.mapbox.freeLoads, "loads", "Published", "https://www.mapbox.com/pricing", ""],
    ]],
    ["Twilio UK", [
      ["Outbound SMS", rates.twilio.outboundSms, "USD/segment", "Published", "https://www.twilio.com/en-us/sms/pricing/gb", "Carrier fees excluded"],
      ["Inbound SMS", rates.twilio.inboundSms, "USD/segment", "Published", "https://www.twilio.com/en-us/sms/pricing/gb", ""],
      ["Mobile number", rates.twilio.ukMobileNumber, "USD/month", "Published", "https://www.twilio.com/en-us/sms/pricing/gb", ""],
      ["Blended voice", rates.twilio.blendedVoiceMinute, "USD/minute", "Planning blend", "https://www.twilio.com/en-us/voice/pricing/gb", "Actual local/mobile mix required"],
    ]],
    ["Stripe UK", [
      ["Billing PAYG", rates.stripe.billingRate, "% billing volume", "Published", "https://stripe.com/gb/billing/pricing", ""],
      ["UK card", rates.stripe.ukCardRate, "%", "Published", "https://stripe.com/gb/pricing", ""],
      ["UK card fixed", rates.stripe.ukCardFixed, "GBP/charge", "Published", "https://stripe.com/gb/pricing", ""],
      ["Bacs", rates.stripe.bacsRate, "%", "Published", "https://stripe.com/gb/pricing", ""],
      ["Bacs minimum", rates.stripe.bacsMinimum, "GBP/charge", "Published", "https://stripe.com/gb/pricing", ""],
      ["Bacs cap", rates.stripe.bacsCap, "GBP/charge", "Published", "https://stripe.com/gb/pricing", ""],
    ]],
  ];

  let row = 4;
  for (const [sectionName, sectionRates] of sections) {
    applySection(sheet, `A${row}:F${row}`, sectionName);
    row += 1;
    sheet.getRange(`A${row}:F${row}`).values = [[
      "Rate",
      "Value",
      "Unit",
      "Evidence",
      "Source",
      "Notes",
    ]];
    applyHeader(sheet.getRange(`A${row}:F${row}`));
    const start = row + 1;
    sheet.getRange(`A${start}:F${start + sectionRates.length - 1}`).values =
      sectionRates;
    styleTableBody(
      sheet.getRange(`A${start}:F${start + sectionRates.length - 1}`),
    );
    styleInput(sheet.getRange(`B${start}:B${start + sectionRates.length - 1}`));
    for (let index = 0; index < sectionRates.length; index += 1) {
      rateCells[`${sectionName}|${sectionRates[index][0]}`] = `B${start + index}`;
    }
    row = start + sectionRates.length + 2;
  }

  applySection(sheet, `A${row}:F${row}`, "Published progressive tiers");
  row += 1;
  const progressiveRows = [
    ["Vendor / product", "Band start", "Band end", "Native rate", "Unit", "Source"],
    ["Sentry errors", 50_000, 100_000, 0.0003625, "USD/error", "https://sentry.io/pricing/"],
    ["Sentry errors", 100_000, 500_000, 0.0002188, "USD/error", "https://sentry.io/pricing/"],
    ["Sentry errors", 500_000, 10_000_000, 0.0001875, "USD/error", "https://sentry.io/pricing/"],
    ["Sentry errors", 10_000_000, 20_000_000, 0.0001625, "USD/error", "https://sentry.io/pricing/"],
    ["Sentry errors", 20_000_000, null, 0.00015, "USD/error", "https://sentry.io/pricing/"],
    ["PostHog events", 0, 1_000_000, 0, "USD/event", "https://posthog.com/pricing"],
    ["PostHog events", 1_000_000, 2_000_000, 0.00005, "USD/event", "https://posthog.com/pricing"],
    ["PostHog events", 2_000_000, 15_000_000, 0.0000343, "USD/event", "https://posthog.com/pricing"],
    ["PostHog events", 15_000_000, 50_000_000, 0.0000295, "USD/event", "https://posthog.com/pricing"],
    ["PostHog events", 50_000_000, 100_000_000, 0.0000218, "USD/event", "https://posthog.com/pricing"],
    ["PostHog events", 100_000_000, 250_000_000, 0.000015, "USD/event", "https://posthog.com/pricing"],
    ["PostHog events", 250_000_000, null, 0.000009, "USD/event", "https://posthog.com/pricing"],
    ["Mapbox GL JS", 0, 50_000, 0, "USD/load", "https://www.mapbox.com/pricing"],
    ["Mapbox GL JS", 50_000, 100_000, 0.005, "USD/load", "https://www.mapbox.com/pricing"],
    ["Mapbox GL JS", 100_000, 200_000, 0.004, "USD/load", "https://www.mapbox.com/pricing"],
    ["Mapbox GL JS", 200_000, 1_000_000, 0.003, "USD/load", "https://www.mapbox.com/pricing"],
    ["Mapbox GL JS", 1_000_000, 5_000_000, 0.0025, "USD/load", "https://www.mapbox.com/pricing"],
  ];
  sheet.getRange(`A${row}:F${row + progressiveRows.length - 1}`).values =
    progressiveRows;
  applyHeader(sheet.getRange(`A${row}:F${row}`));
  styleTableBody(
    sheet.getRange(`A${row + 1}:F${row + progressiveRows.length - 1}`),
  );
  styleInput(
    sheet.getRange(`B${row + 1}:D${row + progressiveRows.length - 1}`),
  );

  row += progressiveRows.length + 2;
  applySection(sheet, `A${row}:F${row}`, "Resend transactional plans");
  row += 1;
  const resendRows = [
    ["Plan", "Base USD", "Included emails", "Overage USD / 1k", "Domains", "Evidence"],
    ["Pro 50k", 20, 50_000, 0.9, 10, "Published"],
    ["Pro 100k", 35, 100_000, 0.9, 10, "Published"],
    ["Scale 100k", 90, 100_000, 0.9, 1_000, "Published"],
    ["Scale 200k", 160, 200_000, 0.8, 1_000, "Published"],
    ["Scale 500k", 350, 500_000, 0.7, 1_000, "Published"],
    ["Scale 1m", 650, 1_000_000, 0.65, 1_000, "Published"],
    ["Scale 1.5m", 825, 1_500_000, 0.52, 1_000, "Published"],
    ["Scale 2.5m", 1150, 2_500_000, 0.46, 1_000, "Published"],
    ["Enterprise placeholder", 0, 3_000_000, 0.46 * 1.15, 1_000, "Internal: last published marginal rate + 15%; quote required"],
  ];
  sheet.getRange(`A${row}:F${row + resendRows.length - 1}`).values =
    resendRows;
  applyHeader(sheet.getRange(`A${row}:F${row}`));
  styleTableBody(
    sheet.getRange(`A${row + 1}:F${row + resendRows.length - 1}`),
  );
  styleInput(sheet.getRange(`B${row + 1}:E${row + resendRows.length - 1}`));

  setColumnWidths(sheet, {
    A: 28,
    B: 18,
    C: 22,
    D: 20,
    E: 52,
    F: 46,
  });
  sheet.freezePanes.freezeRows(3);
  addSourceComment(
    workbook,
    sheet,
    rateCells["Sentry|Included spans"],
    "Sentry publishes the included span quota. The per-span planning rate in Assumptions is explicitly internal until a current calculator export or quote is obtained.",
  );
  addSourceComment(
    workbook,
    sheet,
    rateCells["Twilio UK|Blended voice"],
    "This is not a single published Twilio SKU. It is a planning blend of UK local and mobile destinations; replace with actual invoice mix.",
  );
}

function assumptionCell(key, caseName) {
  const column = { Low: "B", Base: "C", High: "D" }[caseName];
  return `'Assumptions'!$${column}$${assumptionDriverRows[key]}`;
}

function buildScenarioModel(sheet) {
  applyTitle(
    sheet,
    "A1:AT1",
    "Scenario model",
    "Twenty-four formula-driven cases: eight location counts x Low/Base/High usage.",
  );
  const headers = [
    "Scenario",
    "Locations",
    "Case",
    "Gross SaaS revenue",
    "Net SaaS revenue",
    "Annual net SaaS revenue",
    "Vercel",
    "Database",
    "Inngest",
    "UploadThing",
    "Upstash",
    "Sentry",
    "PostHog",
    "Commercial maps",
    "Core subtotal",
    "Resend",
    "Twilio",
    "Communications COGS",
    "Stripe SaaS collection",
    "Current tech cost",
    "Current contribution",
    "Current margin",
    "Target comms charge",
    "Add-on collection cost",
    "After-offset revenue",
    "After-offset tech cost",
    "After-offset contribution",
    "After-offset margin",
    "Core/location",
    "Comms/location",
    "Total cost/location",
    "Inngest executions",
    "PostHog identified stress",
    "DB compute tier",
    "Emails",
    "Map loads",
    "Events",
    "Errors",
    "Spans",
    "Replays",
    "DB storage GB",
    "DB egress GB",
    "Upload storage GB",
    "Redis commands",
    "Risk flag",
    "Confidence",
  ];
  sheet.getRange("A4:AT4").values = [headers];
  applyHeader(sheet.getRange("A4:AT4"));

  const rows = [];
  for (const result of results) {
    const r = 5 + rows.length;
    const caseName = result.caseName;
    const loc = result.locations;
    const headroom = assumptionCell("forecastHeadroom", caseName);
    const price = "'Assumptions'!$B$6";
    const badDebt = assumptionCell("badDebtRate", caseName);
    const fx = "'Assumptions'!$B$8";
    const vat = "'Assumptions'!$B$7";
    const commMargin = "'Assumptions'!$B$9";
    const commCollection = "'Assumptions'!$B$10";
    const cardMix = "'Assumptions'!$B$11";
    const fixedExec = "'Assumptions'!$B$12";
    const compute = supabaseCompute(loc, caseName);
    const seats = vercelSeats(loc);
    const req = assumptionCell("apiRequests", caseName);
    const cpu = assumptionCell("vercelCpuHours", caseName);
    const memory = assumptionCell("vercelMemoryGbHours", caseName);
    const transfer = assumptionCell("vercelTransferGb", caseName);
    const dbStorage = assumptionCell("dbStorageGb", caseName);
    const dbEgress = assumptionCell("dbEgressGb", caseName);
    const runs = assumptionCell("workflowRuns", caseName);
    const steps = assumptionCell("workflowSteps", caseName);
    const retry = assumptionCell("retryFactor", caseName);
    const nonProd = assumptionCell("nonProdDbProjects", caseName);
    const upload = assumptionCell("uploadStorageGb", caseName);
    const redisCommands = assumptionCell("redisCommands", caseName);
    const redisStorage = assumptionCell("redisStorageGb", caseName);
    const errors = assumptionCell("errors", caseName);
    const logs = assumptionCell("logsGb", caseName);
    const spans = assumptionCell("spans", caseName);
    const replays = assumptionCell("replays", caseName);
    const spanRate = assumptionCell("sentrySpanPlanningRate", caseName);
    const replayRate = assumptionCell("sentryReplayPlanningRate", caseName);
    const events = assumptionCell("productEvents", caseName);
    const mapLoads = assumptionCell("mapLoads", caseName);
    const emails = assumptionCell("emails", caseName);
    const outboundSms = assumptionCell("outboundSms", caseName);
    const inboundSms = assumptionCell("inboundSms", caseName);
    const voice = assumptionCell("voiceMinutes", caseName);
    const providerContingency = assumptionCell(
      "providerFeeContingency",
      caseName,
    );

    const vercelFormula = `=(${seats}*'Rate Card'!$${rateCells["Vercel|Pro seat"]}+MAX(0,MAX(0,B${r}*${req}*(1+${headroom})-'Rate Card'!$${rateCells["Vercel|Included requests"]})/1000000*'Rate Card'!$${rateCells["Vercel|Requests overage"]}+MAX(0,B${r}*${cpu}*(1+${headroom})-'Rate Card'!$${rateCells["Vercel|Included CPU"]})*'Rate Card'!$${rateCells["Vercel|CPU overage"]}+MAX(0,B${r}*${memory}*(1+${headroom})-'Rate Card'!$${rateCells["Vercel|Included memory"]})*'Rate Card'!$${rateCells["Vercel|Memory overage"]}+MAX(0,B${r}*${transfer}*(1+${headroom})-'Rate Card'!$${rateCells["Vercel|Included transfer"]})*'Rate Card'!$${rateCells["Vercel|Transfer overage"]}-'Rate Card'!$${rateCells["Vercel|Usage credit"]}))*${fx}`;
    const databaseFormula = `=('Rate Card'!$${rateCells["Supabase|Pro base"]}*(1+${nonProd})+MAX(0,${compute[1]}-'Rate Card'!$${rateCells["Supabase|Compute credit"]})+MAX(0,B${r}*${dbStorage}*(1+${headroom})-'Rate Card'!$${rateCells["Supabase|Included disk"]})*'Rate Card'!$${rateCells["Supabase|Disk overage"]}+MAX(0,B${r}*${dbEgress}*(1+${headroom})-'Rate Card'!$${rateCells["Supabase|Included egress"]})*'Rate Card'!$${rateCells["Supabase|Egress overage"]})*${fx}`;
    const executions = `(${fixedExec}+B${r}*${runs}*(1+${steps})*(1+${headroom})*(1+${retry}))`;
    const inngestFormula = `=('Rate Card'!$${rateCells["Inngest|Pro base"]}+MAX(0,${executions}-'Rate Card'!$${rateCells["Inngest|Included executions"]})/1000000*'Rate Card'!$${rateCells["Inngest|Overage"]})*${fx}`;
    const uploadFormula = `=IF(B${r}*${upload}*(1+${headroom})<='Rate Card'!$${rateCells["UploadThing|Private included"]},'Rate Card'!$${rateCells["UploadThing|Private base"]},'Rate Card'!$${rateCells["UploadThing|Usage base"]}+MAX(0,B${r}*${upload}*(1+${headroom})-'Rate Card'!$${rateCells["UploadThing|Usage included"]})*'Rate Card'!$${rateCells["UploadThing|Storage overage"]})*${fx}`;
    const prodPack = (
      (caseName === "Low" && loc >= 500) ||
      (caseName === "Base" && loc >= 100) ||
      (caseName === "High" && loc >= 25)
    )
      ? `'Rate Card'!$${rateCells["Upstash|Prod Pack"]}`
      : "0";
    const upstashFormula = `=(IF(AND(B${r}*${redisCommands}*(1+${headroom})<='Rate Card'!$${rateCells["Upstash|Free commands"]},B${r}*${redisStorage}*(1+${headroom})<='Rate Card'!$${rateCells["Upstash|Free storage"]}),0,B${r}*${redisCommands}*(1+${headroom})/100000*'Rate Card'!$${rateCells["Upstash|PAYG commands"]}+MAX(0,B${r}*${redisStorage}*(1+${headroom})-'Rate Card'!$${rateCells["Upstash|PAYG included storage"]})*'Rate Card'!$${rateCells["Upstash|PAYG storage"]})+${prodPack})*${fx}`;
    const errorsTotal = `(B${r}*${errors}*(1+${headroom}))`;
    const logsTotal = `(B${r}*${logs}*(1+${headroom}))`;
    const spansTotal = `(B${r}*${spans}*(1+${headroom}))`;
    const replaysTotal = `(B${r}*${replays}*(1+${headroom}))`;
    const sentryBase =
      loc >= 250
        ? `'Rate Card'!$${rateCells["Sentry|Business base"]}`
        : `IF(OR(B${r}>=10,${errorsTotal}>'Rate Card'!$${rateCells["Sentry|Developer errors"]},${spansTotal}>'Rate Card'!$${rateCells["Sentry|Included spans"]},${replaysTotal}>'Rate Card'!$${rateCells["Sentry|Included replays"]}),'Rate Card'!$${rateCells["Sentry|Team base"]},0)`;
    const errorExcess = `MAX(0,${errorsTotal}-'Rate Card'!$${rateCells["Sentry|Paid plan errors"]})`;
    const sentryErrorOverage = `(MIN(${errorExcess},50000)*0.0003625+MAX(0,MIN(${errorExcess},450000)-50000)*0.0002188+MAX(0,MIN(${errorExcess},9950000)-450000)*0.0001875+MAX(0,MIN(${errorExcess},19950000)-9950000)*0.0001625+MAX(0,${errorExcess}-19950000)*0.00015)`;
    const sentryFormula = `=(${sentryBase}+${sentryErrorOverage}+MAX(0,${logsTotal}-'Rate Card'!$${rateCells["Sentry|Included logs"]})*'Rate Card'!$${rateCells["Sentry|Log overage"]}+MAX(0,${spansTotal}-'Rate Card'!$${rateCells["Sentry|Included spans"]})*${spanRate}+MAX(0,${replaysTotal}-'Rate Card'!$${rateCells["Sentry|Included replays"]})*${replayRate})*${fx}`;
    const eventTotal = `(B${r}*${events}*(1+${headroom}))`;
    const posthogFormula = `=(MAX(0,MIN(${eventTotal},2000000)-1000000)*0.00005+MAX(0,MIN(${eventTotal},15000000)-2000000)*0.0000343+MAX(0,MIN(${eventTotal},50000000)-15000000)*0.0000295+MAX(0,MIN(${eventTotal},100000000)-50000000)*0.0000218+MAX(0,MIN(${eventTotal},250000000)-100000000)*0.000015+MAX(0,${eventTotal}-250000000)*0.000009)*${fx}`;
    const mapTotal = `(B${r}*${mapLoads}*(1+${headroom}))`;
    const mapsFormula = `=(MAX(0,MIN(${mapTotal},100000)-50000)*0.005+MAX(0,MIN(${mapTotal},200000)-100000)*0.004+MAX(0,MIN(${mapTotal},1000000)-200000)*0.003+MAX(0,MIN(${mapTotal},5000000)-1000000)*0.0025+MAX(0,${mapTotal}-5000000)*0.0025)*${fx}`;
    const emailTotal = `B${r}*${emails}`;
    const resendFormula =
      result.emails >= 3_000_000
        ? `=(${emailTotal}*0.00046*1.15+30)*${fx}`
        : `=MIN(IF(B${r}<=10,20+MAX(0,${emailTotal}-50000)/1000*0.9,1000000000),IF(B${r}<=10,35+MAX(0,${emailTotal}-100000)/1000*0.9,1000000000),90+MAX(0,${emailTotal}-100000)/1000*0.9,160+MAX(0,${emailTotal}-200000)/1000*0.8,350+MAX(0,${emailTotal}-500000)/1000*0.7,650+MAX(0,${emailTotal}-1000000)/1000*0.65,825+MAX(0,${emailTotal}-1500000)/1000*0.52,1150+MAX(0,${emailTotal}-2500000)/1000*0.46)*${fx}`;
    const twilioFormula = `=B${r}*('Rate Card'!$${rateCells["Twilio UK|Mobile number"]}+${outboundSms}*'Rate Card'!$${rateCells["Twilio UK|Outbound SMS"]}+${inboundSms}*'Rate Card'!$${rateCells["Twilio UK|Inbound SMS"]}+${voice}*'Rate Card'!$${rateCells["Twilio UK|Blended voice"]})*(1+${providerContingency})*${fx}`;
    const invoice = `(${price}*(1+${vat}))`;
    const cardFee = `(${invoice}*'Rate Card'!$${rateCells["Stripe UK|UK card"]}+'Rate Card'!$${rateCells["Stripe UK|UK card fixed"]})`;
    const bacsFee = `MAX('Rate Card'!$${rateCells["Stripe UK|Bacs minimum"]},MIN('Rate Card'!$${rateCells["Stripe UK|Bacs cap"]},${invoice}*'Rate Card'!$${rateCells["Stripe UK|Bacs"]}))`;
    const stripeFormula = `=B${r}*(${invoice}*'Rate Card'!$${rateCells["Stripe UK|Billing PAYG"]}+${cardMix}*${cardFee}+(1-${cardMix})*${bacsFee})`;

    rows.push({
      values: [[`${loc}-${caseName}`, loc, caseName]],
      formulas: [[
        `=B${r}*${price}`,
        `=D${r}*(1-${badDebt})`,
        `=E${r}*12`,
        vercelFormula,
        databaseFormula,
        inngestFormula,
        uploadFormula,
        upstashFormula,
        sentryFormula,
        posthogFormula,
        mapsFormula,
        `=SUM(G${r}:N${r})`,
        resendFormula,
        twilioFormula,
        `=SUM(P${r}:Q${r})`,
        stripeFormula,
        `=SUM(O${r},R${r}:S${r})`,
        `=E${r}-T${r}`,
        `=IF(E${r}=0,0,U${r}/E${r})`,
        `=R${r}/(1-${commMargin}-${commCollection})`,
        `=W${r}*${commCollection}`,
        `=E${r}+W${r}`,
        `=O${r}+R${r}+S${r}+X${r}`,
        `=Y${r}-Z${r}`,
        `=IF(Y${r}=0,0,AA${r}/Y${r})`,
        `=O${r}/B${r}`,
        `=R${r}/B${r}`,
        `=T${r}/B${r}`,
        `=${executions}`,
        `=MAX(0,${eventTotal}-'Rate Card'!$${rateCells["PostHog|Free events"]})*'Rate Card'!$${rateCells["PostHog|Identified starting rate"]}*${fx}`,
        null,
        `=${emailTotal}`,
        `=${mapTotal}`,
        `=${eventTotal}`,
        `=${errorsTotal}`,
        `=${spansTotal}`,
        `=${replaysTotal}`,
        `=B${r}*${dbStorage}*(1+${headroom})`,
        `=B${r}*${dbEgress}*(1+${headroom})`,
        `=B${r}*${upload}*(1+${headroom})`,
        `=B${r}*${redisCommands}*(1+${headroom})`,
        null,
        null,
      ]],
      staticValues: [compute[0], result],
    });
  }

  for (let index = 0; index < rows.length; index += 1) {
    const excelRow = 5 + index;
    sheet.getRange(`A${excelRow}:C${excelRow}`).values = rows[index].values;
    sheet.getRange(`D${excelRow}:AT${excelRow}`).formulas =
      rows[index].formulas;
    sheet.getRange(`AH${excelRow}`).values = [[rows[index].staticValues[0]]];
    const result = rows[index].staticValues[1];
    const riskFlag =
      result.inngestExecutions >= 25_000_000 ||
      result.emails >= 3_000_000 ||
      result.mapLoads >= 5_000_000
        ? "QUOTE / ENTERPRISE"
        : result.caseName === "High"
          ? "HIGH USAGE"
          : "MODELLED";
    const confidence =
      riskFlag === "QUOTE / ENTERPRISE" ? "Low" : "Medium";
    sheet.getRange(`AS${excelRow}:AT${excelRow}`).values = [[
      riskFlag,
      confidence,
    ]];
  }

  const endRow = 4 + results.length;
  styleTableBody(sheet.getRange(`A5:AT${endRow}`));
  styleLinked(sheet.getRange(`D5:AG${endRow}`));
  styleFormula(sheet.getRange(`O5:AG${endRow}`));
  sheet.getRange(`AH5:AT${endRow}`).format.font = {
    color: COLORS.ink,
    size: 9,
  };
  sheet.getRange(`D5:AE${endRow}`).format.numberFormat =
    '"£"#,##0;[Red]("£"#,##0);-';
  sheet.getRange(`V5:V${endRow}`).format.numberFormat = "0.0%";
  sheet.getRange(`AB5:AB${endRow}`).format.numberFormat = "0.0%";
  sheet.getRange(`AF5:AF${endRow}`).format.numberFormat = "#,##0";
  sheet.getRange(`AI5:AR${endRow}`).format.numberFormat = "#,##0";
  sheet.getRange(`AS5:AS${endRow}`).conditionalFormats.add("containsText", {
    text: "QUOTE",
    format: { fill: COLORS.lightAmber, font: { color: COLORS.amber, bold: true } },
  });
  sheet.getRange(`V5:V${endRow}`).conditionalFormats.add("cellIs", {
    operator: "lessThan",
    formula: 0.7,
    format: { fill: COLORS.lightRed, font: { color: COLORS.red, bold: true } },
  });
  sheet.getRange(`AB5:AB${endRow}`).conditionalFormats.add("cellIs", {
    operator: "greaterThanOrEqual",
    formula: 0.8,
    format: { fill: COLORS.lightGreen, font: { color: COLORS.green, bold: true } },
  });
  setColumnWidths(sheet, {
    A: 15,
    B: 11,
    C: 10,
    D: 16,
    E: 16,
    F: 18,
    G: 12,
    H: 12,
    I: 12,
    J: 12,
    K: 12,
    L: 12,
    M: 12,
    N: 14,
    O: 14,
    P: 12,
    Q: 12,
    R: 15,
    S: 15,
    T: 15,
    U: 15,
    V: 12,
    W: 15,
    X: 14,
    Y: 15,
    Z: 15,
    AA: 17,
    AB: 13,
    AC: 13,
    AD: 13,
    AE: 15,
    AF: 16,
    AG: 18,
    AH: 15,
    AI: 13,
    AJ: 13,
    AK: 13,
    AL: 13,
    AM: 13,
    AN: 13,
    AO: 13,
    AP: 13,
    AQ: 13,
    AR: 15,
    AS: 20,
    AT: 12,
  });
  sheet.freezePanes.freezeRows(4);
  sheet.freezePanes.freezeColumns(3);
}

function scenarioExcelRow(locationCount, caseName) {
  const locationIndex = locations.indexOf(locationCount);
  const caseIndex = Object.keys(cases).indexOf(caseName);
  return 5 + locationIndex * 3 + caseIndex;
}

function buildExecutiveSummary(sheet) {
  applyTitle(
    sheet,
    "A1:L1",
    "Aurea third-party cost model",
    `Stakeholder planning view | £500 per location per month ex VAT | As of ${AS_OF}`,
  );
  sheet.getRange("A4:L5").merge();
  sheet.getRange("A4").values = [[
    "Board conclusion: core software remains a minority of subscription revenue in the model, but managed communications and the current Stripe destination-charge architecture can create material variable COGS. Communications are not yet recovered in cash, and the current Sentry configuration is not forecast-safe.",
  ]];
  sheet.getRange("A4:L5").format = {
    fill: COLORS.lightAmber,
    font: { color: COLORS.ink, bold: true, size: 11 },
    wrapText: true,
    verticalAlignment: "center",
    borders: { preset: "outside", style: "medium", color: COLORS.amber },
  };

  applySection(sheet, "A7:L7", "Base usage: headline economics");
  const headlineHeaders = [
    "Locations",
    "Net SaaS revenue",
    "Core software",
    "Managed comms COGS",
    "Stripe collection",
    "Current tech cost",
    "Current margin",
    "Target comms charge",
    "After-offset margin",
    "Cost/location",
    "Annual tech cost",
    "Confidence",
  ];
  sheet.getRange("A8:L8").values = [headlineHeaders];
  applyHeader(sheet.getRange("A8:L8"));
  for (let index = 0; index < locations.length; index += 1) {
    const r = 9 + index;
    const modelRow = scenarioExcelRow(locations[index], "Base");
    sheet.getRange(`A${r}`).values = [[locations[index]]];
    sheet.getRange(`B${r}:K${r}`).formulas = [[
      `='Scenario Model'!E${modelRow}`,
      `='Scenario Model'!O${modelRow}`,
      `='Scenario Model'!R${modelRow}`,
      `='Scenario Model'!S${modelRow}`,
      `='Scenario Model'!T${modelRow}`,
      `='Scenario Model'!V${modelRow}`,
      `='Scenario Model'!W${modelRow}`,
      `='Scenario Model'!AB${modelRow}`,
      `='Scenario Model'!AE${modelRow}`,
      `='Scenario Model'!T${modelRow}*12`,
    ]];
    sheet.getRange(`L${r}`).values = [[
      scenario(locations[index], "Base").emails >= 3_000_000 ||
      scenario(locations[index], "Base").inngestExecutions >= 25_000_000
        ? "Low / quote"
        : "Medium",
    ]];
  }
  styleTableBody(sheet.getRange("A9:L16"));
  styleLinked(sheet.getRange("B9:K16"));
  sheet.getRange("B9:F16").format.numberFormat =
    '"£"#,##0;[Red]("£"#,##0);-';
  sheet.getRange("G9:G16").format.numberFormat = "0.0%";
  sheet.getRange("H9:H16").format.numberFormat =
    '"£"#,##0;[Red]("£"#,##0);-';
  sheet.getRange("I9:I16").format.numberFormat = "0.0%";
  sheet.getRange("J9:K16").format.numberFormat =
    '"£"#,##0;[Red]("£"#,##0);-';

  applySection(sheet, "A19:F19", "Key decisions before paid launch");
  sheet.getRange("A20:F26").values = [
    ["Priority", "Decision", "Why it changes cost", "Recommended position", "Owner", "Status"],
    ["Critical", "Connect charge type", "Destination charges make Aurea pay processing/refund/dispute exposure.", "Use direct charges for Studios unless marketplace control is intentional.", "Product + Finance + Engineering", "Open"],
    ["Critical", "Communications billing", "The ledger does not collect customer cash.", "Prepaid or metered Stripe line with reconciliation and spend caps.", "Product + Finance", "Open"],
    ["Critical", "Sentry sampling/privacy", "100% traces, logs, replay and PII can invalidate the estimate.", "Apply production budgets, filtering and data minimisation.", "Engineering + Privacy", "Open"],
    ["High", "VAT and discounts", "£500 inclusive of VAT reduces net revenue to £416.67.", "Contract £500 plus VAT; separately approve discounts and annual terms.", "Finance", "Open"],
    ["High", "Database and maps contracts", "Source code does not prove the DB vendor; current maps have licensing risk.", "Confirm production DB and commercial map provider.", "Engineering + Procurement", "Open"],
    ["High", "Enterprise quote gates", "Linear public pricing stops being reliable at high automation/email/map volume.", "Treat quote-required cells as procurement gates, not savings.", "Leadership", "Open"],
  ];
  applyHeader(sheet.getRange("A20:F20"));
  styleTableBody(sheet.getRange("A21:F26"));
  sheet.getRange("A21:A23").format.fill = COLORS.lightRed;
  sheet.getRange("A24:A26").format.fill = COLORS.lightAmber;

  applySection(sheet, "H19:L19", "Cost ownership");
  sheet.getRange("H20:L25").values = [
    ["Category", "Examples", "Payer", "Treatment", "State"],
    ["Included core", "Hosting, DB, jobs, storage baseline, monitoring", "Aurea", "Covered by £500", "Modelled"],
    ["Metered add-on", "Resend, Twilio, exceptional storage", "Studio via Aurea", "Cost plus margin", "Collection not implemented"],
    ["Studio direct", "AI BYOK, Workspace/M365, Cal.com, ad spend", "Studio", "Outside Aurea COGS", "Current target"],
    ["Connect current", "Studio customer processing via destination charge", "Aurea", "Recover via application fee", "Material gap"],
    ["Connect target", "Direct charges", "Studio", "Optional application fee to Aurea", "Decision"],
  ];
  applyHeader(sheet.getRange("H20:L20"));
  styleTableBody(sheet.getRange("H21:L25"));

  applySection(sheet, "A29:L29", "Base-case chart data");
  sheet.getRange("A30:D38").values = [
    ["Locations", "Net SaaS revenue", "Current tech cost", "After-offset tech cost"],
    ...locations.map((loc) => [loc, null, null, null]),
  ];
  for (let index = 0; index < locations.length; index += 1) {
    const r = 31 + index;
    const modelRow = scenarioExcelRow(locations[index], "Base");
    sheet.getRange(`B${r}:D${r}`).formulas = [[
      `='Scenario Model'!E${modelRow}`,
      `='Scenario Model'!T${modelRow}`,
      `='Scenario Model'!Z${modelRow}`,
    ]];
  }
  applyHeader(sheet.getRange("A30:D30"));
  styleTableBody(sheet.getRange("A31:D38"));
  styleLinked(sheet.getRange("B31:D38"));
  sheet.getRange("B31:D38").format.numberFormat = '"£"#,##0';
  const chart = sheet.charts.add("line", sheet.getRange("A30:D38"));
  chart.title = "Revenue scales faster than core technology cost";
  chart.hasLegend = true;
  chart.xAxis = { axisType: "textAxis", textStyle: { fontSize: 9 } };
  chart.yAxis = { numberFormatCode: '"£"#,##0', textStyle: { fontSize: 9 } };
  chart.setPosition("F29", "L43");

  applySection(sheet, "A41:E41", "FX sensitivity: base case at 100 locations");
  const base100Row = scenarioExcelRow(100, "Base");
  sheet.getRange("A42:E45").values = [
    ["USD to GBP", "USD-priced costs", "Stripe GBP cost", "Total tech cost", "Current margin"],
    [0.7, null, null, null, null],
    [0.75, null, null, null, null],
    [0.8, null, null, null, null],
  ];
  applyHeader(sheet.getRange("A42:E42"));
  for (let row = 43; row <= 45; row += 1) {
    sheet.getRange(`B${row}:E${row}`).formulas = [[
      `=('Scenario Model'!T${base100Row}-'Scenario Model'!S${base100Row})/'Assumptions'!$B$8*A${row}`,
      `='Scenario Model'!S${base100Row}`,
      `=B${row}+C${row}`,
      `=('Scenario Model'!E${base100Row}-D${row})/'Scenario Model'!E${base100Row}`,
    ]];
  }
  styleTableBody(sheet.getRange("A43:E45"));
  styleLinked(sheet.getRange("B43:E45"));
  styleFormula(sheet.getRange("D43:E45"));
  sheet.getRange("A43:A45").format.numberFormat = "0.00";
  sheet.getRange("B43:D45").format.numberFormat = '"£"#,##0';
  sheet.getRange("E43:E45").format.numberFormat = "0.0%";

  setColumnWidths(sheet, {
    A: 14,
    B: 17,
    C: 16,
    D: 17,
    E: 16,
    F: 16,
    G: 15,
    H: 17,
    I: 16,
    J: 15,
    K: 17,
    L: 19,
  });
  sheet.freezePanes.freezeRows(8);
}

function buildApplicationCosts(sheet) {
  applyTitle(
    sheet,
    "A1:J1",
    "Application cost detail",
    "Base usage case by location count. All values are monthly GBP.",
  );
  const services = [
    ["Vercel", "G"],
    ["Database", "H"],
    ["Inngest", "I"],
    ["UploadThing", "J"],
    ["Upstash", "K"],
    ["Sentry", "L"],
    ["PostHog", "M"],
    ["Commercial maps", "N"],
    ["Core subtotal", "O"],
    ["Resend", "P"],
    ["Twilio", "Q"],
    ["Communications subtotal", "R"],
    ["Stripe SaaS collection", "S"],
    ["Total technology cost", "T"],
  ];
  sheet.getRange("A4:J4").values = [[
    "Application",
    ...locations,
    "Cost owner / treatment",
  ]];
  applyHeader(sheet.getRange("A4:J4"));
  for (let index = 0; index < services.length; index += 1) {
    const row = 5 + index;
    const [service, column] = services[index];
    sheet.getRange(`A${row}`).values = [[service]];
    for (let locationIndex = 0; locationIndex < locations.length; locationIndex += 1) {
      const modelRow = scenarioExcelRow(locations[locationIndex], "Base");
      const excelColumn = String.fromCharCode("B".charCodeAt(0) + locationIndex);
      sheet.getRange(`${excelColumn}${row}`).formulas = [[
        `='Scenario Model'!${column}${modelRow}`,
      ]];
    }
    const treatment =
      service === "Resend" ||
      service === "Twilio" ||
      service === "Communications subtotal"
        ? "Aurea invoice today; target Studio metered add-on"
        : service === "Stripe SaaS collection"
          ? "Aurea cost to collect £500 subscription"
          : "Aurea included core";
    sheet.getRange(`J${row}`).values = [[treatment]];
  }
  styleTableBody(sheet.getRange(`A5:J${4 + services.length}`));
  styleLinked(sheet.getRange(`B5:I${4 + services.length}`));
  sheet.getRange(`B5:I${4 + services.length}`).format.numberFormat =
    '"£"#,##0;[Red]("£"#,##0);-';
  for (const row of [13, 17, 18]) {
    sheet.getRange(`A${row}:J${row}`).format = {
      fill: COLORS.lightBlue,
      font: { color: COLORS.navy, bold: true },
      borders: { top: { style: "medium", color: COLORS.blue } },
    };
  }

  applySection(sheet, "A22:J22", "What is and is not in the numeric headline");
  sheet.getRange("A23:J29").values = [
    ["Treatment", "Vercel", "DB", "Inngest", "Storage", "Observability", "Analytics/maps", "Comms", "Stripe SaaS", "Connect"],
    ["Included", "Yes", "Yes", "Yes", "Baseline", "Optimised policy", "Yes", "No: target add-on", "Yes", "Separate"],
    ["Free tier allowed?", "No", "No production", "No: fixed baseline", "Only before private docs", "Only within quotas and one user", "Yes within commercial terms", "No burst assumption", "N/A", "N/A"],
    ["Quote gate", "SLA/security", "HA/support", "High executions/concurrency", "Very large/import burst", "Enterprise controls", "High maps/events", "High volume/international", "Contracted Billing tier", "Material GMV/risk"],
    ["Excluded", "Enterprise quote", "Unknown provider contract", "Enterprise quote", "Egress/retention unknowns", "Current unsafe config stress", "Identified-mode upper bound", "WhatsApp/international/carrier detail", "Tax/legal advice", "Processing/refund/dispute current-state stress"],
    ["Confidence", "Medium", "Medium", "High baseline; lower at scale", "Medium", "Low until sampling", "Medium", "High list rate; lower invoice mix", "High", "High current architecture"],
    ["Action", "Export 30-90 day usage", "Confirm vendor and PITR", "Measure executions/concurrency", "Set retention and upload caps", "Change production config", "Validate billing modes/licence", "Implement billing reconciliation", "Implement Billing/dunning", "Decide direct vs destination"],
  ];
  applyHeader(sheet.getRange("A23:J23"));
  styleTableBody(sheet.getRange("A24:J29"));
  setColumnWidths(sheet, {
    A: 27,
    B: 14,
    C: 14,
    D: 14,
    E: 15,
    F: 17,
    G: 19,
    H: 18,
    I: 18,
    J: 54,
  });
  sheet.freezePanes.freezeRows(4);
  sheet.freezePanes.freezeColumns(1);
}

function buildCustomerOffset(sheet) {
  applyTitle(
    sheet,
    "A1:H1",
    "Customer offset and pass-through policy",
    "Who contracts, who pays, how recovery works, and whether the mechanism exists.",
  );
  sheet.getRange("A4:H4").values = [[
    "Cost surface",
    "Contracting party",
    "Cash payer",
    "Customer mechanism",
    "Margin / recovery",
    "Spend cap",
    "Non-payment response",
    "Implementation state",
  ]];
  applyHeader(sheet.getRange("A4:H4"));
  sheet.getRange(`A5:H${4 + ownershipRows.length}`).values = ownershipRows;
  styleTableBody(sheet.getRange(`A5:H${4 + ownershipRows.length}`));
  sheet.getRange("H6:H7").format.fill = COLORS.lightRed;
  sheet.getRange("H9:H10").format.fill = COLORS.lightAmber;

  const start = 7 + ownershipRows.length;
  applySection(sheet, `A${start}:H${start}`, "Illustrative customer rate card");
  const headerRow = start + 1;
  const costFactor =
    1 /
    (1 -
      general.communicationsTargetMargin -
      general.communicationsCollectionRate);
  const unitRows = [
    ["Unit", "Provider cost GBP", "Exact recovery price", "Proposed sell price", "Gross headroom", "Billing unit", "Included allowance", "Notes"],
    ["Outbound UK SMS segment", rates.twilio.outboundSms * general.usdToGbp, rates.twilio.outboundSms * general.usdToGbp * costFactor, 0.06, null, "Per segment", "Plan decision", "Carrier/international fees billed at cost plus margin."],
    ["Inbound UK SMS segment", rates.twilio.inboundSms * general.usdToGbp, rates.twilio.inboundSms * general.usdToGbp * costFactor, 0.01, null, "Per segment", "Plan decision", "Round for invoice readability."],
    ["UK mobile number", rates.twilio.ukMobileNumber * general.usdToGbp, rates.twilio.ukMobileNumber * general.usdToGbp * costFactor, 3, null, "Per number/month", "Optional", "Provision only after funded balance."],
    ["Voice minute", rates.twilio.blendedVoiceMinute * general.usdToGbp, rates.twilio.blendedVoiceMinute * general.usdToGbp * costFactor, 0.025, null, "Per minute", "Plan decision", "Destination mix can exceed the blend."],
    ["Transactional email overage", 0.9 / 1000 * general.usdToGbp, 0.9 / 1000 * general.usdToGbp * costFactor, 0.00125, null, "Per email", "Plan decision", "Also allocate Resend fixed/domain plan cost."],
    ["Private storage overage", rates.uploadThing.overagePerGb * general.usdToGbp, rates.uploadThing.overagePerGb * general.usdToGbp * costFactor, 0.1, null, "Per GB-month", "Plan allowance", "Use bundles/minimums to avoid tiny invoices."],
    ["AI usage", 0, 0, 0, null, "BYOK", "None funded by Aurea", "Future Aurea credits require a separate model."],
  ];
  sheet.getRange(`A${headerRow}:H${headerRow + unitRows.length - 1}`).values =
    unitRows;
  applyHeader(sheet.getRange(`A${headerRow}:H${headerRow}`));
  styleTableBody(
    sheet.getRange(`A${headerRow + 1}:H${headerRow + unitRows.length - 1}`),
  );
  for (let row = headerRow + 1; row < headerRow + unitRows.length; row += 1) {
    sheet.getRange(`E${row}`).formulas = [[
      `=IF(B${row}=0,0,(D${row}-B${row})/D${row})`,
    ]];
  }
  styleFormula(
    sheet.getRange(`E${headerRow + 1}:E${headerRow + unitRows.length - 1}`),
  );
  sheet.getRange(`B${headerRow + 1}:D${headerRow + unitRows.length - 1}`).format
    .numberFormat = '"£"0.0000';
  sheet.getRange(`E${headerRow + 1}:E${headerRow + unitRows.length - 1}`).format
    .numberFormat = "0.0%";

  const noteStart = headerRow + unitRows.length + 2;
  applySection(sheet, `A${noteStart}:H${noteStart}`, "Minimum billing controls");
  sheet.getRange(`A${noteStart + 1}:H${noteStart + 7}`).values = [
    ["Control", "Requirement", "Owner", "Evidence", "Failure mode", "Customer UX", "Accounting", "Status"],
    ["Funded balance or credit limit", "No unlimited provider spend against unfunded customer receivable.", "Finance + Product", "Stripe balance / limit", "Working-capital loss", "Live usage and alerts", "Deferred revenue / receivable policy", "Required"],
    ["Idempotent usage export", "Every ledger unit maps once to a Stripe invoice/meter item.", "Engineering", "Reconciliation report", "Duplicate/missed billing", "Usage detail", "Subledger tie-out", "Required"],
    ["Markup and tax", "Rate card, VAT and carrier pass-through treatment approved.", "Finance", "Signed pricing policy", "Under-recovery/tax risk", "Transparent price", "Revenue recognition policy", "Required"],
    ["Spend caps", "Per Studio/channel daily and monthly limits with authorised overrides.", "Product", "Audit log", "Runaway spend/abuse", "Self-serve limits", "Control evidence", "Required"],
    ["Dunning/non-payment", "Define which outbound services pause and what remains accessible.", "Finance + Support", "Runbook", "Growing bad debt", "Clear grace period", "Bad debt/credit memo", "Required"],
    ["Invoice reconciliation", "Provider invoice, usage ledger, Stripe invoice and cash settlement agree.", "Finance + Engineering", "Monthly control", "Margin leakage", "Dispute evidence", "Month-end close", "Required"],
  ];
  applyHeader(sheet.getRange(`A${noteStart + 1}:H${noteStart + 1}`));
  styleTableBody(sheet.getRange(`A${noteStart + 2}:H${noteStart + 7}`));

  setColumnWidths(sheet, {
    A: 31,
    B: 18,
    C: 18,
    D: 25,
    E: 20,
    F: 24,
    G: 32,
    H: 42,
  });
  sheet.freezePanes.freezeRows(4);
}

function buildStressTests(sheet) {
  applyTitle(
    sheet,
    "A1:F1",
    "Stress tests and non-base cases",
    "These are planning sensitivities, not additional concurrent costs.",
  );
  sheet.getRange("A4:F4").values = [[
    "Stress case",
    "Locations",
    "Monthly cost / exposure",
    "Annualised",
    "Included in headline?",
    "Interpretation",
  ]];
  applyHeader(sheet.getRange("A4:F4"));
  for (let index = 0; index < stressRows.length; index += 1) {
    const row = 5 + index;
    const [name, locationCount, cost, note] = stressRows[index];
    sheet.getRange(`A${row}:C${row}`).values = [[name, locationCount, cost]];
    sheet.getRange(`D${row}`).formulas = [[`=C${row}*12`]];
    sheet.getRange(`E${row}:F${row}`).values = [[
      name === "Base managed communications" ? "Yes" : "No",
      note,
    ]];
  }
  styleTableBody(sheet.getRange(`A5:F${4 + stressRows.length}`));
  styleFormula(sheet.getRange(`D5:D${4 + stressRows.length}`));
  sheet.getRange(`C5:D${4 + stressRows.length}`).format.numberFormat =
    '"£"#,##0;[Red]("£"#,##0);-';

  const connectStart = 8 + stressRows.length;
  applySection(
    sheet,
    `A${connectStart}:F${connectStart}`,
    "Stripe Connect current destination-charge sensitivity",
  );
  sheet.getRange(`A${connectStart + 1}:F${connectStart + 1}`).values = [[
    "Locations",
    "Studio GMV",
    "Card processing",
    "Connect account/payout",
    "Loss reserve",
    "Total platform exposure",
  ]];
  applyHeader(sheet.getRange(`A${connectStart + 1}:F${connectStart + 1}`));
  for (let index = 0; index < locations.length; index += 1) {
    const row = connectStart + 2 + index;
    const stress = stripeConnectStress(locations[index]);
    sheet.getRange(`A${row}:F${row}`).values = [[
      stress.locations,
      stress.gmv,
      stress.processing,
      stress.connect,
      stress.reserve,
      stress.total,
    ]];
  }
  styleTableBody(
    sheet.getRange(
      `A${connectStart + 2}:F${connectStart + 1 + locations.length}`,
    ),
  );
  sheet
    .getRange(
      `B${connectStart + 2}:F${connectStart + 1 + locations.length}`,
    )
    .format.numberFormat = '"£"#,##0';

  const vatStart = connectStart + locations.length + 4;
  applySection(sheet, `A${vatStart}:F${vatStart}`, "Revenue and collection sensitivities");
  sheet.getRange(`A${vatStart + 1}:F${vatStart + 5}`).values = [
    ["Sensitivity", "£500 invoice", "Net revenue/location", "Stripe fee/location", "Margin impact", "Notes"],
    ["£500 plus VAT, Bacs/card mix", 600, 500, 9.24, "Base", "Headline convention."],
    ["£500 VAT-inclusive, Bacs/card mix", 500, 416.67, 8.20, "Material reduction", "Net revenue is £416.67 before credits/bad debt."],
    ["£500 plus VAT, 100% UK cards", 600, 500, 13.4, "Higher collection cost", "1.5% + 20p plus Billing 0.7%."],
    ["£500 plus VAT, 100% Bacs", 600, 500, 8.2, "Lower collection cost", "Bacs processing cap plus Billing 0.7%."],
  ];
  applyHeader(sheet.getRange(`A${vatStart + 1}:F${vatStart + 1}`));
  styleTableBody(sheet.getRange(`A${vatStart + 2}:F${vatStart + 5}`));
  sheet
    .getRange(`B${vatStart + 2}:D${vatStart + 5}`)
    .format.numberFormat = '"£"0.00';

  setColumnWidths(sheet, {
    A: 44,
    B: 16,
    C: 20,
    D: 18,
    E: 22,
    F: 72,
  });
  sheet.freezePanes.freezeRows(4);
}

function buildInventory(sheet) {
  applyTitle(
    sheet,
    "A1:I1",
    "Third-party application inventory",
    "Live, target, dormant and catalogue-only software are deliberately separated.",
  );
  sheet.getRange("A4:I4").values = [[
    "Application",
    "Purpose",
    "Code / lifecycle status",
    "Primary payer",
    "Commercial treatment",
    "Can customer offset?",
    "Model treatment",
    "Confidence",
    "Cost / risk note",
  ]];
  applyHeader(sheet.getRange("A4:I4"));
  sheet.getRange(`A5:I${4 + inventoryRows.length}`).values = inventoryRows;
  styleTableBody(sheet.getRange(`A5:I${4 + inventoryRows.length}`));
  sheet
    .getRange(`C5:C${4 + inventoryRows.length}`)
    .conditionalFormats.add("containsText", {
      text: "risk",
      format: { fill: COLORS.lightRed, font: { color: COLORS.red, bold: true } },
    });
  sheet
    .getRange(`C5:C${4 + inventoryRows.length}`)
    .conditionalFormats.add("containsText", {
      text: "Target",
      format: { fill: COLORS.lightAmber, font: { color: COLORS.amber } },
    });
  sheet
    .getRange(`C5:C${4 + inventoryRows.length}`)
    .conditionalFormats.add("containsText", {
      text: "Live central",
      format: { fill: COLORS.lightGreen, font: { color: COLORS.green } },
    });
  setColumnWidths(sheet, {
    A: 31,
    B: 24,
    C: 28,
    D: 21,
    E: 30,
    F: 20,
    G: 32,
    H: 13,
    I: 64,
  });
  sheet.freezePanes.freezeRows(4);
  sheet.freezePanes.freezeColumns(1);
}

function buildDecisions(sheet) {
  applyTitle(
    sheet,
    "A1:H1",
    "Risks and decisions",
    "Items that can invalidate the headline model or require stakeholder approval.",
  );
  sheet.getRange("A4:H4").values = [[
    "ID",
    "Decision",
    "Question / requirement",
    "Recommended position",
    "Required by",
    "Owner",
    "Status",
    "Severity",
  ]];
  applyHeader(sheet.getRange("A4:H4"));
  sheet.getRange(`A5:H${4 + decisionRows.length}`).values = decisionRows;
  styleTableBody(sheet.getRange(`A5:H${4 + decisionRows.length}`));
  sheet
    .getRange(`H5:H${4 + decisionRows.length}`)
    .conditionalFormats.add("containsText", {
      text: "Critical",
      format: { fill: COLORS.lightRed, font: { color: COLORS.red, bold: true } },
    });
  sheet
    .getRange(`H5:H${4 + decisionRows.length}`)
    .conditionalFormats.add("containsText", {
      text: "High",
      format: { fill: COLORS.lightAmber, font: { color: COLORS.amber, bold: true } },
    });

  const row = 8 + decisionRows.length;
  applySection(sheet, `A${row}:H${row}`, "Evidence required to replace estimates");
  sheet.getRange(`A${row + 1}:H${row + 9}`).values = [
    ["Evidence", "Window", "Owner", "Replaces", "Minimum breakdown", "Control", "Output", "Status"],
    ["Vendor invoices", "30-90 days", "Finance", "Public list price", "Plan, unit, overage, tax, FX", "Tie to GL/cash", "Actual unit rates", "Required"],
    ["Vercel usage export", "30-90 days", "Engineering", "Request/CPU/memory assumptions", "Prod/preview/functions/transfer", "Environment tags", "Cost per workload", "Required"],
    ["Database metrics", "30-90 days + load test", "Engineering", "Compute/storage/egress tier", "CPU, memory, connections, IOPS, table growth", "PITR/DR test", "Sizing curve", "Required"],
    ["Inngest usage", "30-90 days", "Engineering", "Run/step/retry assumptions", "Function, step, event, concurrency", "Baseline vs tenant work", "Execution curve", "Required"],
    ["Communications reconciliation", "Monthly", "Finance + Engineering", "Resend/Twilio estimates", "Provider unit, ledger, customer invoice, cash", "One-to-one reconciliation", "Realised margin", "Required"],
    ["Stripe balance transactions", "Test + production", "Finance + Engineering", "Connect liability", "Charge type, fee payer, application fee, refund, dispute", "Scenario test", "Recovery policy", "Required"],
    ["Sentry/PostHog usage", "30-90 days", "Engineering", "Telemetry/event assumptions", "Product and environment", "Budgets/filters", "Optimised forecast", "Required"],
    ["Studio cohort profiles", "Two materially different Studios", "Product", "Single blended usage case", "Members, messages, automations, imports, GMV", "Tenant isolation", "Cohort model", "Required"],
  ];
  applyHeader(sheet.getRange(`A${row + 1}:H${row + 1}`));
  styleTableBody(sheet.getRange(`A${row + 2}:H${row + 9}`));
  setColumnWidths(sheet, {
    A: 12,
    B: 31,
    C: 49,
    D: 50,
    E: 23,
    F: 25,
    G: 16,
    H: 13,
  });
  sheet.freezePanes.freezeRows(4);
}

function buildChecks(sheet) {
  applyTitle(
    sheet,
    "A1:G1",
    "Model checks",
    "PASS means formula structure and internal arithmetic reconcile; it does not turn estimates into vendor quotes.",
  );
  sheet.getRange("A4:G4").values = [[
    "Check",
    "Actual",
    "Expected",
    "Difference",
    "Tolerance",
    "Status",
    "Fix / note",
  ]];
  applyHeader(sheet.getRange("A4:G4"));
  const base100Row = scenarioExcelRow(100, "Base");
  const base1Row = scenarioExcelRow(1, "Base");
  const checkRows = [
    ["Base 100 current cost components", `='Scenario Model'!T${base100Row}`, `=SUM('Scenario Model'!O${base100Row},'Scenario Model'!R${base100Row}:'Scenario Model'!S${base100Row})`, null, 0.01, null, "Core + communications + SaaS collection"],
    ["Base 100 contribution", `='Scenario Model'!U${base100Row}`, `='Scenario Model'!E${base100Row}-'Scenario Model'!T${base100Row}`, null, 0.01, null, "Net SaaS revenue less current tech cost"],
    ["Base 100 after-offset contribution", `='Scenario Model'!AA${base100Row}`, `='Scenario Model'!Y${base100Row}-'Scenario Model'!Z${base100Row}`, null, 0.01, null, "Revenue including usage charge less all technology cost"],
    ["Base 1 Inngest exceeds Hobby", `='Scenario Model'!AF${base1Row}`, `='Assumptions'!$B$12`, null, 0, null, "Expected is a lower bound; actual includes customer work"],
    ["Scenario row count", results.length, 24, null, 0, null, "8 location counts x 3 usage cases"],
    ["All revenue non-negative", `=MIN('Scenario Model'!E5:E28)`, 0, null, 0, null, "Must be >= 0"],
    ["All costs non-negative", `=MIN('Scenario Model'!G5:T28)`, 0, null, 0, null, "Must be >= 0"],
    ["After-offset charge covers target", `=('Scenario Model'!W${base100Row}-'Scenario Model'!R${base100Row}-'Scenario Model'!X${base100Row})/'Scenario Model'!W${base100Row}`, `='Assumptions'!$B$9`, null, 0.0001, null, "Add-on contribution after collection fee"],
  ];
  for (let index = 0; index < checkRows.length; index += 1) {
    const row = 5 + index;
    const [label, actual, expected, , tolerance, , note] = checkRows[index];
    sheet.getRange(`A${row}`).values = [[label]];
    if (typeof actual === "string" && actual.startsWith("=")) {
      sheet.getRange(`B${row}`).formulas = [[actual]];
    } else {
      sheet.getRange(`B${row}`).values = [[actual]];
    }
    if (typeof expected === "string" && expected.startsWith("=")) {
      sheet.getRange(`C${row}`).formulas = [[expected]];
    } else {
      sheet.getRange(`C${row}`).values = [[expected]];
    }
    if (label === "Base 1 Inngest exceeds Hobby") {
      sheet.getRange(`D${row}`).formulas = [[`=B${row}-C${row}`]];
      sheet.getRange(`F${row}`).formulas = [[`=IF(B${row}>C${row},"PASS","FAIL")`]];
    } else if (label === "All revenue non-negative" || label === "All costs non-negative") {
      sheet.getRange(`D${row}`).formulas = [[`=MIN(0,B${row})`]];
      sheet.getRange(`F${row}`).formulas = [[`=IF(B${row}>=C${row},"PASS","FAIL")`]];
    } else {
      sheet.getRange(`D${row}`).formulas = [[`=B${row}-C${row}`]];
      sheet.getRange(`F${row}`).formulas = [[`=IF(ABS(D${row})<=E${row},"PASS","FAIL")`]];
    }
    sheet.getRange(`E${row}`).values = [[tolerance]];
    sheet.getRange(`G${row}`).values = [[note]];
  }
  styleTableBody(sheet.getRange(`A5:G${4 + checkRows.length}`));
  styleFormula(sheet.getRange(`B5:F${4 + checkRows.length}`));
  sheet
    .getRange(`F5:F${4 + checkRows.length}`)
    .conditionalFormats.add("containsText", {
      text: "PASS",
      format: { fill: COLORS.lightGreen, font: { color: COLORS.green, bold: true } },
    });
  sheet
    .getRange(`F5:F${4 + checkRows.length}`)
    .conditionalFormats.add("containsText", {
      text: "FAIL",
      format: { fill: COLORS.lightRed, font: { color: COLORS.red, bold: true } },
    });
  const statusRow = 7 + checkRows.length;
  applySection(sheet, `A${statusRow}:G${statusRow}`, "Overall model status");
  sheet.getRange(`A${statusRow + 1}:E${statusRow + 2}`).merge();
  sheet.getRange(`A${statusRow + 1}`).values = [[
    "The workbook is internally reconciled when every check above is PASS. Quote-required and low-confidence items remain visible in the Scenario Model and Risks & Decisions sheets.",
  ]];
  sheet.getRange(`A${statusRow + 1}:E${statusRow + 2}`).format = {
    fill: COLORS.lightBlue,
    font: { color: COLORS.ink, size: 10 },
    wrapText: true,
    verticalAlignment: "center",
  };
  sheet.getRange(`F${statusRow + 1}:G${statusRow + 2}`).merge();
  sheet.getRange(`F${statusRow + 1}`).formulas = [[
    `=IF(COUNTIF(F5:F${4 + checkRows.length},"FAIL")=0,"MODEL STATUS: PASS","MODEL STATUS: FAIL")`,
  ]];
  sheet.getRange(`F${statusRow + 1}:G${statusRow + 2}`).format = {
    fill: COLORS.lightGreen,
    font: { color: COLORS.green, bold: true, size: 13 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    borders: { preset: "outside", style: "medium", color: COLORS.green },
  };
  setColumnWidths(sheet, {
    A: 38,
    B: 19,
    C: 19,
    D: 16,
    E: 14,
    F: 20,
    G: 58,
  });
  sheet.freezePanes.freezeRows(4);
}

function buildSources(sheet) {
  applyTitle(
    sheet,
    "A1:G1",
    "Sources and audit trail",
    `Public pricing refreshed on ${AS_OF}. Replace list prices with invoices and signed quotes when available.`,
  );
  sheet.getRange("A4:G4").values = [[
    "Application",
    "Input / topic",
    "Source URL",
    "As of",
    "Source type",
    "Owner",
    "Audit note",
  ]];
  applyHeader(sheet.getRange("A4:G4"));
  const rows = sourceRows.map(([app, topic, url, note]) => [
    app,
    topic,
    url,
    AS_OF,
    "Official public source",
    "Finance / Engineering",
    note,
  ]);
  sheet.getRange(`A5:G${4 + rows.length}`).values = rows;
  styleTableBody(sheet.getRange(`A5:G${4 + rows.length}`));
  sheet.getRange(`C5:C${4 + rows.length}`).format.font = {
    color: COLORS.blue,
    underline: true,
    size: 9,
  };
  const logRow = 8 + rows.length;
  applySection(sheet, `A${logRow}:G${logRow}`, "Version log");
  sheet.getRange(`A${logRow + 1}:G${logRow + 3}`).values = [
    ["Version", "Date", "Change", "Prepared by", "Reviewed by", "Status", "Notes"],
    ["v1.0", AS_OF, "Full rebuild from repository audit and official public rates", "Codex", "Stakeholder review pending", "Draft for planning", "Corrects Connect, Inngest, communications and Sentry treatment."],
    ["Next", "", "Replace estimates with 30-90 day actual usage and vendor invoices", "Finance + Engineering", "Board / leadership", "Required", "Do not use for contractual commitments before refresh."],
  ];
  applyHeader(sheet.getRange(`A${logRow + 1}:G${logRow + 1}`));
  styleTableBody(sheet.getRange(`A${logRow + 2}:G${logRow + 3}`));
  setColumnWidths(sheet, {
    A: 25,
    B: 34,
    C: 76,
    D: 14,
    E: 24,
    F: 24,
    G: 65,
  });
  sheet.freezePanes.freezeRows(4);
}

function markdownTable(headers, rows, alignRight = new Set()) {
  const header = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers
    .map((_, index) => (alignRight.has(index) ? "---:" : "---"))
    .join(" | ")} |`;
  const body = rows
    .map((row) => `| ${row.map((value) => String(value).replaceAll("|", "\\|")).join(" | ")} |`)
    .join("\n");
  return `${header}\n${separator}\n${body}`;
}

function buildMarkdown() {
  const baseRows = locations.map((loc) => {
    const r = scenario(loc, "Base");
    return [
      NUM.format(loc),
      GBP.format(r.netRevenue),
      GBP.format(r.coreGbp),
      GBP.format(r.communicationsGbp),
      GBP.format(r.stripeCollectionGbp),
      GBP.format(r.currentCostGbp),
      PCT.format(r.currentMargin),
      GBP.format(r.communicationsChargeGbp),
      PCT.format(r.afterOffsetMargin),
    ];
  });
  const rangeRows = locations.map((loc) => {
    const low = scenario(loc, "Low");
    const base = scenario(loc, "Base");
    const high = scenario(loc, "High");
    return [
      NUM.format(loc),
      `${GBP.format(low.currentCostGbp)} / ${GBP.format(base.currentCostGbp)} / ${GBP.format(high.currentCostGbp)}`,
      `${PCT.format(low.currentMargin)} / ${PCT.format(base.currentMargin)} / ${PCT.format(high.currentMargin)}`,
      `${GBP.format(low.totalPerLocationGbp)} / ${GBP.format(base.totalPerLocationGbp)} / ${GBP.format(high.totalPerLocationGbp)}`,
    ];
  });
  const appRows = [
    ["Vercel", ...locations.map((loc) => GBP.format(scenario(loc).vercelGbp))],
    ["Database", ...locations.map((loc) => GBP.format(scenario(loc).supabaseGbp))],
    ["Inngest", ...locations.map((loc) => GBP.format(scenario(loc).inngestGbp))],
    ["UploadThing", ...locations.map((loc) => GBP.format(scenario(loc).uploadThingGbp))],
    ["Upstash", ...locations.map((loc) => GBP.format(scenario(loc).upstashGbp))],
    ["Sentry", ...locations.map((loc) => GBP.format(scenario(loc).sentryGbp))],
    ["PostHog", ...locations.map((loc) => GBP.format(scenario(loc).posthogGbp))],
    ["Commercial maps", ...locations.map((loc) => GBP.format(scenario(loc).mapsGbp))],
    ["Core subtotal", ...locations.map((loc) => `**${GBP.format(scenario(loc).coreGbp)}**`)],
    ["Resend", ...locations.map((loc) => GBP.format(scenario(loc).resendGbp))],
    ["Twilio", ...locations.map((loc) => GBP.format(scenario(loc).twilioGbp))],
    ["Communications subtotal", ...locations.map((loc) => `**${GBP.format(scenario(loc).communicationsGbp)}**`)],
    ["Stripe SaaS collection", ...locations.map((loc) => GBP.format(scenario(loc).stripeCollectionGbp))],
    ["Total technology cost", ...locations.map((loc) => `**${GBP.format(scenario(loc).currentCostGbp)}**`)],
  ];
  const connectRows = locations.map((loc) => {
    const c = stripeConnectStress(loc);
    return [
      NUM.format(loc),
      GBP.format(c.gmv),
      GBP.format(c.processing),
      GBP.format(c.connect),
      GBP.format(c.reserve),
      `**${GBP.format(c.total)}**`,
    ];
  });
  const inventoryMd = inventoryRows.map((row) => [
    row[0],
    row[2],
    row[3],
    row[4],
    row[6],
    row[7],
  ]);
  const ownershipMd = ownershipRows.map((row) => [
    row[0],
    row[1],
    row[2],
    row[3],
    row[4],
    row[7],
  ]);
  const stressMd = stressRows.map(([name, loc, cost, note]) => [
    name,
    NUM.format(loc),
    GBP.format(cost),
    GBP.format(cost * 12),
    note,
  ]);
  const decisionsMd = decisionRows.map((row) => [
    row[0],
    row[1],
    row[3],
    row[5],
    row[6],
    row[7],
  ]);

  return `# Aurea Third-Party Technology Cost Report

**Stakeholder planning report**

**As of:** 18 July 2026  
**Commercial assumption:** £500 per Studio location per month, **excluding VAT**  
**Planning FX:** USD 1 = GBP 0.75  
**Status:** planning model, not a vendor quote or audited forecast

## 1. Executive conclusion

The model supports four distinct conclusions:

1. **Core platform software is not the main unit-economics risk.** In the base case, shared hosting, database, durable jobs, storage, observability, analytics and commercial maps cost ${GBP2.format(scenario(100).corePerLocationGbp)} per location at 100 locations.
2. **Managed communications must be sold as a funded usage add-on.** At base usage, Resend and Twilio cost ${GBP2.format(scenario(100).communicationsPerLocationGbp)} per location at 100 locations. Aurea already records a communications usage ledger, but no current code posts those customer charges to Stripe invoices or meters. The model therefore shows both unrecovered current COGS and a target customer charge.
3. **The current Stripe Connect funds flow is not £0 to Aurea.** The code uses destination charges. Stripe therefore debits Aurea for processing fees and exposes the platform to refunds, disputes and negative balances. Direct charges are the recommended target for a SaaS relationship in which the Studio is the merchant and fee payer.
4. **Several apparent free tiers are not production-appropriate.** Inngest Pro is required before the first Studio because the code creates approximately 219,720 scheduled function runs and at least **602,880 executions** per month after statically observable steps and the minutely delivery dispatch path. Vercel and production PostgreSQL are modelled on commercial paid plans. UploadThing is paid when private/regional documents are enabled. Sentry can only be forecast after production sampling and privacy controls are fixed.

The headline metric in this report is **technology contribution margin**, not accounting gross margin. It excludes payroll, customer support, implementation, insurance, compliance, legal, accounting and other people/operating costs.

## 2. Headline base-case economics

${markdownTable(
  ["Locations", "Net SaaS revenue", "Core software", "Managed comms COGS", "Stripe SaaS collection", "Current tech cost", "Current technology margin", "Target comms charge", "After-offset margin"],
  baseRows,
  new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]),
)}

Interpretation:

- Net SaaS revenue is £500 per location less the base 1% planning allowance for failed collections, credits and bad debt.
- Stripe collection assumes each £500 net invoice becomes £600 including 20% VAT, with 80% Bacs Direct Debit and 20% UK cards, plus Stripe Billing PAYG at 0.7%.
- “Current tech cost” includes communications provider COGS but **no communications add-on revenue**, because cash collection is not implemented.
- “Target comms charge” prices provider COGS to produce a 25% add-on contribution margin after a 2.2% collection allowance. It is a commercial target, not current revenue.
- Quote-required scenarios retain a numerical planning placeholder, but their confidence is low and they must not be used as contractual commitments.

## 3. Low, base and high range at every location count

Every customer count has three independent usage profiles. The model does not assume that a larger Studio necessarily has higher intensity, and it does not conflate location count with maturity.

${markdownTable(
  ["Locations", "Monthly tech cost: Low / Base / High", "Technology margin: Low / Base / High", "Cost/location: Low / Base / High"],
  rangeRows,
  new Set([0, 1, 2, 3]),
)}

### Usage cases

${markdownTable(
  ["Driver per location/month", "Low", "Base", "High"],
  [
    ["Active members", "300", "750", "1,500"],
    ["App/API requests", "150,000", "500,000", "1,500,000"],
    ["Customer workflow runs", "2,000", "10,000", "25,000"],
    ["Durable steps per run", "3", "5", "7"],
    ["Product analytics events", "10,000", "40,000", "100,000"],
    ["Redis commands", "50,000", "200,000", "750,000"],
    ["Sentry errors / spans / replays", "100 / 25k / 25", "500 / 100k / 100", "2,000 / 500k / 300"],
    ["Transactional emails", "1,000", "6,000", "15,000"],
    ["Outbound SMS segments", "250", "1,000", "3,000"],
    ["Inbound SMS segments", "50", "200", "500"],
    ["Voice minutes", "25", "100", "300"],
    ["Private storage", "1 GB", "2 GB", "10 GB"],
    ["Map loads", "1,000", "3,000", "10,000"],
    ["Forecast headroom", "10%", "20%", "30%"],
    ["Bad debt/credits", "0.5%", "1.0%", "3.0%"],
  ],
  new Set([1, 2, 3]),
)}

## 4. Application-by-application base-case cost

${markdownTable(
  ["Application", ...locations.map((loc) => `${NUM.format(loc)} loc`)],
  appRows,
  new Set([...Array(9).keys()].slice(1)),
)}

### 4.1 Vercel

- **Status:** live central platform cost.
- **Plan rule:** Pro from launch because Aurea is commercial. Hobby is not a production assumption.
- **Model driver:** developer seats, requests, active CPU, memory and transfer, with one usage credit.
- **Customer offset:** included in the £500 subscription, not separately recharged.
- **Upgrade trigger:** contractual SLA/security requirements or measured workload beyond the public Pro model.
- **Evidence required:** 30-90 days of environment-tagged Vercel usage and invoice data.

### 4.2 PostgreSQL / Supabase planning proxy

- **Status:** PostgreSQL is live; Supabase is a planning proxy until the production database contract is confirmed. The code’s generic \`DATABASE_URL\` does not prove the deployed vendor.
- **Plan rule:** no production Free tier. The model uses Pro, compute credit, disk and egress, plus paid non-production projects in Base/High cases.
- **Customer offset:** included core cost.
- **Risks:** 243-table schema, event/receipt/execution growth, PITR, replicas, connection limits, backups, staging and egress.
- **Upgrade trigger:** measured CPU, memory, IOPS, connection saturation, retention growth and recovery objectives.

### 4.3 Inngest

- **Status:** live central durable job and workflow provider.
- **Plan rule:** Pro from day one. Hobby includes 50,000 executions, but the current code has approximately 219,720 scheduled runs and at least 602,880 minimum executions per month before tenant work.
- **Billing definition:** one function run plus every durable step; retries and event fan-out add more.
- **Customer offset:** included core cost. Extremely automation-heavy usage can justify plan limits or a premium automation add-on.
- **Quote trigger:** high execution volume, concurrency, events, span data, users/workers or enterprise support.

### 4.4 UploadThing

- **Status:** live for logos, waivers, invoices, instructor documents and imports.
- **Plan rule:** paid/private plan when document features or regional controls are enabled. Free is valid only before those production requirements exist.
- **Customer offset:** baseline allowance included; exceptional storage/import burst should be metered.
- **Risks:** retention, egress, private access, data residency and permissive Mindbody import sizes.

### 4.5 Upstash Redis

- **Status:** live cache/rate-limit infrastructure.
- **Plan rule:** Free only while within 500k commands/256 MB and while loss/availability impact is acceptable. PAYG is used after that. Prod Pack is triggered by resilience/compliance, not purely volume.
- **Customer offset:** included core cost.

### 4.6 Sentry

- **Status:** live, but current production configuration is not cost-safe.
- **Observed configuration:** 100% trace sampling, logs enabled, console log/warn/error capture, 10% normal-session replay, 100% error-session replay, default PII enabled and AI inputs/outputs recorded.
- **Headline treatment:** Team/Business base, published error and log overage, plus explicit internal planning rates for spans and replays because the public page did not expose a stable unit rate for those surfaces in this audit.
- **Required action:** set sampling, inbound filters, spend caps, privacy redaction and retention before accepting the estimate. The current configuration stress is deliberately not presented as a precise vendor bill.

### 4.7 PostHog

- **Status:** live central product analytics.
- **Observed configuration:** user identification is active; anonymous autocapture is disabled and selected events are captured.
- **Headline treatment:** standard progressive product-event pricing after 1m free events.
- **Sensitivity:** the workbook separately calculates an upper bound using PostHog’s published identified-event starting rate. Confirm the actual billing mode before procurement.

### 4.8 Commercial maps

- **Status:** the UI currently uses public CARTO MapLibre styles. That should not be treated as a free commercial licence.
- **Headline treatment:** Mapbox GL JS commercial map-load pricing is modelled as a replacement: first 50k loads free, then published progressive bands.
- **Decision:** compare Mapbox, MapTiler and self-hosting, then replace the current style contract before commercial launch.

### 4.9 Resend

- **Status:** live managed email service.
- **Headline treatment:** transactional email plans only. No current Resend Contacts/Broadcasts API usage was found, so marketing-contact charges are **not** silently added.
- **Domain constraint:** Pro supports ten domains; more branded Studio domains require Scale even when email volume is low.
- **Enterprise trigger:** 3m+ emails/month or other contractual/deliverability requirements. The model uses the last published marginal rate plus 15% solely as a placeholder and marks the result quote-required.
- **Customer offset:** managed email should be a funded/metered add-on. The current ledger does not collect cash.

### 4.10 Twilio

- **Status:** live managed SMS, voice and number provider.
- **List-price inputs:** outbound UK SMS $0.056/segment, inbound $0.0075/segment, UK mobile number $2.50/month, and a $0.021/minute voice blend.
- **Not fully captured by list price:** carrier, failed-message, international, regulatory, destination, recording and transcription charges.
- **Customer offset:** funded/metered add-on with limits. SMS must be billed by **segment**, not message.

### 4.11 Stripe Billing and SaaS collection

- **Status:** target architecture, not implemented in the current auth/billing flow.
- **Price assumption:** £500 per location **plus VAT**.
- **Collection mix:** 80% Bacs, 20% UK cards. At £600 collected, the weighted base cost is approximately £9.24 per location: £4.20 Billing PAYG plus weighted payment processing.
- **Contracted Billing plans:** compare published annual tiers only after validating eligibility and contract terms. The headline keeps 0.7% PAYG and does not use an unsupported £450-at-scale shortcut.
- **Still required:** subscription creation, location quantity changes, entitlements, raw/signature-verified webhooks, idempotency, dunning, credits, cancellations and finance reconciliation.

## 5. Stripe Connect: current and target economics

The current code creates **destination charges** using \`transfer_data.destination\` and optional application fees. Under Stripe’s documented funds flow, Stripe debits the platform for processing fees and destination-charge refunds/chargebacks. This is a separate cost surface from collecting Aurea’s £500 SaaS subscription.

### Illustrative current-state exposure

Assumptions: £30,000 monthly Studio GMV per location, £75 average ticket, four payouts, UK-card processing, published Connect account/payout fees and a 0.1% internal loss reserve.

${markdownTable(
  ["Locations", "Studio GMV", "Card processing", "Connect account/payout", "Loss reserve", "Total platform exposure"],
  connectRows,
  new Set([0, 1, 2, 3, 4, 5]),
)}

This exposure is **not** in the main £500 subscription table because it should either:

- move to Studio-paid direct charges, which is the recommended SaaS target; or
- be recovered through an application fee that covers processing, Connect fees, refunds/disputes, negative balances, support and Aurea’s platform margin.

Until one of those policies is implemented and reconciled, “Stripe Connect costs Aurea £0” is not a valid statement.

## 6. What can be offset by customers

${markdownTable(
  ["Cost surface", "Contracting party", "Cash payer", "Invoice mechanism", "Recovery target", "State"],
  ownershipMd,
)}

### Proposed managed-usage pricing logic

The exact break-even sell price is:

\`provider cost / (1 - target contribution margin - collection rate)\`

At a 25% target contribution and 2.2% collection allowance, the multiplier is **${(1 / (1 - 0.25 - 0.022)).toFixed(3)}x provider cost**. Examples:

- UK outbound SMS cost ${GBP2.format(rates.twilio.outboundSms * general.usdToGbp)} per segment; exact recovery price ${GBP2.format(rates.twilio.outboundSms * general.usdToGbp / 0.728)}; proposed rate £0.06 plus unpriced carrier/international fees.
- UK mobile number cost ${GBP2.format(rates.twilio.ukMobileNumber * general.usdToGbp)}; exact recovery price ${GBP2.format(rates.twilio.ukMobileNumber * general.usdToGbp / 0.728)}; proposed rate £3/month.
- Blended voice cost ${GBP2.format(rates.twilio.blendedVoiceMinute * general.usdToGbp)} per minute; proposed planning rate £0.025/minute, subject to destination mix.
- Transactional email overage should allocate both marginal send volume and fixed/domain plan cost; a simple per-email rate alone can under-recover Resend Scale.
- Exceptional private storage should use an included allowance plus a minimum overage bundle rather than penny-level invoices.

Required billing controls are: funded balance or approved credit limit, idempotent ledger-to-Stripe export, VAT/markup policy, per-channel spend caps, customer-visible usage, dunning/non-payment rules and provider-ledger-invoice-cash reconciliation.

## 7. Stress tests

${markdownTable(
  ["Stress case", "Locations", "Monthly exposure", "Annualised", "Interpretation"],
  stressMd,
  new Set([1, 2, 3]),
)}

These are not additive. They show which workload can break the base case:

- **Email/SMS/voice heavy:** communications dominates and must be funded by the Studio.
- **Automation heavy:** Inngest’s execution definition, concurrency and enterprise gates matter more than raw workflow-run count.
- **Import/storage burst:** a single oversized import can create a temporary storage/egress spike.
- **Analytics heavy:** event taxonomy and identified-event billing mode must be governed.
- **Connect high GMV:** platform liability grows with Studio GMV, not Aurea SaaS revenue.
- **Prelaunch:** paid commercial infrastructure exists before revenue; the model estimates about ${GBP.format(stressRows[0][2])}/month before unpriced tools and people.

## 8. VAT, cash and commercial sensitivities

### £500 plus VAT versus VAT-inclusive

- **Report convention:** £500 net revenue, £100 VAT, £600 customer cash invoice.
- **If £500 is VAT-inclusive:** net revenue is £416.67 per location before discounts, credits and bad debt. That reduces technology contribution by £83.33 per location even though most software costs do not fall.

### Collection mix

- 100% UK cards on a £600 invoice: approximately £13.40/location including Billing PAYG.
- 100% Bacs: approximately £8.20/location including Billing PAYG.
- Base 80% Bacs / 20% cards: approximately £9.24/location.
- Failed attempts, disputes, refunds and non-UK payment methods require actual Stripe data.

### FX

Most core vendors are modelled in USD while SaaS revenue is GBP. At 100 base-case locations, a move from 0.75 to 0.80 GBP/USD increases the USD-priced cost base by about 6.7%. The workbook contains 0.70/0.75/0.80 sensitivities.

### Annual contracts and discounts

The model does not assume discounts that have not been signed. Annual commitments should be evaluated against:

- forecast confidence and downside risk;
- minimum spend and overage definitions;
- FX/payment terms;
- support/SLA/data-residency controls;
- exit, portability and data-export terms;
- whether the quoted savings exceed the cost of lost flexibility.

## 9. Full software inventory

${markdownTable(
  ["Application", "Lifecycle status", "Primary payer", "Commercial treatment", "Model treatment", "Confidence"],
  inventoryMd,
)}

Important classifications:

- **Live central:** committed or usage-driven Aurea cost.
- **Live tenant-owned/BYOK:** the feature is integrated, but the Studio contracts and pays the provider.
- **Target:** needed for the intended commercial model but not yet implemented or contracted.
- **Implemented but inactive:** £0 base; becomes relevant only if selected.
- **Catalogue only:** no central spend until a real adapter and contract exist.
- **Removed/deprecated:** £0, with cleanup work if stale configuration remains.
- **Not evidenced:** \`TBC\`; the codebase cannot prove the plan or payer.

## 10. Decision register

${markdownTable(
  ["ID", "Decision", "Recommended position", "Owner", "Status", "Severity"],
  decisionsMd,
)}

## 11. Evidence plan and confidence

### High-confidence elements

- Which vendors and integrations exist in current code.
- Stripe destination-charge implementation.
- Communications usage ledger exists but Stripe collection export was not found.
- Inngest schedule frequency and static durable-step baseline.
- Sentry/PostHog current configuration.
- Public list-price definitions and plan limits cited below.

### Medium-confidence elements

- Low/Base/High per-location operating drivers.
- Vercel and PostgreSQL compute sizing.
- Voice destination blend.
- Map-load and event volume.
- Database/storage retention.

### Low-confidence / quote-required

- Enterprise Resend, Inngest, maps, database or support pricing.
- Sentry span/replay unit rates until a live calculator export or quote is attached.
- Production database vendor and contract.
- GitHub/CI, DNS/registrar, status/uptime, security tooling and premium support not evidenced in source or invoices.
- Current destination-charge loss experience.

### Replace estimates with these controls

1. Collect 30-90 days of vendor invoices and product usage.
2. Export Vercel usage by production/preview and workload.
3. Benchmark PostgreSQL query load, storage growth, connections, IOPS and restore objectives.
4. Export Inngest function, step, retry, event and concurrency usage.
5. Reconcile Resend/Twilio provider invoices to the communications ledger, customer invoice and cash.
6. Run Stripe test-mode balance-transaction scenarios for direct/destination charges, refunds and disputes.
7. Apply Sentry budgets/privacy controls, then export errors/logs/spans/replays by environment.
8. Validate PostHog billing mode and event taxonomy.
9. Test at least two materially different Studio configurations, for example a low-communication boutique Studio and a high-automation/high-SMS multi-location operator.

## 12. Explicit exclusions

The technology contribution margin excludes:

- salaries, contractors, customer success, support and implementation;
- legal, tax, audit, accounting, insurance and compliance;
- office, devices and general corporate software not evidenced here;
- Studio ad spend and tenant-owned SaaS contracts;
- refunds/credits/bad debt beyond the stated scenario assumption;
- supplier VAT recoverability and corporation tax;
- financing and working-capital cost;
- unquoted enterprise support, security and SLA contracts;
- new AI credits, recording/transcription or WhatsApp usage until commercially approved.

## 13. Sources

${sourceRows.map(([app, topic, url, note]) => `- **${app} — ${topic}:** ${url} — ${note}`).join("\n")}

## 14. Repository evidence reviewed

- \`src/features/stripe-connect/lib/destination-charge.ts\`
- \`src/features/studio/server/billing-router.ts\`
- \`src/features/studio/server/cancellation-collection-service.ts\`
- \`src/features/communications/server/\`
- \`src/features/communications/components/communications-usage.tsx\`
- \`src/inngest/functions/\`
- \`src/features/delivery/server/inngest/functions.ts\`
- \`src/features/communications/server/inngest-functions.ts\`
- \`src/app/api/uploadthing/core.ts\`
- \`sentry.server.config.ts\`, \`sentry.edge.config.ts\`, \`src/instrumentation-client.ts\`
- \`src/lib/posthog/\`
- \`src/components/ui/map.tsx\`
- \`.env.example\`, \`package.json\`, \`src/lib/auth.ts\`

---

**Use with the editable workbook:** the workbook contains all 24 core scenarios, service-by-service costs, ownership policy, stress tests, Stripe Connect GMV sensitivity, rate cards, decisions, checks and source URLs. Any board or investor use should refresh the blue assumption cells with actual invoices and usage first.
`;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const workbook = buildWorkbook();
  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(WORKBOOK_PATH);
  await fs.writeFile(MODEL_JSON_PATH, JSON.stringify({ general, cases, results }, null, 2));
  await fs.writeFile(REPO_REPORT, buildMarkdown());

  const summaryInspection = await workbook.inspect({
    kind: "table",
    range: "Executive Summary!A1:L26",
    include: "values,formulas",
    tableMaxRows: 26,
    tableMaxCols: 12,
    maxChars: 12000,
  });
  const formulaErrors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: "final formula error scan",
  });
  const previewDir = path.join(OUTPUT_DIR, "workbook-previews");
  await fs.mkdir(previewDir, { recursive: true });
  const previewSheets = [
    "Executive Summary",
    "Assumptions",
    "Scenario Model",
    "Application Costs",
    "Customer Offset",
    "Rate Card",
    "Stress Tests",
    "Application Inventory",
    "Risks & Decisions",
    "Checks",
    "Sources",
  ];
  for (const sheetName of previewSheets) {
    const preview = await workbook.render({
      sheetName,
      autoCrop: "all",
      scale: 1,
      format: "png",
    });
    const previewBytes = new Uint8Array(await preview.arrayBuffer());
    await fs.writeFile(
      path.join(
        previewDir,
        `${sheetName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.png`,
      ),
      previewBytes,
    );
  }
  console.log(summaryInspection.ndjson);
  console.log(formulaErrors.ndjson);
  console.log(`WORKBOOK=${WORKBOOK_PATH}`);
  console.log(`REPORT=${REPO_REPORT}`);
  console.log(`MODEL_JSON=${MODEL_JSON_PATH}`);
}

await main();
