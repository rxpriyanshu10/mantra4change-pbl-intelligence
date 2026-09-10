import { PBLRecord } from "@/types/domain";
import { calculateMetrics, MetricResult } from "./metrics";

export type GeographyAggregation = {
  name: string;
  metrics: MetricResult;
};

export function aggregateByDistrict(records: PBLRecord[]): GeographyAggregation[] {
  const byDistrict = new Map<string, PBLRecord[]>();
  for (const r of records) {
    if (!r.district) continue;
    if (!byDistrict.has(r.district)) byDistrict.set(r.district, []);
    byDistrict.get(r.district)!.push(r);
  }
  
  return Array.from(byDistrict.entries()).map(([name, distRecords]) => ({
    name,
    metrics: calculateMetrics(distRecords),
  }));
}

export function aggregateByBlock(records: PBLRecord[]): GeographyAggregation[] {
  const byBlock = new Map<string, PBLRecord[]>();
  for (const r of records) {
    if (!r.block) continue;
    if (!byBlock.has(r.block)) byBlock.set(r.block, []);
    byBlock.get(r.block)!.push(r);
  }
  
  return Array.from(byBlock.entries()).map(([name, blockRecords]) => ({
    name,
    metrics: calculateMetrics(blockRecords),
  }));
}
