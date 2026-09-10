import { GeographyAggregation } from "./geography";
import { classifyRisk, RiskStatus } from "./risk";

export type PriorityResult = GeographyAggregation & {
  riskStatus: RiskStatus;
  gapToTarget: number;
};

const RISK_WEIGHT: Record<RiskStatus, number> = {
  "Critical": 4,
  "At Risk": 3,
  "Behind": 2,
  "On Track": 1,
  "N/A": 0
};

export function rankPriorities(aggregations: GeographyAggregation[]): PriorityResult[] {
  const results = aggregations.map(agg => {
    // Primary ranking uses Participation Rate, as per architecture assumption A-004
    const rate = agg.metrics.participationRate;
    const riskResult = classifyRisk(rate, "Participation Rate");
    const gapToTarget = rate !== null ? Math.max(0, 75 - rate) : 0;
    
    return {
      ...agg,
      riskStatus: riskResult.status,
      gapToTarget
    };
  });
  
  return results.sort((a, b) => {
    if (RISK_WEIGHT[a.riskStatus] !== RISK_WEIGHT[b.riskStatus]) {
      return RISK_WEIGHT[b.riskStatus] - RISK_WEIGHT[a.riskStatus];
    }
    
    if (a.gapToTarget !== b.gapToTarget) {
      return b.gapToTarget - a.gapToTarget;
    }
    
    const aEvid = a.metrics.evidenceSubmissionRate ?? 100;
    const bEvid = b.metrics.evidenceSubmissionRate ?? 100;
    if (aEvid !== bEvid) return aEvid - bEvid; 
    
    return a.name.localeCompare(b.name);
  });
}
