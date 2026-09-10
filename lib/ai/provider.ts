import { GrantFacts } from "../application/grantReportService";
import {
  generateDeterministicNarrative,
  INSUFFICIENT_DATA_NARRATIVE,
  evidenceCountPhrase,
} from "./fallback";

/**
 * A single source-backed evidence reference.
 * All fields come directly from the evidence CSV — nothing is fabricated.
 */
export type EvidenceRef = {
  /** Unique record ID from the source CSV (e.g. MEDIA_AA_01). */
  recordId: string;
  /** Media/asset type from the source CSV (e.g. "image", "news_clipping"). */
  assetType: string;
  /** Human-readable title from the source CSV. */
  title: string;
  /** Relative file path from the source CSV — the strongest file identifier. */
  relativePath: string;
  /** District label if present in the source CSV row. */
  district?: string;
};

export type SourceFacts = {
  grantId: string | undefined;
  grantName: string | undefined;
  donor: string | undefined;
  month: string | undefined;
  approvedBudgetUnits: number | undefined;
  monthlyUtilizedUnits: number | undefined;
  cumulativeUtilizedUnits: number | undefined;
  utilizationRate: number | undefined;
  riskStatus: string | undefined;
  evidenceCount: number;
  /**
   * Structured list of source-backed evidence references.
   * Each entry maps 1-to-1 with a row in the evidence CSV for this grant/month.
   * No values are fabricated — missing optional fields are simply absent.
   */
  evidenceRefs: EvidenceRef[];
  milestoneSummary: string | undefined;
  financeNote: string | undefined;
  // Outcome metrics — sourced from GrantPerformance; null when absent in CSV
  pblCompletionRate: number | null | undefined;
  evidenceSubmissionRate: number | null | undefined;
  totalEnrollment: number | null | undefined;
  totalAttendance: number | null | undefined;
  attendanceRate: number | null | undefined;
};

export type NarrativeResult = {
  narrative: string;
  sourceFacts: SourceFacts;
  provider: string;
  fallbackUsed: boolean;
  validationStatus: "Passed" | "Failed";
};

export function validateNarrative(narrative: string, facts: GrantFacts): boolean {
  // Insufficient-data path: only the exact deterministic fallback phrase is accepted.
  // An arbitrary sentence that happens to contain the words "Insufficient data" must NOT pass.
  if (narrative === INSUFFICIENT_DATA_NARRATIVE) return true;

  if (!facts.profile || !facts.performance) return false;

  const expectedStrings: string[] = [];

  // Required structured facts
  if (facts.profile.month) expectedStrings.push(facts.profile.month);
  if (facts.profile.grantName) expectedStrings.push(facts.profile.grantName);

  const utilStr = (facts.profile.cumulativeUtilizationRate * 100).toFixed(1);
  expectedStrings.push(utilStr);

  if (facts.performance.riskStatus) {
    expectedStrings.push(facts.performance.riskStatus);
  }

  // Evidence count: require the controlled phrase "N reference assets" so a bare
  // digit cannot collide with another number appearing in the narrative text.
  expectedStrings.push(evidenceCountPhrase(facts.evidence.length));

  return expectedStrings.every((s) => narrative.includes(s));
}

export async function generateNarrative(facts: GrantFacts, useAI: boolean = false): Promise<NarrativeResult> {
  // Build source-backed evidence references — one per CSV row, no fabrication
  const evidenceRefs: EvidenceRef[] = facts.evidence.map((a) => ({
    recordId: a.recordId,
    assetType: a.assetType,
    title: a.title,
    relativePath: a.relativePath,
    ...(a.district ? { district: a.district } : {}),
  }));

  const sourceFacts: SourceFacts = {
    grantId: facts.profile?.grantId,
    grantName: facts.profile?.grantName,
    donor: facts.profile?.donor,
    month: facts.profile?.month,
    approvedBudgetUnits: facts.profile?.approvedBudgetUnits,
    monthlyUtilizedUnits: facts.profile?.monthlyUtilizedUnits,
    cumulativeUtilizedUnits: facts.profile?.cumulativeUtilizedUnits,
    utilizationRate: facts.profile?.cumulativeUtilizationRate,
    riskStatus: facts.performance?.riskStatus,
    evidenceCount: facts.evidence.length,
    evidenceRefs,
    milestoneSummary: facts.performance?.milestoneSummary,
    financeNote: facts.profile?.financeNote,
    // Outcome metrics — pass through exactly as-is from the performance record
    pblCompletionRate: facts.performance?.pblCompletionRate,
    evidenceSubmissionRate: facts.performance?.evidenceSubmissionRate,
    totalEnrollment: facts.performance?.totalEnrollment,
    totalAttendance: facts.performance?.totalAttendance,
    attendanceRate: facts.performance?.attendanceRate,
  };

  // If AI is disabled or fails, we use fallback
  let narrative = "";
  let fallbackUsed = true;
  let provider = "Deterministic Template";

  if (useAI) {
    try {
      // In a real application, we would call an LLM API (e.g., OpenAI, Gemini) here
      // const response = await llmClient.generate(prompt);
      // narrative = response.text;
      
      // For this assessment without external keys, we simulate an AI rewrite
      const utilRate = facts.profile ? (facts.profile.cumulativeUtilizationRate * 100).toFixed(1) : "N/A";
      narrative = `(AI Generated) In ${facts.profile?.month}, the ${facts.profile?.grantName} reported a cumulative budget utilization of ${utilRate}%. Current performance evaluation classifies the grant as ${facts.performance?.riskStatus}. There are ${evidenceCountPhrase(facts.evidence.length)} associated with this reporting period. Notes: ${facts.performance?.draftReportText}`;
      fallbackUsed = false;
      provider = "Mock AI Adapter";
    } catch {
      narrative = generateDeterministicNarrative(facts);
      fallbackUsed = true;
      provider = "Deterministic Fallback (AI Failed)";
    }
  } else {
    narrative = generateDeterministicNarrative(facts);
  }

  const validationStatus = validateNarrative(narrative, facts) ? "Passed" : "Failed";

  return {
    narrative,
    sourceFacts,
    provider,
    fallbackUsed,
    validationStatus,
  };
}
