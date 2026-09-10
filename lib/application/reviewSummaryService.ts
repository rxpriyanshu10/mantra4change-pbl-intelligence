import { ProgramReviewFacts } from "./programReviewService";

export type ReviewSummary = {
  achievements: string[];
  changes: string[];
  risks: string[];
  priorities: string[];
  discussionPoints: string[];
};

export function buildReviewSummary(facts: ProgramReviewFacts): ReviewSummary {
  const achievements: string[] = [];
  const changes: string[] = [];
  const risks: string[] = [];
  const priorities: string[] = [];
  const discussionPoints: string[] = [];

  const m = facts.currentMetrics;
  const mom = facts.momChanges;

  if (m.participationRate && m.participationRate >= 75) {
    achievements.push(`Participation rate is On Track at ${m.participationRate.toFixed(1)}%.`);
  }
  if (m.evidenceSubmissionRate && m.evidenceSubmissionRate >= 75) {
    achievements.push(`Evidence submission is strong at ${m.evidenceSubmissionRate.toFixed(1)}%.`);
  }
  if (m.attendanceRate && m.attendanceRate >= 75) {
    achievements.push(`Attendance rate reached ${m.attendanceRate.toFixed(1)}%.`);
  }
  if (achievements.length === 0) {
    achievements.push("No major targets were met this month. Focus on foundational improvements.");
  }

  if (mom.participationRate !== null) {
    changes.push(`Participation changed by ${mom.participationRate > 0 ? "+" : ""}${mom.participationRate.toFixed(1)} pp compared to last month.`);
  }
  if (mom.evidenceSubmissionRate !== null) {
    changes.push(`Evidence submission changed by ${mom.evidenceSubmissionRate > 0 ? "+" : ""}${mom.evidenceSubmissionRate.toFixed(1)} pp compared to last month.`);
  }
  if (changes.length === 0) {
    changes.push("No prior month data available for comparison.");
  }

  if (m.participationRate !== null && m.participationRate < 60) {
    risks.push(`Participation rate is below 60% at ${m.participationRate.toFixed(1)}%, which falls in the At Risk or Critical band.`);
  }
  if (m.evidenceSubmissionRate !== null && m.evidenceSubmissionRate < 60) {
    risks.push(`Evidence submission rate is below 60% at ${m.evidenceSubmissionRate.toFixed(1)}%.`);
  }
  if (m.attendanceRate !== null && m.attendanceRate < 60) {
    risks.push(`Attendance rate is below 60% at ${m.attendanceRate.toFixed(1)}%.`);
  }
  if (risks.length === 0) {
    risks.push("No major program-level metric risks identified.");
  }

  const topDistrict = facts.districts[0];
  if (topDistrict && ["Critical", "At Risk"].includes(topDistrict.riskStatus)) {
    priorities.push(
      `${topDistrict.name} is a priority review district: participation is ${topDistrict.metrics.participationRate?.toFixed(1) ?? "N/A"}%, which is ${topDistrict.gapToTarget.toFixed(1)} pp below the 75% target.`
    );
  }
  const topBlock = facts.blocks[0];
  if (topBlock && ["Critical", "At Risk"].includes(topBlock.riskStatus)) {
    priorities.push(
      `${topBlock.name} is a priority review block: participation is ${topBlock.metrics.participationRate?.toFixed(1) ?? "N/A"}%, which is ${topBlock.gapToTarget.toFixed(1)} pp below the 75% target.`
    );
  }
  if (priorities.length === 0) {
    priorities.push("No critical geographies identified. Continue routine monitoring.");
  }

  discussionPoints.push("What contextual factors or operational challenges are driving the highest gaps in priority geographies?");
  discussionPoints.push("For locations with high participation but low evidence, is the gap technical (upload issues) or behavioral?");

  return { achievements, changes, risks, priorities, discussionPoints };
}
