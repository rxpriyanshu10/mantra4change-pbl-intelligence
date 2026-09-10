import { describe, it, expect } from "vitest";
import { classifyRisk } from "../lib/domain/risk";
import { calculateMetrics } from "../lib/domain/metrics";
import { calculateMoM } from "../lib/domain/trends";
import { filterPBLRecords, getPreviousMonth } from "../lib/domain/filtering";
import { aggregateByDistrict, aggregateByBlock } from "../lib/domain/geography";
import { rankPriorities } from "../lib/domain/priorities";
import { buildReviewSummary } from "../lib/application/reviewSummaryService";
import { PBLRecord } from "../types/domain";
import type { ProgramReviewFacts } from "../lib/application/programReviewService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<PBLRecord> = {}): PBLRecord {
  return {
    month: "2025-08",
    schoolCode: "S1",
    schoolName: "School 1",
    district: "D1",
    block: "B1",
    grade: "6",
    subject: "Math",
    projectConducted: true,
    evidenceSubmitted: true,
    enrollment: 100,
    attendance: 80,
    sourceFile: "test.csv",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Risk Boundaries
// ---------------------------------------------------------------------------

describe("Risk Boundaries", () => {
  it("classifies 74.99% as Behind", () => {
    expect(classifyRisk(74.99, "Metric").status).toBe("Behind");
  });
  it("classifies 75.00% as On Track", () => {
    expect(classifyRisk(75.0, "Metric").status).toBe("On Track");
  });
  it("classifies 59.99% as At Risk", () => {
    expect(classifyRisk(59.99, "Metric").status).toBe("At Risk");
  });
  it("classifies 60.00% as Behind", () => {
    expect(classifyRisk(60.0, "Metric").status).toBe("Behind");
  });
  it("classifies 34.99% as Critical", () => {
    expect(classifyRisk(34.99, "Metric").status).toBe("Critical");
  });
  it("classifies 35.00% as At Risk", () => {
    expect(classifyRisk(35.0, "Metric").status).toBe("At Risk");
  });
  it("classifies 0% as Critical", () => {
    expect(classifyRisk(0, "Metric").status).toBe("Critical");
  });
  it("classifies 100% as On Track", () => {
    expect(classifyRisk(100, "Metric").status).toBe("On Track");
  });
  it("handles null (no data) → N/A", () => {
    expect(classifyRisk(null, "Metric").status).toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// Enrollment deduplication — primary regression test
// ---------------------------------------------------------------------------

describe("Enrollment Deduplication", () => {
  it("does NOT double-count Class 6 enrollment when both Math and Science records exist", () => {
    // School S1, Grade 6: enrollment=100, two subject records (Math + Science)
    const records: PBLRecord[] = [
      makeRecord({ grade: "6", subject: "Math",    enrollment: 100, attendance: 80 }),
      makeRecord({ grade: "6", subject: "Science", enrollment: 100, attendance: 70 }),
    ];

    const metrics = calculateMetrics(records);
    // Enrollment must be 100, not 200
    expect(metrics.totalEnrollment).toBe(100);
    // Attendance is session-level and sums legitimately
    expect(metrics.totalAttendance).toBe(150);
  });

  it("sums enrollment correctly across different grades", () => {
    // Grade 6 enrollment=100, Grade 7 enrollment=120 — both with Math+Science
    const records: PBLRecord[] = [
      makeRecord({ grade: "6", subject: "Math",    enrollment: 100, attendance: 80 }),
      makeRecord({ grade: "6", subject: "Science", enrollment: 100, attendance: 70 }),
      makeRecord({ grade: "7", subject: "Math",    enrollment: 120, attendance: 90 }),
      makeRecord({ grade: "7", subject: "Science", enrollment: 120, attendance: 100 }),
    ];

    const metrics = calculateMetrics(records);
    // Each grade's enrollment counted once: 100 + 120 = 220
    expect(metrics.totalEnrollment).toBe(220);
    // All four sessions summed: 80 + 70 + 90 + 100 = 340
    expect(metrics.totalAttendance).toBe(340);
  });

  it("counts enrollment correctly for two different schools in the same grade", () => {
    // S1 and S2 both have Grade 6 enrollment=100, each with Math+Science
    const records: PBLRecord[] = [
      makeRecord({ schoolCode: "S1", grade: "6", subject: "Math",    enrollment: 100, attendance: 80 }),
      makeRecord({ schoolCode: "S1", grade: "6", subject: "Science", enrollment: 100, attendance: 70 }),
      makeRecord({ schoolCode: "S2", grade: "6", subject: "Math",    enrollment: 150, attendance: 120 }),
      makeRecord({ schoolCode: "S2", grade: "6", subject: "Science", enrollment: 150, attendance: 130 }),
    ];

    const metrics = calculateMetrics(records);
    // S1 Grade 6 = 100, S2 Grade 6 = 150 → total 250
    expect(metrics.totalEnrollment).toBe(250);
  });

  it("excludes grade N/A records from enrollment (non-participating sentinel rows)", () => {
    const records: PBLRecord[] = [
      makeRecord({ grade: "6", subject: "Math", enrollment: 100, attendance: 80 }),
      makeRecord({ grade: "N/A", subject: "N/A", enrollment: 0, attendance: 0, projectConducted: false, evidenceSubmitted: false }),
    ];

    const metrics = calculateMetrics(records);
    expect(metrics.totalEnrollment).toBe(100);
    // Two distinct school codes (default S1 for both above — adjust:
    // actually both default to S1, so totalSchools=1. That's correct here.
  });

  it("multi-grade, multi-subject, multi-school realistic scenario", () => {
    // School A: grades 6+7, Math+Science each
    // School B: grade 8, Math only
    const records: PBLRecord[] = [
      // School A – Grade 6
      makeRecord({ schoolCode: "A", grade: "6", subject: "Math",    enrollment: 60, attendance: 50 }),
      makeRecord({ schoolCode: "A", grade: "6", subject: "Science", enrollment: 60, attendance: 55 }),
      // School A – Grade 7
      makeRecord({ schoolCode: "A", grade: "7", subject: "Math",    enrollment: 70, attendance: 60 }),
      makeRecord({ schoolCode: "A", grade: "7", subject: "Science", enrollment: 70, attendance: 65 }),
      // School B – Grade 8
      makeRecord({ schoolCode: "B", grade: "8", subject: "Math",    enrollment: 80, attendance: 70, evidenceSubmitted: false }),
    ];

    const metrics = calculateMetrics(records);
    // Enrollment: A_G6=60, A_G7=70, B_G8=80 → 210
    expect(metrics.totalEnrollment).toBe(210);
    // Attendance: 50+55+60+65+70 = 300
    expect(metrics.totalAttendance).toBe(300);
    // totalSchools = 2 (A, B)
    expect(metrics.totalSchools).toBe(2);
    // participatingSchools = 2 (both conducted)
    expect(metrics.participatingSchools).toBe(2);
    // evidenceSubmittingSchools = 1 (A only)
    expect(metrics.evidenceSubmittingSchools).toBe(1);
    // evidenceSubmissionRate = 1/2 * 100 = 50
    expect(metrics.evidenceSubmissionRate).toBeCloseTo(50);
  });
});

// ---------------------------------------------------------------------------
// Participation & school uniqueness
// ---------------------------------------------------------------------------

describe("School Participation", () => {
  it("counts unique schools regardless of number of grade/subject records", () => {
    const records: PBLRecord[] = [
      makeRecord({ schoolCode: "S1", grade: "6", subject: "Math" }),
      makeRecord({ schoolCode: "S1", grade: "6", subject: "Science" }),
      makeRecord({ schoolCode: "S1", grade: "7", subject: "Math" }),
      makeRecord({ schoolCode: "S2", grade: "6", subject: "Math" }),
    ];
    const metrics = calculateMetrics(records);
    expect(metrics.totalSchools).toBe(2);
    expect(metrics.participatingSchools).toBe(2);
    expect(metrics.participationRate).toBeCloseTo(100);
  });

  it("participation rate = participatingSchools / totalSchools × 100", () => {
    const records: PBLRecord[] = [
      makeRecord({ schoolCode: "S1", projectConducted: true }),
      makeRecord({ schoolCode: "S2", projectConducted: false }),
    ];
    const metrics = calculateMetrics(records);
    expect(metrics.participationRate).toBeCloseTo(50);
  });
});

// ---------------------------------------------------------------------------
// Evidence submission
// ---------------------------------------------------------------------------

describe("Evidence Submission", () => {
  it("uses participatingSchools as denominator", () => {
    const records: PBLRecord[] = [
      makeRecord({ schoolCode: "S1", projectConducted: true,  evidenceSubmitted: true }),
      makeRecord({ schoolCode: "S2", projectConducted: true,  evidenceSubmitted: false }),
      makeRecord({ schoolCode: "S3", projectConducted: false, evidenceSubmitted: false }),
    ];
    const metrics = calculateMetrics(records);
    // 2 participating, 1 submitted → 50%
    expect(metrics.evidenceSubmissionRate).toBeCloseTo(50);
  });

  it("returns null when zero participating schools (no divide-by-zero)", () => {
    const records: PBLRecord[] = [
      makeRecord({ projectConducted: false, evidenceSubmitted: false }),
    ];
    const metrics = calculateMetrics(records);
    expect(metrics.participatingSchools).toBe(0);
    expect(metrics.evidenceSubmissionRate).toBeNull();
  });

  it("handles a school with multiple records — only counted once as evidence submitter", () => {
    const records: PBLRecord[] = [
      makeRecord({ schoolCode: "S1", grade: "6", subject: "Math",    projectConducted: true, evidenceSubmitted: true }),
      makeRecord({ schoolCode: "S1", grade: "6", subject: "Science", projectConducted: true, evidenceSubmitted: true }),
    ];
    const metrics = calculateMetrics(records);
    expect(metrics.evidenceSubmittingSchools).toBe(1);
    expect(metrics.evidenceSubmissionRate).toBeCloseTo(100);
  });
});

// ---------------------------------------------------------------------------
// Edge cases: empty dataset / zero participating schools
// ---------------------------------------------------------------------------

describe("Edge Cases", () => {
  it("handles empty dataset", () => {
    const metrics = calculateMetrics([]);
    expect(metrics.totalSchools).toBe(0);
    expect(metrics.participatingSchools).toBe(0);
    expect(metrics.participationRate).toBeNull();
    expect(metrics.evidenceSubmissionRate).toBeNull();
    expect(metrics.totalEnrollment).toBe(0);
    expect(metrics.totalAttendance).toBe(0);
    expect(metrics.attendanceRate).toBeNull();
  });

  it("returns participationRate=0 when schools exist but none participated", () => {
    const records: PBLRecord[] = [
      makeRecord({ projectConducted: false, evidenceSubmitted: false, enrollment: 100, attendance: 0 }),
    ];
    const metrics = calculateMetrics(records);
    expect(metrics.totalSchools).toBe(1);
    expect(metrics.participationRate).toBe(0);
    expect(metrics.evidenceSubmissionRate).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Grade filtering
// ---------------------------------------------------------------------------

describe("Grade Filtering", () => {
  const allRecords: PBLRecord[] = [
    makeRecord({ schoolCode: "S1", grade: "6", subject: "Math",    enrollment: 100, attendance: 80 }),
    makeRecord({ schoolCode: "S1", grade: "6", subject: "Science", enrollment: 100, attendance: 70 }),
    makeRecord({ schoolCode: "S1", grade: "7", subject: "Math",    enrollment: 120, attendance: 90 }),
    makeRecord({ schoolCode: "S1", grade: "7", subject: "Science", enrollment: 120, attendance: 100 }),
  ];

  it("grade filter returns only records for that grade", () => {
    const filtered = filterPBLRecords(allRecords, { grade: "6" });
    expect(filtered.every((r) => r.grade === "6")).toBe(true);
    expect(filtered.length).toBe(2);
  });

  it("enrollment is not duplicated after grade filter", () => {
    const filtered = filterPBLRecords(allRecords, { grade: "6" });
    const metrics = calculateMetrics(filtered);
    // Grade 6 only: enrollment=100 (once, not 200)
    expect(metrics.totalEnrollment).toBe(100);
  });

  it("subject filter reduces attendance but not enrollment for same grade", () => {
    const filtered = filterPBLRecords(allRecords, { grade: "6", subject: "Math" });
    const metrics = calculateMetrics(filtered);
    // Still only Grade 6 of S1 → enrollment=100
    expect(metrics.totalEnrollment).toBe(100);
    // Only Math session attendance
    expect(metrics.totalAttendance).toBe(80);
  });

  it("returns all records when All grades selected", () => {
    const filtered = filterPBLRecords(allRecords, { grade: "All" });
    expect(filtered.length).toBe(allRecords.length);
  });
});

// ---------------------------------------------------------------------------
// Subject filtering
// ---------------------------------------------------------------------------

describe("Subject Filtering", () => {
  const allRecords: PBLRecord[] = [
    makeRecord({ grade: "6", subject: "Math",    enrollment: 100, attendance: 80 }),
    makeRecord({ grade: "6", subject: "Science", enrollment: 100, attendance: 70 }),
    makeRecord({ grade: "7", subject: "Math",    enrollment: 120, attendance: 90 }),
    makeRecord({ grade: "7", subject: "Science", enrollment: 120, attendance: 100 }),
  ];

  it("subject filter keeps enrollment deduplication correct (one grade, one subject)", () => {
    const filtered = filterPBLRecords(allRecords, { subject: "Math" });
    const metrics = calculateMetrics(filtered);
    // G6=100 + G7=120 = 220
    expect(metrics.totalEnrollment).toBe(220);
    // Math only: 80 + 90 = 170
    expect(metrics.totalAttendance).toBe(170);
  });
});

// ---------------------------------------------------------------------------
// Geography aggregation
// ---------------------------------------------------------------------------

describe("Geography Aggregation", () => {
  const records: PBLRecord[] = [
    makeRecord({ schoolCode: "S1", district: "D1", block: "B1", grade: "6", subject: "Math",    enrollment: 100, attendance: 80 }),
    makeRecord({ schoolCode: "S1", district: "D1", block: "B1", grade: "6", subject: "Science", enrollment: 100, attendance: 70 }),
    makeRecord({ schoolCode: "S2", district: "D2", block: "B2", grade: "7", subject: "Math",    enrollment: 120, attendance: 90 }),
    makeRecord({ schoolCode: "S2", district: "D2", block: "B2", grade: "7", subject: "Science", enrollment: 120, attendance: 100 }),
  ];

  it("district aggregation does not duplicate enrollment", () => {
    const districts = aggregateByDistrict(records);
    const d1 = districts.find((d) => d.name === "D1");
    const d2 = districts.find((d) => d.name === "D2");
    expect(d1?.metrics.totalEnrollment).toBe(100);
    expect(d2?.metrics.totalEnrollment).toBe(120);
  });

  it("block aggregation does not duplicate enrollment", () => {
    const blocks = aggregateByBlock(records);
    const b1 = blocks.find((b) => b.name === "B1");
    const b2 = blocks.find((b) => b.name === "B2");
    expect(b1?.metrics.totalEnrollment).toBe(100);
    expect(b2?.metrics.totalEnrollment).toBe(120);
  });

  it("unique school denominators remain unique per geography", () => {
    const districts = aggregateByDistrict(records);
    const d1 = districts.find((d) => d.name === "D1");
    expect(d1?.metrics.totalSchools).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Month-over-Month trends
// ---------------------------------------------------------------------------

describe("Month-over-Month (MoM)", () => {
  it("returns null when previous data is unavailable", () => {
    expect(calculateMoM(50, null)).toBeNull();
    expect(calculateMoM(null, 50)).toBeNull();
    expect(calculateMoM(null, null)).toBeNull();
  });

  it("calculates percentage-point difference: current − previous", () => {
    expect(calculateMoM(60.5, 50.0)).toBeCloseTo(10.5);
    expect(calculateMoM(40.0, 60.0)).toBeCloseTo(-20.0);
    expect(calculateMoM(75.0, 75.0)).toBeCloseTo(0.0);
  });
});

// ---------------------------------------------------------------------------
// Filtering (existing tests retained)
// ---------------------------------------------------------------------------

describe("Filtering", () => {
  const records: PBLRecord[] = [
    makeRecord({ month: "2025-07", schoolCode: "S1", grade: "6", subject: "Math", enrollment: 100, attendance: 90 }),
    makeRecord({ month: "2025-08", schoolCode: "S1", grade: "6", subject: "Math", enrollment: 100, attendance: 80 }),
  ];

  it("filters by month", () => {
    const filtered = filterPBLRecords(records, { month: "2025-08" });
    expect(filtered.length).toBe(1);
    expect(filtered[0].month).toBe("2025-08");
  });

  it("returns all when All is selected", () => {
    const filtered = filterPBLRecords(records, { month: "All" });
    expect(filtered.length).toBe(2);
  });

  it("filters by district", () => {
    const multi = [
      makeRecord({ district: "D1" }),
      makeRecord({ district: "D2" }),
    ];
    expect(filterPBLRecords(multi, { district: "D1" }).length).toBe(1);
  });

  it("filters by block", () => {
    const multi = [
      makeRecord({ block: "B1" }),
      makeRecord({ block: "B2" }),
    ];
    expect(filterPBLRecords(multi, { block: "B2" }).length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getPreviousMonth helper
// ---------------------------------------------------------------------------

describe("getPreviousMonth", () => {
  it("August → July", () => {
    expect(getPreviousMonth("2025-08")).toBe("2025-07");
  });
  it("September → August", () => {
    expect(getPreviousMonth("2025-09")).toBe("2025-08");
  });
  it("July → June (no data, but correctly computed)", () => {
    expect(getPreviousMonth("2025-07")).toBe("2025-06");
  });
  it("January rolls back to December of prior year", () => {
    expect(getPreviousMonth("2025-01")).toBe("2024-12");
  });
});

// ---------------------------------------------------------------------------
// MoM null when previous month has no data (July edge case)
// ---------------------------------------------------------------------------

describe("MoM null for missing previous month", () => {
  it("returns null for all metrics when previousValue is null (no prior data)", () => {
    // Simulates July: prev month (June) has no records → prevMetrics = null
    expect(calculateMoM(2300, null)).toBeNull();
    expect(calculateMoM(0, null)).toBeNull();
  });

  it("returns correct delta when both months have data (August→July)", () => {
    // participationRate: Aug=80, Jul=70 → +10pp
    expect(calculateMoM(80, 70)).toBeCloseTo(10);
  });

  it("returns negative delta when current < previous", () => {
    expect(calculateMoM(60, 75)).toBeCloseTo(-15);
  });
});

// ---------------------------------------------------------------------------
// Filter combinations (multi-dimension)
// ---------------------------------------------------------------------------

describe("Filter Combinations", () => {
  const records: PBLRecord[] = [
    makeRecord({ month: "2025-08", district: "D1", block: "B1", grade: "6", subject: "Math",    schoolCode: "S1", enrollment: 100, attendance: 80 }),
    makeRecord({ month: "2025-08", district: "D1", block: "B1", grade: "6", subject: "Science", schoolCode: "S1", enrollment: 100, attendance: 70 }),
    makeRecord({ month: "2025-08", district: "D1", block: "B2", grade: "7", subject: "Math",    schoolCode: "S2", enrollment: 120, attendance: 90 }),
    makeRecord({ month: "2025-08", district: "D2", block: "B3", grade: "6", subject: "Math",    schoolCode: "S3", enrollment: 80,  attendance: 60 }),
    makeRecord({ month: "2025-07", district: "D1", block: "B1", grade: "6", subject: "Math",    schoolCode: "S1", enrollment: 100, attendance: 75 }),
  ];

  it("month + district combination isolates correct records", () => {
    const filtered = filterPBLRecords(records, { month: "2025-08", district: "D1" });
    expect(filtered.every((r) => r.month === "2025-08" && r.district === "D1")).toBe(true);
    expect(filtered.length).toBe(3); // S1(Math+Science) + S2
  });

  it("district + block combination produces valid subset only", () => {
    const filtered = filterPBLRecords(records, { district: "D1", block: "B1" });
    // Only D1-B1 records: S1 Math + S1 Science for Aug, S1 Math for Jul
    expect(filtered.every((r) => r.district === "D1" && r.block === "B1")).toBe(true);
    expect(filtered.length).toBe(3);
  });

  it("district + block from different districts yields zero results", () => {
    // D1 does not have B3
    const filtered = filterPBLRecords(records, { district: "D1", block: "B3" });
    expect(filtered.length).toBe(0);
  });

  it("month + district + grade combination is additive (all three filters apply)", () => {
    const filtered = filterPBLRecords(records, { month: "2025-08", district: "D1", grade: "6" });
    expect(filtered.every((r) => r.month === "2025-08" && r.district === "D1" && r.grade === "6")).toBe(true);
    // S1 Grade 6 Math + Science
    expect(filtered.length).toBe(2);
  });

  it("grade filter does not duplicate enrollment within results", () => {
    const filtered = filterPBLRecords(records, { month: "2025-08", grade: "6" });
    const metrics = calculateMetrics(filtered);
    // S1 Grade 6 = 100, S3 Grade 6 = 80 → 180
    expect(metrics.totalEnrollment).toBe(180);
  });

  it("subject filter reduces attendance but preserves enrollment deduplication", () => {
    const filtered = filterPBLRecords(records, { month: "2025-08", subject: "Math" });
    const metrics = calculateMetrics(filtered);
    // S1 G6 Math=100, S2 G7 Math=120, S3 G6 Math=80 → deduped = 100+120+80 = 300
    expect(metrics.totalEnrollment).toBe(300);
    // Attendance: 80 + 90 + 60 = 230
    expect(metrics.totalAttendance).toBe(230);
  });
});

// ---------------------------------------------------------------------------
// Priority / Ranking ordering
// ---------------------------------------------------------------------------

describe("Priority Ranking", () => {
  it("Critical ranks before At Risk", () => {
    const aggregations = [
      { name: "B", metrics: calculateMetrics([makeRecord({ schoolCode: "X", projectConducted: false, enrollment: 100, attendance: 0 })]) },
      { name: "A", metrics: calculateMetrics([makeRecord({ schoolCode: "Y", projectConducted: true,  enrollment: 100, attendance: 90, evidenceSubmitted: true })]) },
    ];
    const ranked = rankPriorities(aggregations);
    // B has 0% participation (Critical), A has 100% (On Track) → B first
    expect(ranked[0].name).toBe("B");
    expect(ranked[0].riskStatus).toBe("Critical");
    expect(ranked[1].riskStatus).toBe("On Track");
  });

  it("same risk level: larger gap to 75% target ranks first", () => {
    // Both Critical, but different rates
    const low  = makeRecord({ schoolCode: "LOW",  projectConducted: false, enrollment: 50, attendance: 0 });
    const mid  = makeRecord({ schoolCode: "MID",  projectConducted: false, enrollment: 50, attendance: 0 });
    const recs1 = [low];
    const recs2 = [mid, makeRecord({ schoolCode: "MID2", projectConducted: true, enrollment: 50, attendance: 30 })];
    const aggs = [
      { name: "Z-LowPart",  metrics: calculateMetrics(recs1) },  // 0%
      { name: "A-MidPart",  metrics: calculateMetrics(recs2) },  // 50%
    ];
    const ranked = rankPriorities(aggs);
    // 0% has larger gap (75pp) than 50% (25pp) → Z-LowPart first
    expect(ranked[0].name).toBe("Z-LowPart");
  });

  it("gapToTarget is 0 when participation >= 75%", () => {
    const aggs = [
      { name: "OnTrack", metrics: calculateMetrics([makeRecord({ projectConducted: true, enrollment: 100, attendance: 80 })]) },
    ];
    const ranked = rankPriorities(aggs);
    expect(ranked[0].gapToTarget).toBe(0);
    expect(ranked[0].riskStatus).toBe("On Track");
  });

  it("tie-break by name is alphabetical (A before Z)", () => {
    const m = calculateMetrics([makeRecord({ projectConducted: false, enrollment: 50, attendance: 0 })]);
    const ranked = rankPriorities([
      { name: "Z-District", metrics: m },
      { name: "A-District", metrics: m },
    ]);
    // Same risk, same gap, same evidence → alphabetical
    expect(ranked[0].name).toBe("A-District");
  });
});

// ---------------------------------------------------------------------------
// District/Block geography consistency
// ---------------------------------------------------------------------------

describe("Geography District/Block Consistency", () => {
  const records: PBLRecord[] = [
    makeRecord({ district: "D1", block: "D1-B1", schoolCode: "S1", grade: "6", subject: "Math",    enrollment: 100, attendance: 80 }),
    makeRecord({ district: "D1", block: "D1-B1", schoolCode: "S1", grade: "6", subject: "Science", enrollment: 100, attendance: 70 }),
    makeRecord({ district: "D1", block: "D1-B2", schoolCode: "S2", grade: "7", subject: "Math",    enrollment: 120, attendance: 100 }),
    makeRecord({ district: "D2", block: "D2-B1", schoolCode: "S3", grade: "8", subject: "Math",    enrollment: 80,  attendance: 60 }),
  ];

  it("district aggregation: D1 has 2 unique schools", () => {
    const dists = aggregateByDistrict(records);
    const d1 = dists.find((d) => d.name === "D1");
    expect(d1?.metrics.totalSchools).toBe(2);
  });

  it("block aggregation: D1-B1 enrollment is not duplicated across subjects", () => {
    const blocks = aggregateByBlock(records);
    const b1 = blocks.find((b) => b.name === "D1-B1");
    expect(b1?.metrics.totalEnrollment).toBe(100); // S1 G6 once, not 200
  });

  it("D1 and D2 are independently correct", () => {
    const dists = aggregateByDistrict(records);
    const d1 = dists.find((d) => d.name === "D1");
    const d2 = dists.find((d) => d.name === "D2");
    expect(d1?.metrics.totalEnrollment).toBe(220); // S1_G6=100 + S2_G7=120
    expect(d2?.metrics.totalEnrollment).toBe(80);
  });

  it("block from wrong district produces empty results via filter", () => {
    // D2 block D2-B1 applied as a filter alongside district D1 → 0 results
    const filtered = filterPBLRecords(records, { district: "D1", block: "D2-B1" });
    expect(filtered.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Review Summary Wording
// ---------------------------------------------------------------------------

describe("Review Summary Wording", () => {
  function makeFacts(participationRate: number | null, evidenceRate: number | null, topDistrictStatus: "Critical" | "At Risk" | "On Track"): ProgramReviewFacts {
    const metrics = {
      totalSchools: 10,
      participatingSchools: participationRate !== null ? Math.round(participationRate / 10) : 0,
      participationRate,
      evidenceSubmittingSchools: 3,
      evidenceSubmissionRate: evidenceRate,
      totalEnrollment: 1000,
      totalAttendance: 700,
      attendanceRate: 70,
    };
    const districtMetrics = { ...metrics, participationRate: participationRate };
    return {
      currentMetrics: metrics,
      momChanges: {
        totalSchools: null, participatingSchools: null, participationRate: 5,
        evidenceSubmittingSchools: null, evidenceSubmissionRate: null,
        totalEnrollment: null, totalAttendance: null, attendanceRate: null,
      },
      districts: [{
        name: "District Test",
        metrics: districtMetrics,
        riskStatus: topDistrictStatus,
        gapToTarget: topDistrictStatus === "On Track" ? 0 : 30,
      }],
      blocks: [],
    };
  }

  it("does NOT contain 'requires intervention' in any summary output", () => {
    const facts = makeFacts(40, 50, "Critical");
    const summary = buildReviewSummary(facts);
    const allText = [...summary.achievements, ...summary.changes, ...summary.risks, ...summary.priorities, ...summary.discussionPoints].join(" ");
    expect(allText).not.toMatch(/requires intervention/i);
  });

  it("does NOT contain 'requires immediate follow-up' in any summary output", () => {
    const facts = makeFacts(40, 50, "Critical");
    const summary = buildReviewSummary(facts);
    const allText = [...summary.achievements, ...summary.changes, ...summary.risks, ...summary.priorities, ...summary.discussionPoints].join(" ");
    expect(allText).not.toMatch(/requires immediate follow-up/i);
  });

  it("priority wording describes the signal, not an action (contains 'priority review')", () => {
    const facts = makeFacts(40, 50, "Critical");
    const summary = buildReviewSummary(facts);
    const priorityText = summary.priorities.join(" ");
    expect(priorityText).toMatch(/priority review/i);
  });

  it("risk section fires for participationRate=0 (falsy-zero fix)", () => {
    const facts = makeFacts(0, null, "Critical");
    const summary = buildReviewSummary(facts);
    // participationRate is 0 (falsy), must still produce a risk item
    expect(summary.risks.some((r) => r.includes("0.0%"))).toBe(true);
  });

  it("risk section does NOT fire when participationRate is null", () => {
    const facts = makeFacts(null, null, "On Track");
    const summary = buildReviewSummary(facts);
    // null means no data — should not produce a < 60% risk item
    expect(summary.risks.some((r) => r.includes("null"))).toBe(false);
  });

  it("summary contains MoM change when available", () => {
    const facts = makeFacts(80, 90, "On Track");
    const summary = buildReviewSummary(facts);
    expect(summary.changes.some((c) => c.includes("pp"))).toBe(true);
  });

  it("summary falls back to 'No prior month data' when all MoM null", () => {
    const facts = makeFacts(80, 90, "On Track");
    // Override all MoM to null
    facts.momChanges.participationRate = null;
    facts.momChanges.evidenceSubmissionRate = null;
    const summary = buildReviewSummary(facts);
    expect(summary.changes).toContain("No prior month data available for comparison.");
  });
});
