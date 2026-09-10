export type PBLRecord = {
  month: string;
  schoolCode: string;
  schoolName: string;
  district: string;
  block: string;
  /**
   * The class/grade for this record (e.g. "6", "7", "8"), or "N/A" for
   * non-participating schools that had no grade selection.
   */
  grade: string;
  /**
   * The subject for this record (e.g. "Math", "Science"), or "N/A" for
   * non-participating schools that had no subject selection.
   */
  subject: string;
  projectConducted: boolean;
  evidenceSubmitted: boolean;
  /**
   * GRADE-LEVEL quantity. Sourced from
   * "Total number of students enrolled in Class {grade}, including all sections".
   * This value is the SAME for every record sharing the same (schoolCode, grade) pair.
   * Callers MUST deduplicate by (schoolCode, grade) before summing to avoid
   * counting each grade's enrollment once per subject.
   */
  enrollment: number;
  /**
   * SESSION-LEVEL quantity. Sourced from
   * "Average student attendance during the Class {grade} PBL {subject} session."
   * This value is DISTINCT per (schoolCode, grade, subject). Callers may sum
   * across all records without deduplication. The resulting aggregate attendance
   * may legitimately exceed enrollment when a school teaches both Math and Science
   * (students are counted once per session they attend).
   */
  attendance: number;
  sourceFile: string;
};

export type GrantProfile = {
  grantId: string;
  donor: string;
  grantName: string;
  month: string;
  budgetLines: string;
  approvedBudgetUnits: number;
  monthlyUtilizedUnits: number;
  cumulativeUtilizedUnits: number;
  cumulativeUtilizationRate: number;
  financeNote: string;
};

export type GrantPerformance = {
  grantId: string;
  month: string;
  reportStatus: string;
  milestoneSummary: string;
  riskStatus: string;
  draftReportText: string;
  /**
   * Fraction of sampled schools that completed PBL this month.
   * null when the column is absent or blank in the source CSV.
   */
  pblCompletionRate: number | null;
  /**
   * Fraction of sampled schools that submitted evidence this month.
   * null when the column is absent or blank in the source CSV.
   */
  evidenceSubmissionRate: number | null;
  /**
   * Total number of students enrolled across all schools covered by the grant.
   * null when the column is absent or blank in the source CSV.
   */
  totalEnrollment: number | null;
  /**
   * Total student attendance across all PBL sessions covered by the grant.
   * null when the column is absent or blank in the source CSV.
   */
  totalAttendance: number | null;
  /**
   * Ratio of total attendance to total enrollment for the grant this month.
   * null when the column is absent or blank in the source CSV.
   */
  attendanceRate: number | null;
};

export type EvidenceAsset = {
  grantId: string;
  month: string;
  recordId: string;
  assetType: string;
  title: string;
  relativePath: string;
  usageNote: string;
  /**
   * District associated with this evidence item as reported in the source CSV.
   * Undefined when the column is blank or absent.
   */
  district?: string;
  /**
   * Caption or summary text for this evidence item from the source CSV
   * (maps to `summary_or_caption` column).
   * Undefined when the column is blank or absent.
   */
  summaryOrCaption?: string;
};
