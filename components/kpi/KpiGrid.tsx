import { MetricResult } from "@/lib/domain/metrics";
import { classifyRisk } from "@/lib/domain/risk";

function formatPercent(value: number | null) {
  if (value === null) return "N/A";
  return `${value.toFixed(1)}%`;
}

function formatMoM(value: number | null) {
  if (value === null) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} pp`;
}

function RiskBadge({ rate, name }: { rate: number | null; name: string }) {
  const result = classifyRisk(rate, name);
  const colors = {
    "On Track": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Behind": "bg-amber-50 text-amber-700 border-amber-200",
    "At Risk": "bg-orange-50 text-orange-700 border-orange-200",
    "Critical": "bg-rose-50 text-rose-700 border-rose-200",
    "N/A": "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span title={result.explanation} className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-bold ${colors[result.status]}`}>
      {result.status}
    </span>
  );
}

export default function KpiGrid({
  metrics,
  momChanges,
}: {
  metrics: MetricResult;
  momChanges: Record<keyof MetricResult, number | null>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col">
        <h3 className="text-sm font-medium text-slate-500 mb-1">Total Schools</h3>
        <div className="text-2xl font-bold text-slate-800">{metrics.totalSchools}</div>
        <div className="text-xs text-slate-400 mt-2 font-medium">
           {metrics.participatingSchools} Participating
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col relative group">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-sm font-medium text-slate-500">Participation</h3>
          <RiskBadge rate={metrics.participationRate} name="Participation" />
        </div>
        <div className="text-2xl font-bold text-slate-800">{formatPercent(metrics.participationRate)}</div>
        {momChanges.participationRate !== null && (
          <div className="text-xs font-medium mt-2 flex items-center gap-1 text-slate-500">
            <span className={momChanges.participationRate > 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
              {formatMoM(momChanges.participationRate)}
            </span>
            <span>vs previous month</span>
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col relative">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-sm font-medium text-slate-500">Evidence Submission</h3>
          <RiskBadge rate={metrics.evidenceSubmissionRate} name="Evidence Submission" />
        </div>
        <div className="text-2xl font-bold text-slate-800">{formatPercent(metrics.evidenceSubmissionRate)}</div>
        {momChanges.evidenceSubmissionRate !== null && (
          <div className="text-xs font-medium mt-2 flex items-center gap-1 text-slate-500">
            <span className={momChanges.evidenceSubmissionRate > 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
              {formatMoM(momChanges.evidenceSubmissionRate)}
            </span>
            <span>vs previous month</span>
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col relative">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-sm font-medium text-slate-500">Attendance Rate</h3>
          <RiskBadge rate={metrics.attendanceRate} name="Attendance Rate" />
        </div>
        <div className="text-2xl font-bold text-slate-800">{formatPercent(metrics.attendanceRate)}</div>
        <div className="text-xs text-slate-400 mt-2 font-medium">
           {metrics.totalAttendance.toLocaleString()} / {metrics.totalEnrollment.toLocaleString()} students
        </div>
      </div>
    </div>
  );
}
