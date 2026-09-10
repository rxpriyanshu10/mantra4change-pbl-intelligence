import { getProgramReview, getAvailableFilters } from "@/lib/application/programReviewService";
import { buildReviewSummary } from "@/lib/application/reviewSummaryService";
import FilterBar from "@/components/filters/FilterBar";
import KpiGrid from "@/components/kpi/KpiGrid";
import GeographyTable from "@/components/geography/GeographyTable";
import MonthlyReviewSummary from "@/components/review/MonthlyReviewSummary";

export default async function ProgramReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const options = getAvailableFilters();
  
  const filterMonth = params.month || options.months[0] || "All";
  
  const facts = getProgramReview({
    month: filterMonth,
    district: params.district,
    block: params.block,
    grade: params.grade,
    subject: params.subject,
  });

  const reviewSummary = buildReviewSummary(facts);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Program Review</h1>
          <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
            {filterMonth}
          </div>
        </div>
        <p className="text-slate-500 max-w-2xl">
          Monitor program performance and identify deterministic signals to prepare for the review discussion.
        </p>
      </div>

      <FilterBar options={options} />
      
      <KpiGrid metrics={facts.currentMetrics} momChanges={facts.momChanges} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GeographyTable title="District Performance" data={facts.districts} />
        <GeographyTable title="Block Performance" data={facts.blocks} />
      </div>

      <MonthlyReviewSummary summary={reviewSummary} />
    </div>
  );
}
