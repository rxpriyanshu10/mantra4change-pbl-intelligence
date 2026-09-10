import { loadGrantProfiles, loadGrantPerformance, loadEvidenceAssets } from "../data/loaders";
import { GrantProfile, GrantPerformance, EvidenceAsset } from "@/types/domain";

export type GrantFacts = {
  profile: GrantProfile | null;
  performance: GrantPerformance | null;
  evidence: EvidenceAsset[];
};

export function getGrantReportFacts(grantId: string, month: string): GrantFacts {
  const profiles = loadGrantProfiles();
  const performances = loadGrantPerformance();
  const assets = loadEvidenceAssets();

  const profileRows = profiles.filter((p) => p.grantId === grantId && p.month === month);
  let profile: GrantProfile | null = null;
  if (profileRows.length > 0) {
    const first = profileRows[0];
    const totalApproved = profileRows.reduce((sum, p) => sum + p.approvedBudgetUnits, 0);
    const totalUtilizedMonthly = profileRows.reduce((sum, p) => sum + p.monthlyUtilizedUnits, 0);
    const totalUtilizedCumulative = profileRows.reduce((sum, p) => sum + p.cumulativeUtilizedUnits, 0);
    
    // Join distinct finance notes
    const distinctNotes = Array.from(new Set(profileRows.map((p) => p.financeNote).filter(Boolean)));
    const financeNote = distinctNotes.length > 0 ? distinctNotes.join("; ") : "";

    profile = {
      grantId: first.grantId,
      donor: first.donor,
      grantName: first.grantName,
      month: first.month,
      budgetLines: profileRows.map((p) => p.budgetLines).join(", "),
      approvedBudgetUnits: totalApproved,
      monthlyUtilizedUnits: totalUtilizedMonthly,
      cumulativeUtilizedUnits: totalUtilizedCumulative,
      cumulativeUtilizationRate: totalApproved > 0 ? totalUtilizedCumulative / totalApproved : 0,
      financeNote,
    };
  }

  const performance = performances.find((p) => p.grantId === grantId && p.month === month) || null;
  const evidence = assets.filter((a) => a.grantId === grantId && a.month === month);

  return { profile, performance, evidence };
}

export function getAvailableGrantFilters() {
  const profiles = loadGrantProfiles();
  const grantIds = Array.from(new Set(profiles.map((p) => p.grantId))).filter(Boolean).sort();
  const months = Array.from(new Set(profiles.map((p) => p.month))).filter(Boolean).sort().reverse();
  return { grantIds, months };
}
