export const equipmentOptions = [
  { value: "MAT", label: "Mats" },
  { value: "REFORMER", label: "Reformers" },
  { value: "BIKE", label: "Bikes" },
  { value: "STRENGTH", label: "Strength stations" },
  { value: "OPEN", label: "Open spots" },
] as const;

export const layoutPatternOptions = [
  { value: "GRID", label: "Even grid" },
  { value: "STAGGERED", label: "Staggered rows" },
  { value: "CENTER_AISLE", label: "Centre aisle" },
  { value: "ARC", label: "Instructor arc" },
] as const;

export const densityOptions = [
  { value: "COMPACT", label: "Compact" },
  { value: "BALANCED", label: "Balanced" },
  { value: "PREMIUM", label: "Premium" },
] as const;

export const studioThemeOptions = [
  { value: "WARM", label: "Warm boutique" },
  { value: "CHARCOAL", label: "Charcoal reformer" },
  { value: "LIGHT", label: "Light wellness" },
] as const;

export type RoomEquipmentType = (typeof equipmentOptions)[number]["value"];
export type RoomLayoutPattern = (typeof layoutPatternOptions)[number]["value"];
export type RoomDensity = (typeof densityOptions)[number]["value"];
export type StudioTheme = (typeof studioThemeOptions)[number]["value"];

export type RoomVisualizerConfig = {
  spaceCount: number;
  rows: number;
  equipment: RoomEquipmentType;
  pattern: RoomLayoutPattern;
  density: RoomDensity;
  theme: StudioTheme;
  showClearance: boolean;
  showInstructorZone: boolean;
  showMirrors: boolean;
  showWindows: boolean;
  showStorage: boolean;
};

export type RoomLayoutPosition = {
  index: number;
  row: number;
  col: number;
  x: number;
  z: number;
  rotation: number;
};

export type RoomLayoutStats = {
  columns: number;
  roomWidth: number;
  roomDepth: number;
  footprintWidth: number;
  footprintDepth: number;
  totalSlots: number;
  positions: RoomLayoutPosition[];
};

const equipmentFootprints: Record<
  RoomEquipmentType,
  { width: number; depth: number }
> = {
  MAT: { width: 0.72, depth: 1.9 },
  REFORMER: { width: 0.9, depth: 2.55 },
  BIKE: { width: 0.82, depth: 1.25 },
  STRENGTH: { width: 1.05, depth: 1.65 },
  OPEN: { width: 0.9, depth: 0.9 },
};

const densityMultiplier: Record<RoomDensity, number> = {
  COMPACT: 1.1,
  BALANCED: 1.35,
  PREMIUM: 1.7,
};

export const INSTRUCTOR_ZONE_DEPTH = 4.5;

export function clampRoomNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

export function getDefaultRoomVisualizerConfig(
  capacity?: number | null,
): RoomVisualizerConfig {
  const spaceCount = clampRoomNumber(capacity ?? 12, 1, 80);
  return {
    spaceCount,
    rows: clampRoomNumber(Math.ceil(Math.sqrt(spaceCount * 0.65)), 1, 12),
    equipment: "MAT",
    pattern: "STAGGERED",
    density: "BALANCED",
    theme: "WARM",
    showClearance: true,
    showInstructorZone: true,
    showMirrors: true,
    showWindows: true,
    showStorage: true,
  };
}

export function normalizeRoomVisualizerConfig(
  config: RoomVisualizerConfig,
): RoomVisualizerConfig {
  const spaceCount = clampRoomNumber(config.spaceCount, 1, 80);
  const minRowsForColumnLimit = Math.ceil(spaceCount / 12);
  return {
    ...config,
    spaceCount,
    rows: clampRoomNumber(
      config.rows,
      minRowsForColumnLimit,
      Math.min(12, spaceCount),
    ),
  };
}

