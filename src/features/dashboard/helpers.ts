export function sanitizeSpan(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  return isNaN(n) || n < 1 ? 1 : Math.floor(n);
}

export function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 5) return `Having a late night, ${name}?`;
  if (hour < 12)
    return `Good morning ${name}, ready to take your studio to the next level?`;
  if (hour < 17)
    return `Good afternoon ${name}, hope you're having a productive day!`;
  if (hour < 21) return `Good evening ${name}, let's wrap up the day strong!`;
  return `Having a late night, ${name}?`;
}

export function addDisplayLabels<T extends { label: string }>(
  data: T[],
): (T & { displayLabel: string })[] {
  const maxLabels = getMaxVisibleLabels(data.length);
  return data.map((d, i, arr) => {
    const step = Math.max(1, Math.ceil(arr.length / maxLabels));
    const show = i === 0 || i === arr.length - 1 || i % step === 0;
    return { ...d, displayLabel: show ? d.label : "" };
  });
}

export type ChartDensity = "sparse" | "normal" | "dense" | "very-dense";

export type TimeSeriesChartPresentation = {
  density: ChartDensity;
  areaType: "monotone" | "linear";
  strokeWidth: number;
  activeDotRadius: number;
  barSize: number | undefined;
  compareBarSize: number | undefined;
  barCategoryGap: string;
  xTickMargin: number;
  yAxisWidth: number;
  margin: {
    top: number;
    right: number;
    left: number;
    bottom: number;
  };
};

function getMaxVisibleLabels(points: number): number {
  if (points <= 8) return points;
  if (points <= 16) return 6;
  if (points <= 36) return 7;
  if (points <= 72) return 8;
  return 9;
}

export function getVisibleXAxisTicks<T extends { label: string }>(
  data: T[],
): string[] {
  if (data.length === 0) return [];
  if (data.length === 1) return [data[0].label];

  const maxLabels = getMaxVisibleLabels(data.length);
  const step = Math.max(1, Math.ceil((data.length - 1) / (maxLabels - 1)));
  const ticks = new Set<string>();

  data.forEach((item, index) => {
    if (index === 0 || index === data.length - 1 || index % step === 0) {
      ticks.add(item.label);
    }
  });

  return Array.from(ticks);
}

export function getChartDensity(points: number): ChartDensity {
  if (points > 72) return "very-dense";
  if (points > 36) return "dense";
  if (points > 14) return "normal";
  return "sparse";
}

export function getTimeSeriesChartPresentation(
  points: number,
  hasComparison = false,
): TimeSeriesChartPresentation {
  const density = getChartDensity(points);

  if (density === "very-dense") {
    return {
      density,
      areaType: "linear",
      strokeWidth: 1.35,
      activeDotRadius: 2.5,
      barSize: undefined,
      compareBarSize: undefined,
      barCategoryGap: "52%",
      xTickMargin: 6,
      yAxisWidth: 34,
      margin: { top: 6, right: 6, left: 0, bottom: 2 },
    };
  }

  if (density === "dense") {
    return {
      density,
      areaType: "linear",
      strokeWidth: 1.5,
      activeDotRadius: 3,
      barSize: hasComparison ? 8 : 12,
      compareBarSize: 8,
      barCategoryGap: "44%",
      xTickMargin: 7,
      yAxisWidth: 34,
      margin: { top: 6, right: 6, left: 0, bottom: 2 },
    };
  }

  if (density === "normal") {
    return {
      density,
      areaType: "monotone",
      strokeWidth: 1.75,
      activeDotRadius: 3.5,
      barSize: hasComparison ? 14 : 22,
      compareBarSize: 14,
      barCategoryGap: "30%",
      xTickMargin: 8,
      yAxisWidth: 34,
      margin: { top: 4, right: 4, left: 0, bottom: 4 },
    };
  }

  return {
    density,
    areaType: "monotone",
    strokeWidth: 2,
    activeDotRadius: 4,
    barSize: hasComparison ? 20 : 32,
    compareBarSize: 20,
    barCategoryGap: "18%",
    xTickMargin: 10,
    yAxisWidth: 34,
    margin: { top: 4, right: 4, left: 0, bottom: 4 },
  };
}

export function getCategoricalBarSize(
  points: number,
  hasComparison = false,
): number | undefined {
  if (points > 18) return undefined;
  if (points > 12) return hasComparison ? 8 : 12;
  if (points > 8) return hasComparison ? 12 : 18;
  return hasComparison ? 20 : 32;
}

export function getCategoricalAxisLabel(
  label: string,
  index: number,
  total: number,
): string {
  if (total <= 6) return label;
  if (total > 14 && index % 2 !== 0) return "";

  const maxLength = total > 10 ? 9 : 12;
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1)}...`;
}

export function formatDashboardLabel(value: string | null | undefined): string {
  const words = (value ?? "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "Other";

  const [firstWord, ...rest] = words;
  const first = `${firstWord.charAt(0).toUpperCase()}${firstWord.slice(1)}`;
  return [first, ...rest].join(" ");
}
