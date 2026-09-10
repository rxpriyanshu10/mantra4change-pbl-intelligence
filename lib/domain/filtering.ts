import { PBLRecord } from "@/types/domain";

export type FilterState = {
  month?: string;
  district?: string;
  block?: string;
  grade?: string;
  subject?: string;
};

export function filterPBLRecords(records: PBLRecord[], filters: FilterState): PBLRecord[] {
  return records.filter((r) => {
    if (filters.month && r.month !== filters.month && filters.month !== "All") return false;
    if (filters.district && r.district !== filters.district && filters.district !== "All") return false;
    if (filters.block && r.block !== filters.block && filters.block !== "All") return false;
    if (filters.grade && r.grade !== filters.grade && filters.grade !== "All") return false;
    if (filters.subject && r.subject !== filters.subject && filters.subject !== "All") return false;
    return true;
  });
}

// Helper to deduce previous month in format YYYY-MM
export function getPreviousMonth(currentMonth: string): string {
  const [year, month] = currentMonth.split("-").map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  const prevMonthStr = (month - 1).toString().padStart(2, "0");
  return `${year}-${prevMonthStr}`;
}