export function getRoomLayoutStats(
  configInput: RoomVisualizerConfig,
): RoomLayoutStats {
  const config = normalizeRoomVisualizerConfig(configInput);
  const columns = Math.max(1, Math.ceil(config.spaceCount / config.rows));
  const footprint = equipmentFootprints[config.equipment];
  const multiplier = densityMultiplier[config.density];
  const cellWidth = footprint.width * multiplier + 0.45;
  const cellDepth = footprint.depth * multiplier + 0.35;
  const aisleWidth = config.pattern === "CENTER_AISLE" ? 1.25 : 0;
  const roomWidth = Math.max(7, columns * cellWidth + aisleWidth + 2.8);
  const roomDepth = Math.max(6, config.rows * cellDepth + 3.4 + INSTRUCTOR_ZONE_DEPTH);
  const positions: RoomLayoutPosition[] = [];

  if (config.pattern === "ARC") {
    const frontZ = -roomDepth / 2 + 1.45 + INSTRUCTOR_ZONE_DEPTH;
    const rowDepth = Math.max(1.15, (roomDepth - 3.4 - INSTRUCTOR_ZONE_DEPTH) / config.rows);
    for (let row = 0; row < config.rows; row++) {
      const rowStart = row * columns;
      const rowCount = Math.min(columns, config.spaceCount - rowStart);
      const radius = 2.2 + row * rowDepth;
      const spread = Math.min(Math.PI * 0.72, 0.28 * Math.max(rowCount - 1, 1));
      for (let col = 0; col < rowCount; col++) {
        const pct = rowCount === 1 ? 0.5 : col / (rowCount - 1);
        const angle = -spread / 2 + spread * pct;
        positions.push({
          index: rowStart + col,
          row,
          col,
          x: Math.sin(angle) * radius,
          z: frontZ + Math.cos(angle) * radius,
          rotation: -angle,
        });
      }
    }
    return {
      columns,
      roomWidth,
      roomDepth,
      footprintWidth: footprint.width,
      footprintDepth: footprint.depth,
      totalSlots: columns * config.rows,
      positions,
    };
  }

  const usableWidth = roomWidth - 2.6;
  const equipmentDepth = roomDepth - 3.4 - INSTRUCTOR_ZONE_DEPTH;
  const startZ = -roomDepth / 2 + 1.7 + INSTRUCTOR_ZONE_DEPTH;
  const xStep = columns === 1 ? 0 : usableWidth / (columns - 1);
  const zStep = config.rows === 1 ? 0 : equipmentDepth / (config.rows - 1);

  const halfBound = usableWidth / 2;

  for (let index = 0; index < config.spaceCount; index++) {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const rowStart = row * columns;
    const rowCount = Math.min(columns, config.spaceCount - rowStart);

    let x: number;
    if (config.pattern === "STAGGERED" && row % 2 === 1) {
      const rowXStep = rowCount === 1 ? 0 : usableWidth / (rowCount - 1);
      x = rowCount === 1 ? 0 : -usableWidth / 2 + col * rowXStep;
    } else {
      const aisleOffset =
        config.pattern === "CENTER_AISLE" && col >= Math.ceil(columns / 2)
          ? aisleWidth
          : 0;
      const baseX = columns === 1 ? 0 : -usableWidth / 2 + col * xStep;
      x = Math.max(-halfBound, Math.min(halfBound, baseX + aisleOffset - aisleWidth / 2));
    }

    positions.push({
      index,
      row,
      col,
      x,
      z: startZ + row * zStep,
      rotation: 0,
    });
  }

  return {
    columns,
    roomWidth,
    roomDepth,
    footprintWidth: footprint.width,
    footprintDepth: footprint.depth,
    totalSlots: columns * config.rows,
    positions,
  };
}

function getRecordValue(
  record: Record<string, unknown>,
  key: keyof RoomVisualizerConfig,
): unknown {
  return record[key];
}

export function parseRoomVisualizerConfig(
  value: unknown,
  capacity?: number | null,
): RoomVisualizerConfig {
  const fallback = getDefaultRoomVisualizerConfig(capacity);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const candidate = {
    ...fallback,
    spaceCount:
      typeof getRecordValue(record, "spaceCount") === "number"
        ? (getRecordValue(record, "spaceCount") as number)
        : fallback.spaceCount,
    rows:
      typeof getRecordValue(record, "rows") === "number"
        ? (getRecordValue(record, "rows") as number)
        : fallback.rows,
    equipment: equipmentOptions.some(
      (item) => item.value === getRecordValue(record, "equipment"),
    )
      ? (getRecordValue(record, "equipment") as RoomEquipmentType)
      : fallback.equipment,
    pattern: layoutPatternOptions.some(
      (item) => item.value === getRecordValue(record, "pattern"),
    )
      ? (getRecordValue(record, "pattern") as RoomLayoutPattern)
      : fallback.pattern,
    density: densityOptions.some(
      (item) => item.value === getRecordValue(record, "density"),
    )
      ? (getRecordValue(record, "density") as RoomDensity)
      : fallback.density,
    theme: studioThemeOptions.some(
      (item) => item.value === getRecordValue(record, "theme"),
    )
      ? (getRecordValue(record, "theme") as StudioTheme)
      : fallback.theme,
    showClearance:
      typeof getRecordValue(record, "showClearance") === "boolean"
        ? (getRecordValue(record, "showClearance") as boolean)
        : fallback.showClearance,
    showInstructorZone:
      typeof getRecordValue(record, "showInstructorZone") === "boolean"
        ? (getRecordValue(record, "showInstructorZone") as boolean)
        : fallback.showInstructorZone,
    showMirrors:
      typeof getRecordValue(record, "showMirrors") === "boolean"
        ? (getRecordValue(record, "showMirrors") as boolean)
        : fallback.showMirrors,
    showWindows:
      typeof getRecordValue(record, "showWindows") === "boolean"
        ? (getRecordValue(record, "showWindows") as boolean)
        : fallback.showWindows,
    showStorage:
      typeof getRecordValue(record, "showStorage") === "boolean"
        ? (getRecordValue(record, "showStorage") as boolean)
        : fallback.showStorage,
  };

  return normalizeRoomVisualizerConfig(candidate);
}
