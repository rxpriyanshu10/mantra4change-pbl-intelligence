import { describe, it, expect, vi } from "vitest";
import { getGrantReportFacts } from "../lib/application/grantReportService";
import { generateNarrative, validateNarrative } from "../lib/ai/provider";
import {
  generateDeterministicNarrative,
  INSUFFICIENT_DATA_NARRATIVE,
  evidenceCountPhrase,
} from "../lib/ai/fallback";
import * as loaders from "../lib/data/loaders/index";
import type { GrantFacts } from "../lib/application/grantReportService";

// Mock loaders to provide deterministic test data
vi.mock("../lib/data/loaders/index", () => {
  return {
    loadGrantProfiles: vi.fn(),
    loadGrantPerformance: vi.fn(),
    loadEvidenceAssets: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Outcome field helpers
// ---------------------------------------------------------------------------

/** Minimal GrantPerformance with all required fields populated. */
function makePerformance(overrides: Record<string, unknown> = {}) {
  return {
    grantId: "G1",
    month: "2025-07",
    reportStatus: "Draft",
    milestoneSummary: "M1",
    riskStatus: "On Track",
    draftReportText: "OK",
    pblCompletionRate: 0.85,
    evidenceSubmissionRate: 0.72,
    totalEnrollment: 1000,
    totalAttendance: 850,
    attendanceRate: 0.85,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Grant Report Service — Finance aggregation (existing)
// ---------------------------------------------------------------------------

describe("Grant Report Service", () => {
  it("aggregates multiple budget lines for the same grant and month", () => {
    vi.mocked(loaders.loadGrantProfiles).mockReturnValue([
      { grantId: "G1", donor: "D1", grantName: "Grant 1", month: "2025-07", budgetLines: "Line A", approvedBudgetUnits: 1000, monthlyUtilizedUnits: 100, cumulativeUtilizedUnits: 200, cumulativeUtilizationRate: 0.2, financeNote: "Note A" },
      { grantId: "G1", donor: "D1", grantName: "Grant 1", month: "2025-07", budgetLines: "Line B", approvedBudgetUnits: 2000, monthlyUtilizedUnits: 300, cumulativeUtilizedUnits: 700, cumulativeUtilizationRate: 0.35, financeNote: "Note B" },
      // Different month should be ignored
      { grantId: "G1", donor: "D1", grantName: "Grant 1", month: "2025-08", budgetLines: "Line C", approvedBudgetUnits: 3000, monthlyUtilizedUnits: 0, cumulativeUtilizedUnits: 900, cumulativeUtilizationRate: 0.3, financeNote: "Note C" }
    ]);
    vi.mocked(loaders.loadGrantPerformance).mockReturnValue([]);
    vi.mocked(loaders.loadEvidenceAssets).mockReturnValue([]);

    const facts = getGrantReportFacts("G1", "2025-07");

    expect(facts.profile).toBeDefined();
    expect(facts.profile?.approvedBudgetUnits).toBe(3000); // 1000 + 2000
    expect(facts.profile?.monthlyUtilizedUnits).toBe(400); // 100 + 300
    expect(facts.profile?.cumulativeUtilizedUnits).toBe(900); // 200 + 700
    expect(facts.profile?.cumulativeUtilizationRate).toBeCloseTo(900 / 3000);
    expect(facts.profile?.financeNote).toBe("Note A; Note B");
    expect(facts.profile?.budgetLines).toContain("Line A");
    expect(facts.profile?.budgetLines).toContain("Line B");
  });

  it("handles missing grant gracefully", () => {
    vi.mocked(loaders.loadGrantProfiles).mockReturnValue([]);
    vi.mocked(loaders.loadGrantPerformance).mockReturnValue([]);
    vi.mocked(loaders.loadEvidenceAssets).mockReturnValue([]);

    const facts = getGrantReportFacts("G99", "2025-07");
    expect(facts.profile).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Outcome field loading
// ---------------------------------------------------------------------------

describe("Outcome Fields — Grant Performance", () => {
  it("loads all five outcome fields correctly from performance data", () => {
    vi.mocked(loaders.loadGrantProfiles).mockReturnValue([
      { grantId: "G1", donor: "D1", grantName: "Grant 1", month: "2025-07", budgetLines: "L", approvedBudgetUnits: 1000, monthlyUtilizedUnits: 100, cumulativeUtilizedUnits: 500, cumulativeUtilizationRate: 0.5, financeNote: "" }
    ]);
    vi.mocked(loaders.loadGrantPerformance).mockReturnValue([
      makePerformance({ pblCompletionRate: 0.7791, evidenceSubmissionRate: 0.5159, totalEnrollment: 115517, totalAttendance: 103997, attendanceRate: 0.4501 })
    ]);
    vi.mocked(loaders.loadEvidenceAssets).mockReturnValue([]);

    const facts = getGrantReportFacts("G1", "2025-07");

    expect(facts.performance).not.toBeNull();
    expect(facts.performance?.pblCompletionRate).toBeCloseTo(0.7791);
    expect(facts.performance?.evidenceSubmissionRate).toBeCloseTo(0.5159);
    expect(facts.performance?.totalEnrollment).toBe(115517);
    expect(facts.performance?.totalAttendance).toBe(103997);
    expect(facts.performance?.attendanceRate).toBeCloseTo(0.4501);
  });

  it("exposes outcome metrics on facts.performance (not profile)", () => {
    vi.mocked(loaders.loadGrantProfiles).mockReturnValue([
      { grantId: "G1", donor: "D1", grantName: "G", month: "2025-07", budgetLines: "L", approvedBudgetUnits: 500, monthlyUtilizedUnits: 50, cumulativeUtilizedUnits: 250, cumulativeUtilizationRate: 0.5, financeNote: "" }
    ]);
    vi.mocked(loaders.loadGrantPerformance).mockReturnValue([
      makePerformance({ grantId: "G1", month: "2025-07", pblCompletionRate: 0.9, evidenceSubmissionRate: 0.8, totalEnrollment: 2000, totalAttendance: 1800, attendanceRate: 0.9 })
    ]);
    vi.mocked(loaders.loadEvidenceAssets).mockReturnValue([]);

    const facts = getGrantReportFacts("G1", "2025-07");

    // All five must be present on performance
    const perf = facts.performance!;
    expect(perf.pblCompletionRate).toBe(0.9);
    expect(perf.evidenceSubmissionRate).toBe(0.8);
    expect(perf.totalEnrollment).toBe(2000);
    expect(perf.totalAttendance).toBe(1800);
    expect(perf.attendanceRate).toBe(0.9);
  });

  it("missing outcome values resolve to null (not 0) when columns are absent", () => {
    vi.mocked(loaders.loadGrantProfiles).mockReturnValue([
      { grantId: "G1", donor: "D1", grantName: "G", month: "2025-07", budgetLines: "L", approvedBudgetUnits: 500, monthlyUtilizedUnits: 50, cumulativeUtilizedUnits: 250, cumulativeUtilizationRate: 0.5, financeNote: "" }
    ]);
    // Simulate a row that did not include the outcome columns (all null)
    vi.mocked(loaders.loadGrantPerformance).mockReturnValue([
      makePerformance({ pblCompletionRate: null, evidenceSubmissionRate: null, totalEnrollment: null, totalAttendance: null, attendanceRate: null })
    ]);
    vi.mocked(loaders.loadEvidenceAssets).mockReturnValue([]);

    const facts = getGrantReportFacts("G1", "2025-07");

    const perf = facts.performance!;
    expect(perf.pblCompletionRate).toBeNull();
    expect(perf.evidenceSubmissionRate).toBeNull();
    expect(perf.totalEnrollment).toBeNull();
    expect(perf.totalAttendance).toBeNull();
    expect(perf.attendanceRate).toBeNull();
    // None should be 0 — the distinction between "no data" and "0" is critical
    expect(perf.pblCompletionRate).not.toBe(0);
  });

  it("sourceFacts contain only source-backed outcome values (no fabrication)", async () => {
    vi.mocked(loaders.loadGrantProfiles).mockReturnValue([
      { grantId: "G1", donor: "D1", grantName: "Grant 1", month: "2025-07", budgetLines: "L", approvedBudgetUnits: 1000, monthlyUtilizedUnits: 100, cumulativeUtilizedUnits: 500, cumulativeUtilizationRate: 0.5, financeNote: "" }
    ]);
    vi.mocked(loaders.loadGrantPerformance).mockReturnValue([
      makePerformance({ pblCompletionRate: 0.8427, evidenceSubmissionRate: 0.6384, totalEnrollment: 115517, totalAttendance: 121497, attendanceRate: 0.5259 })
    ]);
    vi.mocked(loaders.loadEvidenceAssets).mockReturnValue([]);

    const facts = getGrantReportFacts("G1", "2025-07");
    const result = await generateNarrative(facts, false);

    // Outcome facts must equal exactly what was in the performance record
    expect(result.sourceFacts.pblCompletionRate).toBeCloseTo(0.8427);
    expect(result.sourceFacts.evidenceSubmissionRate).toBeCloseTo(0.6384);
    expect(result.sourceFacts.totalEnrollment).toBe(115517);
    expect(result.sourceFacts.totalAttendance).toBe(121497);
    expect(result.sourceFacts.attendanceRate).toBeCloseTo(0.5259);
  });

  it("sourceFacts outcome fields are null/undefined (not 0) when performance is missing", async () => {
    vi.mocked(loaders.loadGrantProfiles).mockReturnValue([
      { grantId: "G1", donor: "D1", grantName: "G", month: "2025-07", budgetLines: "L", approvedBudgetUnits: 1000, monthlyUtilizedUnits: 100, cumulativeUtilizedUnits: 500, cumulativeUtilizationRate: 0.5, financeNote: "" }
    ]);
    vi.mocked(loaders.loadGrantPerformance).mockReturnValue([]);
    vi.mocked(loaders.loadEvidenceAssets).mockReturnValue([]);

    const facts = getGrantReportFacts("G1", "2025-07");
    const result = await generateNarrative(facts, false);

    // When there is no performance record the outcome fields must be undefined (not 0)
    expect(result.sourceFacts.pblCompletionRate).toBeUndefined();
    expect(result.sourceFacts.evidenceSubmissionRate).toBeUndefined();
    expect(result.sourceFacts.totalEnrollment).toBeUndefined();
    expect(result.sourceFacts.totalAttendance).toBeUndefined();
    expect(result.sourceFacts.attendanceRate).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Evidence Traceability
// ---------------------------------------------------------------------------

describe("Evidence Traceability", () => {
  it("sourceFacts.evidenceRefs contains entries from source data only", async () => {
    vi.mocked(loaders.loadGrantProfiles).mockReturnValue([
      { grantId: "G1", donor: "D1", grantName: "Grant 1", month: "2025-08", budgetLines: "L", approvedBudgetUnits: 1000, monthlyUtilizedUnits: 100, cumulativeUtilizedUnits: 500, cumulativeUtilizationRate: 0.5, financeNote: "" }
    ]);
    vi.mocked(loaders.loadGrantPerformance).mockReturnValue([
      makePerformance({ grantId: "G1", month: "2025-08" })
    ]);
    vi.mocked(loaders.loadEvidenceAssets).mockReturnValue([
      { grantId: "G1", month: "2025-08", recordId: "MEDIA_AA_01", assetType: "image", title: "Activity Photo", relativePath: "images/photo01.png", usageNote: "Synthetic", district: "District T" },
      { grantId: "G1", month: "2025-08", recordId: "NEWS_AA_01", assetType: "news_clipping", title: "PBL News", relativePath: "images/news01.png", usageNote: "Synthetic" },
    ]);

    const facts = getGrantReportFacts("G1", "2025-08");
    const result = await generateNarrative(facts, false);

    // References must mirror the source data exactly
    expect(result.sourceFacts.evidenceRefs).toHaveLength(2);
    expect(result.sourceFacts.evidenceRefs[0].recordId).toBe("MEDIA_AA_01");
    expect(result.sourceFacts.evidenceRefs[0].assetType).toBe("image");
    expect(result.sourceFacts.evidenceRefs[0].title).toBe("Activity Photo");
    expect(result.sourceFacts.evidenceRefs[0].relativePath).toBe("images/photo01.png");
    expect(result.sourceFacts.evidenceRefs[0].district).toBe("District T");
    expect(result.sourceFacts.evidenceRefs[1].recordId).toBe("NEWS_AA_01");
    // district is absent on second row — should be undefined, not fabricated
    expect(result.sourceFacts.evidenceRefs[1].district).toBeUndefined();
  });

  it("evidence count in sourceFacts matches the evidence array length", async () => {
    vi.mocked(loaders.loadGrantProfiles).mockReturnValue([
      { grantId: "G1", donor: "D1", grantName: "Grant 1", month: "2025-08", budgetLines: "L", approvedBudgetUnits: 500, monthlyUtilizedUnits: 50, cumulativeUtilizedUnits: 200, cumulativeUtilizationRate: 0.4, financeNote: "" }
    ]);
    vi.mocked(loaders.loadGrantPerformance).mockReturnValue([
      makePerformance({ grantId: "G1", month: "2025-08" })
    ]);
    vi.mocked(loaders.loadEvidenceAssets).mockReturnValue([
      { grantId: "G1", month: "2025-08", recordId: "R1", assetType: "image", title: "A", relativePath: "a.png", usageNote: "" },
      { grantId: "G1", month: "2025-08", recordId: "R2", assetType: "image", title: "B", relativePath: "b.png", usageNote: "" },
      { grantId: "G1", month: "2025-08", recordId: "R3", assetType: "image", title: "C", relativePath: "c.png", usageNote: "" },
    ]);

    const facts = getGrantReportFacts("G1", "2025-08");
    const result = await generateNarrative(facts, false);

    expect(result.sourceFacts.evidenceCount).toBe(3);
    expect(result.sourceFacts.evidenceRefs).toHaveLength(3);
    // Count and refs must be consistent
    expect(result.sourceFacts.evidenceRefs.length).toBe(result.sourceFacts.evidenceCount);
  });

  it("evidence references remain available on facts.evidence in grant report", () => {
    vi.mocked(loaders.loadGrantProfiles).mockReturnValue([
      { grantId: "G1", donor: "D1", grantName: "G", month: "2025-09", budgetLines: "L", approvedBudgetUnits: 1000, monthlyUtilizedUnits: 100, cumulativeUtilizedUnits: 500, cumulativeUtilizationRate: 0.5, financeNote: "" }
    ]);
    vi.mocked(loaders.loadGrantPerformance).mockReturnValue([
      makePerformance({ grantId: "G1", month: "2025-09" })
    ]);
    vi.mocked(loaders.loadEvidenceAssets).mockReturnValue([
      { grantId: "G1", month: "2025-09", recordId: "RECOG_01", assetType: "image", title: "Recognition", relativePath: "img/r.png", usageNote: "ok" },
    ]);

    const facts = getGrantReportFacts("G1", "2025-09");

    // The raw evidence array on facts must be accessible and correct
    expect(facts.evidence).toHaveLength(1);
    expect(facts.evidence[0].recordId).toBe("RECOG_01");
    expect(facts.evidence[0].assetType).toBe("image");
    expect(facts.evidence[0].relativePath).toBe("img/r.png");
  });

  it("missing optional evidence metadata (district, summaryOrCaption) does not crash", async () => {
    vi.mocked(loaders.loadGrantProfiles).mockReturnValue([
      { grantId: "G1", donor: "D1", grantName: "G", month: "2025-09", budgetLines: "L", approvedBudgetUnits: 1000, monthlyUtilizedUnits: 100, cumulativeUtilizedUnits: 500, cumulativeUtilizationRate: 0.5, financeNote: "" }
    ]);
    vi.mocked(loaders.loadGrantPerformance).mockReturnValue([
      makePerformance({ grantId: "G1", month: "2025-09" })
    ]);
    // Evidence row with no optional fields — district and summaryOrCaption absent
    vi.mocked(loaders.loadEvidenceAssets).mockReturnValue([
      { grantId: "G1", month: "2025-09", recordId: "MIN_01", assetType: "image", title: "Minimal", relativePath: "x.png", usageNote: "" },
    ]);

    const facts = getGrantReportFacts("G1", "2025-09");
    // generateNarrative must not throw when optional fields are absent
    const result = await generateNarrative(facts, false);

    expect(result.sourceFacts.evidenceRefs).toHaveLength(1);
    expect(result.sourceFacts.evidenceRefs[0].recordId).toBe("MIN_01");
    // Optional fields absent — must be undefined, not crash
    expect(result.sourceFacts.evidenceRefs[0].district).toBeUndefined();
    // Narrative traceability must still pass deterministically
    expect(result.validationStatus).toBe("Passed");
  });
});

// ---------------------------------------------------------------------------
// AI Provider & Fallback Logic (existing)
// ---------------------------------------------------------------------------

describe("AI Provider & Fallback Logic", () => {
  const dummyFacts = {
    profile: {
      grantId: "G1", donor: "D1", grantName: "Test Grant", month: "2025-07",
      budgetLines: "All", approvedBudgetUnits: 1000, monthlyUtilizedUnits: 100,
      cumulativeUtilizedUnits: 500, cumulativeUtilizationRate: 0.5, financeNote: "OK"
    },
    performance: {
      grantId: "G1", month: "2025-07", riskStatus: "On Track", reportStatus: "Draft",
      milestoneSummary: "Milestone 1 reached", draftReportText: "Looks good",
      pblCompletionRate: 0.85, evidenceSubmissionRate: 0.72,
      totalEnrollment: 1000, totalAttendance: 850, attendanceRate: 0.85,
    },
    evidence: [
      { grantId: "G1", month: "2025-07", recordId: "E1", assetType: "image", title: "Pic", usageNote: "For report", relativePath: "a.jpg" }
    ]
  };

  it("deterministic fallback does not contain prohibited operational/unsupported wording", () => {
    const text = generateDeterministicNarrative(dummyFacts);
    expect(text).not.toMatch(/field team/i);
    expect(text).not.toMatch(/continued implementation/i);
    expect(text).not.toMatch(/supported by/i);
    // Should explicitly state the facts
    expect(text).toContain("In 2025-07, the Test Grant reported on its progress");
    expect(text).toContain("50.0%");
  });

  it("mock AI does not contain prohibited operational/unsupported wording", async () => {
    const result = await generateNarrative(dummyFacts, true);
    expect(result.narrative).not.toMatch(/field team/i);
    expect(result.narrative).not.toMatch(/has shown progress/i);
    // Should explicitly state the facts
    expect(result.narrative).toContain("reported a cumulative budget utilization of 50.0%");
    expect(result.narrative).toContain(evidenceCountPhrase(1));
  });

  it("sourceFacts correctly passes expanded context", async () => {
    const result = await generateNarrative(dummyFacts, false);
    expect(result.sourceFacts.approvedBudgetUnits).toBe(1000);
    expect(result.sourceFacts.cumulativeUtilizedUnits).toBe(500);
    expect(result.sourceFacts.milestoneSummary).toBe("Milestone 1 reached");
    expect(result.sourceFacts.financeNote).toBe("OK");
  });
});

// ---------------------------------------------------------------------------
// Narrative Validation — hardened (Task 3)
// ---------------------------------------------------------------------------

describe("Narrative Validation", () => {
  // Facts with 3 evidence items and a 25% utilization rate
  const validFacts = {
    profile: {
      grantId: "G2", donor: "D2", grantName: "Test Grant B", month: "2025-08",
      budgetLines: "All", approvedBudgetUnits: 1000, monthlyUtilizedUnits: 100,
      cumulativeUtilizedUnits: 250, cumulativeUtilizationRate: 0.25, financeNote: ""
    },
    performance: {
      grantId: "G2", month: "2025-08", riskStatus: "At Risk", reportStatus: "Draft",
      milestoneSummary: "", draftReportText: "",
      pblCompletionRate: 0.81, evidenceSubmissionRate: 0.61,
      totalEnrollment: 100478, totalAttendance: 105100, attendanceRate: 0.523,
    },
    evidence: [
      { grantId: "G2", month: "2025-08", recordId: "E1", assetType: "image", title: "Pic", usageNote: "", relativePath: "a.jpg" },
      { grantId: "G2", month: "2025-08", recordId: "E2", assetType: "image", title: "Pic", usageNote: "", relativePath: "b.jpg" },
      { grantId: "G2", month: "2025-08", recordId: "E3", assetType: "news_clipping", title: "Pic", usageNote: "", relativePath: "c.jpg" }
    ]
  };

  /** Build a valid baseline narrative using the controlled phrase. */
  const goodBase =
    `In 2025-08, the Test Grant B reported on its progress. ` +
    `Cumulative budget utilization reached 25.0%. ` +
    `Program status is currently classified as At Risk. ` +
    `Milestone Summary: \n\n` +
    `Evidence Status: ${evidenceCountPhrase(3)} are associated with this period.`;

  // 1 — valid grounded narrative passes
  it("passes when correctly grounded narrative contains all required facts", () => {
    expect(validateNarrative(goodBase, validFacts)).toBe(true);
  });

  // 2 — missing grant name fails
  it("fails if grant name is absent from narrative", () => {
    const bad = goodBase.replace("Test Grant B", "GRANT_NAME_MISSING");
    expect(validateNarrative(bad, validFacts)).toBe(false);
  });

  // 3 — missing month fails
  it("fails if month is absent from narrative", () => {
    const bad = goodBase.replace("2025-08", "WRONG-MONTH");
    expect(validateNarrative(bad, validFacts)).toBe(false);
  });

  // 4 — missing utilization fails
  it("fails if utilization percentage is absent from narrative", () => {
    const bad = goodBase.replace("25.0%", "XX.X%");
    expect(validateNarrative(bad, validFacts)).toBe(false);
  });

  // 5 — missing risk status fails
  it("fails if risk status is absent from narrative", () => {
    const bad = goodBase.replace("At Risk", "On Track");
    expect(validateNarrative(bad, validFacts)).toBe(false);
  });

  // 6 — missing evidence count phrase fails
  it("fails if the controlled evidence-count phrase is absent", () => {
    // Remove only the count phrase; all other facts are present
    const bad = goodBase.replace(evidenceCountPhrase(3), "REDACTED reference assets");
    expect(validateNarrative(bad, validFacts)).toBe(false);
  });

  // 7 — utilization-only narrative fails (all other required strings absent)
  it("fails for a utilization-only narrative missing month, grant name, risk and evidence count", () => {
    const bad = "Budget utilization is 25.0%.";
    expect(validateNarrative(bad, validFacts)).toBe(false);
  });

  // 8 — fabricated wording fails
  it("fails for fabricated prose that coincidentally contains some fact values", () => {
    // Mentions percentage and month but fabricates the rest
    const bad = "We made great strides in 2025-08 with a 25.0% budget used.";
    // Missing grant name, risk status, evidence count phrase
    expect(validateNarrative(bad, validFacts)).toBe(false);
  });

  // 9 — unrelated sentence containing "Insufficient data" fails
  it("fails when narrative contains the words 'Insufficient data' in unrelated prose (null facts)", () => {
    // The old check was: narrative.includes("Insufficient data") => return true
    // An attacker could bypass validation by including the phrase in fabricated prose.
    // With null profile/performance, the new code must NOT accept arbitrary text — only
    // the exact INSUFFICIENT_DATA_NARRATIVE constant passes.
    const noDataFacts = { profile: null, performance: null, evidence: [] } as unknown as GrantFacts;
    const fabricated = "Insufficient data for schools. However, we achieved our targets.";
    expect(validateNarrative(fabricated, noDataFacts)).toBe(false);
  });

  // 10 — valid controlled insufficient-data fallback passes
  it("passes for the exact deterministic insufficient-data fallback phrase", () => {
    const noDataFacts = { profile: null, performance: null, evidence: [] } as unknown as GrantFacts;
    expect(validateNarrative(INSUFFICIENT_DATA_NARRATIVE, noDataFacts)).toBe(true);
  });

  // 11 — evidence count substring collision does not pass
  it("does not pass when a larger number contains the expected count as a substring", () => {
    // validFacts has 3 evidence items; the narrative contains "103" which includes "3"
    // Old bare-number check would have matched "3" inside "103" — the new phrase check must not
    const collisionFacts = {
      profile: {
        grantId: "G3", donor: "D3", grantName: "Collision Grant", month: "2025-08",
        budgetLines: "All", approvedBudgetUnits: 1000, monthlyUtilizedUnits: 100,
        cumulativeUtilizedUnits: 300, cumulativeUtilizationRate: 0.3, financeNote: ""
      },
      performance: {
        grantId: "G3", month: "2025-08", riskStatus: "On Track", reportStatus: "Draft",
        milestoneSummary: "", draftReportText: "",
        pblCompletionRate: null, evidenceSubmissionRate: null,
        totalEnrollment: null, totalAttendance: null, attendanceRate: null,
      },
      // 3 evidence items — bare "3" would collide with "103", "30", etc. in the text
      evidence: [
        { grantId: "G3", month: "2025-08", recordId: "R1", assetType: "image", title: "A", usageNote: "", relativePath: "a.png" },
        { grantId: "G3", month: "2025-08", recordId: "R2", assetType: "image", title: "B", usageNote: "", relativePath: "b.png" },
        { grantId: "G3", month: "2025-08", recordId: "R3", assetType: "image", title: "C", usageNote: "", relativePath: "c.png" },
      ]
    };
    // Narrative with "103" and "30.0%" (contains digit "3" as substring) but no controlled phrase
    const collisionNarrative =
      "In 2025-08, the Collision Grant reported on its progress. " +
      "Cumulative budget utilization reached 30.0%. " +
      "Program status is currently classified as On Track. " +
      "There were 103 schools visited this period.";
    // Should FAIL: phrase "3 reference assets" is absent even though "3" appears inside "103" and "30.0"
    expect(validateNarrative(collisionNarrative, collisionFacts)).toBe(false);
  });
});
