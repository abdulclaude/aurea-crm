export const REPORT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function getTotalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function paginateItems<T>(
  items: readonly T[],
  currentPage: number,
  pageSize: number,
): T[] {
  const startIndex = (currentPage - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
}
