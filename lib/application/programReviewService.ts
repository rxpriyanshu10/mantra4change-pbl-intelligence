import { loadPBLData } from "../data/loaders";
import { filterPBLRecords, FilterState, getPreviousMonth } from "../domain/filtering";
import { calculateMetrics, MetricResult } from "../domain/metrics";
import { calculateMoM } from "../domain/trends";
import { aggregateByDistrict, aggregateByBlock } from "../domain/geography";
import { rankPriorities, PriorityResult } from "../domain/priorities";

export type ProgramReviewFacts = {
  currentMetrics: MetricResult;
  momChanges: Record<keyof MetricResult, number | null>;
  districts: PriorityResult[];
  blocks: PriorityResult[];
};

export function getProgramReview(filters: FilterState): ProgramReviewFacts {
  const allRecords = loadPBLData();
  const currentRecords = filterPBLRecords(allRecords, filters);
  const currentMetrics = calculateMetrics(currentRecords);

  const prevMonthStr = filters.month && filters.month !== "All" ? getPreviousMonth(filters.month) : null;
  const prevRecords = prevMonthStr ? filterPBLRecords(allRecords, { ...filters, month: prevMonthStr }) : [];
  // If the previous month has no records at all (e.g. July has no June data),
  // treat prevMetrics as null so every MoM value returns null rather than
  // a misleading delta against a zero baseline.
  const prevMetrics = prevMonthStr && prevRecords.length > 0 ? calculateMetrics(prevRecords) : null;

  const momChanges: Record<keyof MetricResult, number | null> = {
    totalSchools: calculateMoM(currentMetrics.totalSchools, prevMetrics?.totalSchools ?? null),
    participatingSchools: calculateMoM(currentMetrics.participatingSchools, prevMetrics?.participatingSchools ?? null),
    participationRate: calculateMoM(currentMetrics.participationRate, prevMetrics?.participationRate ?? null),
    evidenceSubmittingSchools: calculateMoM(currentMetrics.evidenceSubmittingSchools, prevMetrics?.evidenceSubmittingSchools ?? null),
    evidenceSubmissionRate: calculateMoM(currentMetrics.evidenceSubmissionRate, prevMetrics?.evidenceSubmissionRate ?? null),
    totalEnrollment: calculateMoM(currentMetrics.totalEnrollment, prevMetrics?.totalEnrollment ?? null),
    totalAttendance: calculateMoM(currentMetrics.totalAttendance, prevMetrics?.totalAttendance ?? null),
    attendanceRate: calculateMoM(currentMetrics.attendanceRate, prevMetrics?.attendanceRate ?? null),
  };

  const districts = rankPriorities(aggregateByDistrict(currentRecords));
  const blocks = rankPriorities(aggregateByBlock(currentRecords));

  return {
    currentMetrics,
    momChanges,
    districts,
    blocks,
  };
}

export function getAvailableFilters() {
  const records = loadPBLData();
  const months = Array.from(new Set(records.map((r) => r.month))).filter(Boolean).sort().reverse();
  const districts = Array.from(new Set(records.map((r) => r.district))).filter(Boolean).sort();
  const blocks = Array.from(new Set(records.map((r) => r.block))).filter(Boolean).sort();
  const grades = Array.from(new Set(records.map((r) => r.grade))).filter((g) => g && g !== "N/A").sort();
  const subjects = Array.from(new Set(records.map((r) => r.subject))).filter((s) => s && s !== "N/A").sort();

  // Build a district → blocks mapping so the UI can scope the block dropdown
  // to only show blocks that belong to the currently selected district.
  // This prevents logically invalid district+block filter combinations.
  const blocksByDistrict: Record<string, string[]> = {};
  for (const r of records) {
    if (!r.district || !r.block) continue;
    if (!blocksByDistrict[r.district]) blocksByDistrict[r.district] = [];
    if (!blocksByDistrict[r.district].includes(r.block)) {
      blocksByDistrict[r.district].push(r.block);
    }
  }
  for (const d of Object.keys(blocksByDistrict)) {
    blocksByDistrict[d].sort();
  }

  return { months, districts, blocks, grades, subjects, blocksByDistrict };
}
