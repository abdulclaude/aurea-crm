import type { PreloaderStep } from "@/components/onboarding-preloader";

export const MINDBODY_IMPORT_PRELOADER_STEPS: PreloaderStep[] = [
  {
    title: "Uploading Mindbody export",
    description:
      "Your ZIP is being uploaded intact so Aurea can inspect every CSV, client file, contract signature, and sale image inside it.",
  },
  {
    title: "Creating your studio",
    description:
      "Your workspace is being created without a placeholder location, so imported Mindbody locations can become the source of truth.",
  },
  {
    title: "Starting the import",
    description:
      "The import job is queued and preparing the archive for structured mapping.",
  },
  {
    title: "Importing locations",
    description:
      "Studio locations from Mindbody are being created or matched before member data is attached.",
  },
  {
    title: "Importing client data",
    description:
      "Members, prospects, tags, notes, relationships, and notification preferences are being mapped.",
  },
  {
    title: "Importing catalog data",
    description:
      "Products, instructors, contracts, pricing options, and memberships are being organized.",
  },
  {
    title: "Importing attendance",
    description:
      "Visits, reservations, bookings, classes, and check-ins are being connected to clients and locations.",
  },
  {
    title: "Importing revenue",
    description:
      "Payments, client sales, account balances, fees, tips, and imported product revenue are being reconciled.",
  },
  {
    title: "Importing documents",
    description:
      "Client files, contract signatures, and sale images are being linked back to the right records.",
  },
  {
    title: "Finalizing your workspace",
    description:
      "Aurea is setting your active location, saving review notes for unmapped fields, and preparing your dashboard.",
  },
  {
    title: "Opening your dashboard",
    description:
      "Your Mindbody import is complete. The dashboard is loading with your imported studio context.",
  },
  {
    title: "Import needs attention",
    description:
      "The import stopped before completion. Aurea is opening the import page so you can review the job details.",
  },
];

type ImportJobProgress = {
  status: string;
  entityCounts: unknown;
  entityProgress: unknown;
};

const PHASES = {
  upload: 0,
  createStudio: 1,
  queued: 2,
  locations: 3,
  clients: 4,
  catalog: 5,
  attendance: 6,
  revenue: 7,
  documents: 8,
  finalizing: 9,
  complete: 10,
  failed: 11,
} as const;

const ENTITY_GROUPS: Array<{ phase: number; keys: string[] }> = [
  { phase: PHASES.locations, keys: ["locations"] },
  {
    phase: PHASES.clients,
    keys: [
      "clients",
      "clientNotifications",
      "clientTypes",
      "indexes",
      "notes",
      "contactLogs",
      "appointmentNotes",
      "relationships",
      "clientRelationships",
    ],
  },
  {
    phase: PHASES.catalog,
    keys: [
      "trainers",
      "products",
      "contracts",
      "clientAutopayContracts",
      "pricingOptions",
      "clientPricingOptions",
    ],
  },
  {
    phase: PHASES.attendance,
    keys: ["visits", "visitData", "reservationData"],
  },
  {
    phase: PHASES.revenue,
    keys: ["payments", "clientSales", "accountBalances"],
  },
  { phase: PHASES.documents, keys: ["documents"] },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numericValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function countFor(entityCounts: unknown, key: string): number {
  if (!isRecord(entityCounts)) return 0;
  return numericValue(entityCounts[key]);
}

function progressFor(
  entityProgress: unknown,
  key: string,
): { total: number; completed: number } {
  if (!isRecord(entityProgress)) return { total: 0, completed: 0 };
  const entry = entityProgress[key];
  if (!isRecord(entry)) return { total: 0, completed: 0 };

  return {
    total: numericValue(entry.total),
    completed: numericValue(entry.processed) + numericValue(entry.failed),
  };
}

function groupProgress(
  job: ImportJobProgress,
  keys: string[],
): { total: number; completed: number } {
  return keys.reduce(
    (acc, key) => {
      const progress = progressFor(job.entityProgress, key);
      const total = Math.max(progress.total, countFor(job.entityCounts, key));
      return {
        total: acc.total + total,
        completed: acc.completed + progress.completed,
      };
    },
    { total: 0, completed: 0 },
  );
}

export function mindbodyPreloaderStepForJob(job: ImportJobProgress): number {
  if (job.status === "FAILED" || job.status === "ROLLED_BACK") {
    return PHASES.failed;
  }
  if (job.status === "COMPLETED") {
    return PHASES.complete;
  }
  if (job.status === "PENDING") {
    return PHASES.queued;
  }
  if (
    !isRecord(job.entityCounts) ||
    Object.keys(job.entityCounts).length === 0
  ) {
    return PHASES.queued;
  }

  for (const group of ENTITY_GROUPS) {
    const progress = groupProgress(job, group.keys);
    if (progress.total > 0 && progress.completed < progress.total) {
      return group.phase;
    }
  }

  return PHASES.finalizing;
}

export const MINDBODY_PRELOADER_PHASES = PHASES;
