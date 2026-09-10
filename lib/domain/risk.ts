export type RiskStatus = "On Track" | "Behind" | "At Risk" | "Critical" | "N/A";

export type RiskResult = {
  status: RiskStatus;
  metricName: string;
  observedRate: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  explanation: string;
};

export function classifyRisk(rate: number | null, metricName: string): RiskResult {
  if (rate === null) {
    return {
      status: "N/A",
      metricName,
      observedRate: rate,
      lowerBound: null,
      upperBound: null,
      explanation: `No data available for ${metricName}.`,
    };
  }

  if (rate >= 75) {
    return {
      status: "On Track",
      metricName,
      observedRate: rate,
      lowerBound: 75,
      upperBound: 100,
      explanation: `${metricName} is ${rate.toFixed(1)}%, which is On Track (>= 75%).`,
    };
  }
  
  if (rate >= 60) {
    return {
      status: "Behind",
      metricName,
      observedRate: rate,
      lowerBound: 60,
      upperBound: 75,
      explanation: `${metricName} is ${rate.toFixed(1)}%, which falls in the 60%–<75% Behind band.`,
    };
  }

  if (rate >= 35) {
    return {
      status: "At Risk",
      metricName,
      observedRate: rate,
      lowerBound: 35,
      upperBound: 60,
      explanation: `${metricName} is ${rate.toFixed(1)}%, which falls in the 35%–<60% At Risk band.`,
    };
  }

  return {
    status: "Critical",
    metricName,
    observedRate: rate,
    lowerBound: 0,
    upperBound: 35,
    explanation: `${metricName} is ${rate.toFixed(1)}%, which falls in the <35% Critical band.`,
  };
}
