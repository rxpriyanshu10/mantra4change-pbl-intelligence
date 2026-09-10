import { PriorityResult } from "@/lib/domain/priorities";

export default function GeographyTable({
  title,
  data,
}: {
  title: string;
  data: PriorityResult[];
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500 font-medium">
              <th className="px-6 py-3 font-medium">Geography</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Participation %</th>
              <th className="px-6 py-3 font-medium text-right">Evidence %</th>
              <th className="px-6 py-3 font-medium text-right">Attendance %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  No data available for the selected filters.
                </td>
              </tr>
            )}
            {data.map((row) => (
              <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-700">{row.name}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider font-bold ${
                      row.riskStatus === "Critical"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : row.riskStatus === "At Risk"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : row.riskStatus === "Behind"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : row.riskStatus === "On Track"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                    title={`Gap to 75% target: ${row.gapToTarget.toFixed(1)} pp`}
                  >
                    {row.riskStatus}
                  </span>
                </td>
                <td className="px-6 py-4 text-right tabular-nums">
                  {row.metrics.participationRate !== null
                    ? `${row.metrics.participationRate.toFixed(1)}%`
                    : "N/A"}
                </td>
                <td className="px-6 py-4 text-right tabular-nums">
                  {row.metrics.evidenceSubmissionRate !== null
                    ? `${row.metrics.evidenceSubmissionRate.toFixed(1)}%`
                    : "N/A"}
                </td>
                <td className="px-6 py-4 text-right tabular-nums text-slate-500">
                  {row.metrics.attendanceRate !== null
                    ? `${row.metrics.attendanceRate.toFixed(1)}%`
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
