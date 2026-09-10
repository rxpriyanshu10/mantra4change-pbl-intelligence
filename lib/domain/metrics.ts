import { PBLRecord } from "@/types/domain";

export type MetricResult = {
  totalSchools: number;
  participatingSchools: number;
  participationRate: number | null;
  evidenceSubmittingSchools: number;
  evidenceSubmissionRate: number | null;
  totalEnrollment: number;
  totalAttendance: number;
  attendanceRate: number | null;
};

export function calculateMetrics(records: PBLRecord[]): MetricResult {
  const totalSchools = new Set(records.map((r) => r.schoolCode)).size;
  const participatingSchools = new Set(
    records.filter((r) => r.projectConducted).map((r) => r.schoolCode)
  ).size;

  const participationRate =
    totalSchools > 0 ? (participatingSchools / totalSchools) * 100 : null;

  // evidenceSubmittingSchools uses unique school codes where evidenceSubmitted is true.
  // Denominator is participatingSchools (not totalSchools) — a school can only submit
  // evidence if it conducted a project.
  const evidenceSubmittingSchools = new Set(
    records.filter((r) => r.evidenceSubmitted).map((r) => r.schoolCode)
  ).size;

  const evidenceSubmissionRate =
    participatingSchools > 0
      ? (evidenceSubmittingSchools / participatingSchools) * 100
      : null;

  // Enrollment is a grade-level quantity from the source CSV.
  // A school's PBLRecords may include multiple subject rows for the same grade,
  // each carrying the same Class {G} enrollment value.
  // We deduplicate by (schoolCode, grade) so each grade's enrollment is counted once,
  // regardless of how many subjects were taught in that grade.
  // Records with grade "N/A" (non-participating schools with no grade data) contribute 0.
  const seenEnrollmentKeys = new Set<string>();
  let totalEnrollment = 0;
  for (const r of records) {
    if (r.grade === "N/A") continue;
    const key = `${r.schoolCode}::${r.grade}`;
    if (!seenEnrollmentKeys.has(key)) {
      seenEnrollmentKeys.add(key);
      totalEnrollment += r.enrollment;
    }
  }

  // Attendance is session-level (one value per grade × subject session).
  // Each record represents a distinct session so we sum across all records.
  // The resulting attendanceRate follows the same semantics as the CSV's
  // "Derived: Overall PBL attendance rate" = total_session_attendance / total_enrollment.
  const totalAttendance = records.reduce((sum, r) => sum + r.attendance, 0);

  const attendanceRate =
    totalEnrollment > 0 ? (totalAttendance / totalEnrollment) * 100 : null;

  return {
    totalSchools,
    participatingSchools,
    participationRate,
    evidenceSubmittingSchools,
    evidenceSubmissionRate,
    totalEnrollment,
    totalAttendance,
    attendanceRate,
  };
}
