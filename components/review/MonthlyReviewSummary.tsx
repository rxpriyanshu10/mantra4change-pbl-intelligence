import { ReviewSummary } from "@/lib/application/reviewSummaryService";

export default function MonthlyReviewSummary({ summary }: { summary: ReviewSummary }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-bold text-lg text-slate-900">Monthly Review Summary</h2>
          <p className="text-slate-500 text-sm mt-1">Automatically generated from deterministic program facts.</p>
        </div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded shadow-sm">
          Deterministic Artifact
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="p-6 space-y-8 bg-white">
          <section>
            <h3 className="font-semibold text-emerald-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Achievements
            </h3>
            {summary.achievements.length > 0 ? (
              <ul className="space-y-3">
                {summary.achievements.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-700 pl-4 border-l-2 border-emerald-100 leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-400 italic">No notable achievements derived.</div>
            )}
          </section>

          <section>
            <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Month-over-Month Changes
            </h3>
            {summary.changes.length > 0 ? (
              <ul className="space-y-3">
                {summary.changes.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-700 pl-4 border-l-2 border-blue-100 leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-400 italic">No MoM comparisons available.</div>
            )}
          </section>
        </div>

        <div className="p-6 space-y-8 bg-slate-50/50">
          <section>
            <h3 className="font-semibold text-rose-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Gaps &amp; Risks
            </h3>
            {summary.risks.length > 0 ? (
              <ul className="space-y-3">
                {summary.risks.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-700 pl-4 border-l-2 border-rose-100 leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-400 italic">No significant gaps detected.</div>
            )}
          </section>

          <section>
            <h3 className="font-semibold text-indigo-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Priority Geographies
            </h3>
            {summary.priorities.length > 0 ? (
              <ul className="space-y-3">
                {summary.priorities.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-700 pl-4 border-l-2 border-indigo-100 leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-400 italic">No priority geographies isolated.</div>
            )}
          </section>
        </div>
      </div>

      <div className="px-6 py-5 bg-amber-50 border-t border-amber-100">
        <h3 className="font-semibold text-amber-900 mb-3 text-sm uppercase tracking-wide">Discussion Points for Review</h3>
        {summary.discussionPoints.length > 0 ? (
          <ul className="space-y-2">
            {summary.discussionPoints.map((item, idx) => (
              <li key={idx} className="text-sm text-amber-800/90 leading-relaxed flex items-start gap-2">
                <span className="mt-1 text-amber-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-amber-700/60 italic">No specific discussion points formulated.</div>
        )}
      </div>
    </div>
  );
}
