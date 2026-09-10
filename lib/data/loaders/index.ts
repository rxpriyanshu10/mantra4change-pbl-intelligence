import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { PBLRecord, GrantProfile, GrantPerformance, EvidenceAsset } from "@/types/domain";

export function loadPBLData(): PBLRecord[] {
  const pblDir = path.join(process.cwd(), "lib", "data", "seed", "pbl");
  const files = fs.readdirSync(pblDir).filter((f) => f.endsWith(".csv"));
  
  const records: PBLRecord[] = [];

  for (const file of files) {
    const filePath = path.join(pblDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    
    const parsed = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
    });

    for (const row of parsed.data as Record<string, string>[]) {
      const month = row["Reporting Month"]?.trim();
      if (!month) continue;

      const schoolCode = row["What is your school's synthetic school code?"]?.trim();
      const schoolName = row["What is the name of your school?"]?.trim();
      const district = row["What is the name of your district?"]?.trim();
      const block = row["Block Details"]?.trim();
      
      const projectConducted = row["Was the PBL project conducted in your school this month?"]?.trim() === "Yes";
      const evidenceSubmitted = row["Was evidence submitted for the completed PBL project?"]?.trim() === "Yes";
      
      const classesStr = row["In which class/classes did you conduct the PBL project?"] || "";
      const subjectsStr = row["Which subject do you teach?"] || "";

      const taughtGrades = {
        "6": classesStr.includes("6"),
        "7": classesStr.includes("7"),
        "8": classesStr.includes("8"),
      };

      const taughtSubjects = {
        "Math": subjectsStr.includes("Math"),
        "Science": subjectsStr.includes("Science"),
      };

      // Unpivot by grade and subject
      const grades = ["6", "7", "8"] as const;
      const subjects = ["Math", "Science"] as const;

      for (const grade of grades) {
        if (!taughtGrades[grade]) continue;

        const enrollmentKey = `Total number of students enrolled in Class ${grade}, including all sections`;
        const enrollment = parseInt(row[enrollmentKey], 10) || 0;

        for (const subject of subjects) {
          if (!taughtSubjects[subject]) continue;

          const attendanceKey = `Average student attendance during the Class ${grade} PBL ${subject} session. If you did not teach ${subject} in Class ${grade}, enter 0.`;
          const attendance = parseInt(row[attendanceKey], 10) || 0;

          records.push({
            month,
            schoolCode,
            schoolName,
            district,
            block,
            grade,
            subject,
            projectConducted,
            evidenceSubmitted,
            enrollment,
            attendance,
            sourceFile: file,
          });
        }
      }
      
      // If a school didn't teach any valid grade/subject combination, or is purely non-participating 
      // without valid grade selections, we still need a record for participation/evidence denominator.
      // But actually, if they didn't conduct it, they might not have filled out grades/subjects.
      if (!projectConducted || (!taughtGrades["6"] && !taughtGrades["7"] && !taughtGrades["8"])) {
         records.push({
            month,
            schoolCode,
            schoolName,
            district,
            block,
            grade: "N/A",
            subject: "N/A",
            projectConducted,
            evidenceSubmitted,
            enrollment: 0,
            attendance: 0,
            sourceFile: file,
         });
      }
    }
  }

  return records;
}

export function loadGrantProfiles(): GrantProfile[] {
  const filePath = path.join(process.cwd(), "lib", "data", "seed", "grant", "01_Grant_Profile_and_Finance.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });

  return (parsed.data as Record<string, string>[]).map((row) => ({
    grantId: row["grant_id"],
    donor: row["donor"],
    grantName: row["grant_name"],
    month: row["reporting_month"],
    budgetLines: row["budget_line"],
    approvedBudgetUnits: parseFloat(row["approved_budget_units"]) || 0,
    monthlyUtilizedUnits: parseFloat(row["monthly_utilized_units"]) || 0,
    cumulativeUtilizedUnits: parseFloat(row["cumulative_utilized_units"]) || 0,
    cumulativeUtilizationRate: parseFloat(row["cumulative_utilization_rate"]) || 0,
    financeNote: row["finance_note"],
  }));
}

export function loadGrantPerformance(): GrantPerformance[] {
  const filePath = path.join(process.cwd(), "lib", "data", "seed", "grant", "02_Grant_Performance_and_Report_Material.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });

  /** Returns null for blank/absent columns; the actual parsed float otherwise. */
  function parseNullableFloat(raw: string | undefined): number | null {
    if (raw === undefined || raw.trim() === "") return null;
    const v = parseFloat(raw);
    return isNaN(v) ? null : v;
  }

  return (parsed.data as Record<string, string>[]).map((row) => ({
    grantId: row["grant_id"],
    month: row["reporting_month"],
    reportStatus: row["report_status"],
    milestoneSummary: row["milestone_summary"],
    riskStatus: row["risk_status"],
    draftReportText: row["draft_report_text"],
    pblCompletionRate: parseNullableFloat(row["pbl_completion_rate"]),
    evidenceSubmissionRate: parseNullableFloat(row["evidence_submission_rate"]),
    totalEnrollment: parseNullableFloat(row["total_enrollment"]),
    totalAttendance: parseNullableFloat(row["total_attendance"]),
    attendanceRate: parseNullableFloat(row["attendance_rate"]),
  }));
}

export function loadEvidenceAssets(): EvidenceAsset[] {
  const filePath = path.join(process.cwd(), "lib", "data", "seed", "grant", "03_Evidence_and_Media_Index.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });

  return (parsed.data as Record<string, string>[]).map((row) => {
    const district = row["district"]?.trim();
    const summaryOrCaption = row["summary_or_caption"]?.trim();
    return {
      grantId: row["grant_id"],
      month: row["reporting_month"],
      recordId: row["record_id"],
      assetType: row["record_type"],
      title: row["title"],
      relativePath: row["relative_path"],
      usageNote: row["usage_note"],
      // Optional source-backed fields — undefined when blank in the CSV
      ...(district ? { district } : {}),
      ...(summaryOrCaption ? { summaryOrCaption } : {}),
    };
  });
}
