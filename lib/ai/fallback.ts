import { GrantFacts } from "../application/grantReportService";

/**
 * The exact, immutable phrase emitted by the deterministic fallback when source
 * data is incomplete. validateNarrative() checks for this precise string —
 * not a substring — so arbitrary prose containing the words "Insufficient data"
 * cannot bypass validation.
 */
export const INSUFFICIENT_DATA_NARRATIVE =
  "Insufficient data to generate a report for the selected grant and month. Please ensure both finance and performance records exist.";

/**
 * Controlled evidence-count phrase used by both the deterministic fallback and
 * the mock AI adapter. validateNarrative() checks for this exact pattern so
 * a bare count digit cannot collide with other numbers in the narrative.
 *
 * Example output: "3 reference assets"
 */
export function evidenceCountPhrase(count: number): string {
  return `${count} reference assets`;
}

export function generateDeterministicNarrative(facts: GrantFacts): string {
  if (!facts.profile || !facts.performance) {
    return INSUFFICIENT_DATA_NARRATIVE;
  }

  const p = facts.profile;
  const perf = facts.performance;

  return `In ${p.month}, the ${p.grantName} reported on its progress. ` +
         `Cumulative budget utilization reached ${(p.cumulativeUtilizationRate * 100).toFixed(1)}%. ` +
         `Program status is currently classified as ${perf.riskStatus}. ` +
         `\n\nMilestone Summary: ${perf.milestoneSummary}\n\n` +
         `Evidence Status: ${evidenceCountPhrase(facts.evidence.length)} are associated with this period. ` +
         `\n\nDraft Notes: ${perf.draftReportText}`;
}
