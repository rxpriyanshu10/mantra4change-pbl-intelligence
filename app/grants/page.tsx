import { getAvailableGrantFilters, getGrantReportFacts } from "@/lib/application/grantReportService";
import { generateNarrative } from "@/lib/ai/provider";
import EvidenceImage from "@/components/ui/EvidenceImage";
import GrantFilterBar from "@/components/filters/GrantFilterBar";

/** Formats a 0–1 fraction as a percentage string, or "—" when null/undefined. */
function fmtPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return (val * 100).toFixed(1) + "%";
}

/** Formats an integer count with locale separators, or "—" when null/undefined. */
function fmtInt(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return Math.round(val).toLocaleString();
}

export default async function GrantReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const options = getAvailableGrantFilters();

  const grantId = params.grantId || options.grantIds[0] || "";
  const month = params.month || options.months[0] || "";

  const facts = getGrantReportFacts(grantId, month);
  
  // By default we use deterministic narrative unless toggled.
  // Passing false will use the Deterministic Fallback 
  const narrativeResult = await generateNarrative(facts, false);

  if (!facts.profile || !facts.performance) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">Grant Reporting</h1>
        <GrantFilterBar options={options} />
        <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-slate-100 text-slate-500">
          No complete grant profile found for {grantId} in {month}.
        </div>
      </div>
    );
  }

  const perf = facts.performance;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Grant Reporting</h1>
          <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
            {grantId} • {month}
          </div>
        </div>
        <p className="text-slate-500 max-w-2xl">
          Combine finance, outcomes, and evidence into a review-ready view.
        </p>
      </div>

      <GrantFilterBar options={options} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Grant Facts Panel */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">Grant Profile &amp; Utilization</h2>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Donor</div>
                <div className="font-medium text-slate-800">{facts.profile.donor}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Utilization Rate</div>
                <div className="font-medium text-slate-800 text-lg">
                  {(facts.profile.cumulativeUtilizationRate * 100).toFixed(1)}%
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Finance Note</div>
                <div className="text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-100 italic">{facts.profile.financeNote}</div>
              </div>
            </div>

            <h3 className="text-[10px] font-bold text-slate-400 mt-8 mb-4 uppercase tracking-wider">Performance &amp; Risks</h3>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Status</div>
                <span className={`inline-block px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider font-bold ${
                  perf.riskStatus === "Critical" ? "bg-rose-50 text-rose-700 border-rose-200" :
                  perf.riskStatus === "At Risk" ? "bg-orange-50 text-orange-700 border-orange-200" :
                  perf.riskStatus === "Behind" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  perf.riskStatus === "On Track" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  "bg-slate-50 text-slate-600 border-slate-200"
                }`}>
                  {perf.riskStatus}
                </span>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Report Status</div>
                <div className="font-medium text-slate-800">{perf.reportStatus}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Milestones</div>
                <div className="text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-100">{perf.milestoneSummary}</div>
              </div>
            </div>
          </div>

          {/* Outcomes Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">Program Outcomes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4 text-sm">
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">PBL Completion Rate</div>
                <div className="font-bold text-slate-900 text-xl">{fmtPct(perf.pblCompletionRate)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Evidence Submission Rate</div>
                <div className="font-bold text-slate-900 text-xl">{fmtPct(perf.evidenceSubmissionRate)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Attendance Rate</div>
                <div className="font-bold text-slate-900 text-xl">{fmtPct(perf.attendanceRate)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Total Enrollment</div>
                <div className="font-semibold text-slate-700 text-lg tabular-nums">{fmtInt(perf.totalEnrollment)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Total Attendance</div>
                <div className="font-semibold text-slate-700 text-lg tabular-nums">{fmtInt(perf.totalAttendance)}</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-6 pt-3 border-t border-slate-50">
              &ldquo;—&rdquo; indicates the value was not present in the source data for this reporting period.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">Evidence Gallery</h2>
            {facts.evidence.length === 0 ? (
              <div className="text-sm text-slate-500 bg-slate-50 border border-slate-100 p-8 text-center rounded-lg italic">
                No evidence assets available for this reporting period.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {facts.evidence.map((asset) => (
                  <div key={asset.recordId} className="border border-slate-200 rounded-lg overflow-hidden group bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-video relative overflow-hidden">
                       <EvidenceImage src={`/${asset.relativePath}`} alt={asset.title} fallbackText={asset.relativePath} />
                       <div className="absolute top-2 right-2 bg-black/60 border border-white/20 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide backdrop-blur-sm z-10">
                         {asset.assetType === "Document" ? "DOC" : "IMG"}
                       </div>
                    </div>
                    <div className="p-3">
                      <div className="font-bold text-sm text-slate-800 line-clamp-1" title={asset.title}>{asset.title}</div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed" title={asset.usageNote}>{asset.usageNote}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Narrative Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 bg-gradient-to-b from-white to-blue-50/20">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-blue-100">
              <h2 className="text-lg font-bold text-blue-900">Report Draft</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-800">
                {narrativeResult.provider}
              </span>
            </div>
            
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-white border border-slate-100 p-4 rounded-md shadow-inner">
              {narrativeResult.narrative}
            </div>
            
            <div className="mt-6 pt-5 border-t border-blue-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fact Traceability</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  narrativeResult.validationStatus === "Passed" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                }`}>
                  Validation {narrativeResult.validationStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 bg-slate-50/50 p-3 rounded border border-slate-100">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Grant Name:</span>
                  <span className="font-medium text-right max-w-[150px] truncate" title={narrativeResult.sourceFacts.grantName}>{narrativeResult.sourceFacts.grantName || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">PBL Completion:</span>
                  <span className="font-medium">{fmtPct(narrativeResult.sourceFacts.pblCompletionRate)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Total Budget:</span>
                  <span className="font-medium tabular-nums">{narrativeResult.sourceFacts.approvedBudgetUnits?.toLocaleString() || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Evidence Sub.:</span>
                  <span className="font-medium">{fmtPct(narrativeResult.sourceFacts.evidenceSubmissionRate)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Cum. Utilized:</span>
                  <span className="font-medium tabular-nums">{narrativeResult.sourceFacts.cumulativeUtilizedUnits?.toLocaleString() || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Attendance:</span>
                  <span className="font-medium">{fmtPct(narrativeResult.sourceFacts.attendanceRate)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Util. Rate:</span>
                  <span className="font-medium">{narrativeResult.sourceFacts.utilizationRate != null ? (narrativeResult.sourceFacts.utilizationRate * 100).toFixed(1) + "%" : "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Total Enroll:</span>
                  <span className="font-medium tabular-nums">{fmtInt(narrativeResult.sourceFacts.totalEnrollment)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Risk Fact:</span>
                  <span className="font-medium">{narrativeResult.sourceFacts.riskStatus || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Total Atten:</span>
                  <span className="font-medium tabular-nums">{fmtInt(narrativeResult.sourceFacts.totalAttendance)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1 col-span-2">
                  <span className="text-slate-500">Evidence Count Fact:</span>
                  <span className="font-medium">{narrativeResult.sourceFacts.evidenceCount} assets</span>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence References — source-backed, not AI-generated */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200 bg-gradient-to-b from-white to-emerald-50/20">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-emerald-100">
              <h2 className="text-lg font-bold text-emerald-900">Evidence References</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-800">
                SOURCE DATA
              </span>
            </div>
            {narrativeResult.sourceFacts.evidenceRefs.length === 0 ? (
              <div className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded border border-slate-100">No evidence references available for this grant and reporting period.</div>
            ) : (
              <ol className="space-y-3">
                {narrativeResult.sourceFacts.evidenceRefs.map((ref, idx) => (
                  <li key={ref.recordId} className="text-xs border border-slate-100 rounded-md p-3 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-mono font-bold text-emerald-700 shrink-0">
                        [{idx + 1}] {ref.recordId}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-semibold border border-slate-200">
                        {ref.assetType}
                      </span>
                    </div>
                    <div className="font-medium text-slate-800 mb-0.5 line-clamp-2" title={ref.title}>
                      {ref.title}
                    </div>
                    {ref.district && (
                      <div className="text-slate-500">
                        <span className="text-slate-400">District: </span>{ref.district}
                      </div>
                    )}
                    <div className="text-slate-400 font-mono text-[10px] mt-1 break-all bg-slate-50 px-1 py-0.5 rounded" title={ref.relativePath}>
                      {ref.relativePath}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-[10px] text-slate-400 mt-4 border-t border-emerald-100 pt-3">
              All references are sourced directly from the evidence index CSV. Record IDs, types, and paths are not generated or inferred.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

