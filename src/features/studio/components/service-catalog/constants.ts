export const EXPERIENCE_OPTIONS = [
  { value: "CLASS", label: "Class" },
  { value: "PRIVATE", label: "Private" },
  { value: "EVENT", label: "Event" },
] as const;

export const FORMAT_OPTIONS = [
  { value: "IN_PERSON", label: "In person" },
  { value: "VIRTUAL", label: "Virtual" },
  { value: "HYBRID", label: "Hybrid" },
] as const;

export const PAYMENT_OPTIONS = [
  { value: "PACKAGE_ONLY", label: "Package/membership only" },
  { value: "PAID", label: "Paid" },
  { value: "SLIDING_SCALE", label: "Sliding scale" },
  { value: "FREE", label: "Free" },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Private" },
] as const;

export function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
