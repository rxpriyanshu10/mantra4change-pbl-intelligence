# Mantra4Change PBL Program Intelligence & Grant Reporting Assistant

## Product Purpose
This application is an internal decision-support system designed to transform monthly school-level Project-Based Learning (PBL) responses into deterministic program intelligence. It helps users prepare for monthly reviews and assemble grant-reporting sections from structured facts. 

**Decision Support Boundary**: The application provides deterministic signals by calculating objective results (KPIs, risks, rankings). Evaluators and users interpret these results to make operational decisions. Rankings and risk statuses are informational signals, not autonomous instructions.

## Key Workflows
1. **Program Review**: Users filter by month, district, block, grade, or subject to view deterministic KPI cards, month-over-month trends, district/block performance rankings, and a Monthly Review Summary generated from deterministic program facts (detailing Achievements, Month-over-Month Changes, Gaps & Risks, Priority Geographies, and Discussion Points).
2. **Grant Reporting**: Users select a grant and month to view finance utilization, outcomes, milestones, and evidence. A report narrative is generated using an AI adapter (with a deterministic fallback) bounded strictly by the structured facts.

## Architecture
- **Framework**: Next.js 16.3 (App Router), React 19, Tailwind CSS v4, TypeScript 5.
- **Layers**:
  - `UI/Components`: Presentation only (Filter bars, KPI grids).
  - `Application Services`: Orchestration (`programReviewService`, `grantReportService`).
  - `Domain/Analytics`: Business rules, metrics, risk thresholds (`metrics.ts`, `risk.ts`).
  - `Data Access`: Normalizes CSV imports (`loaders/index.ts`).
  - `AI Adapter`: Generates prose strictly from structured facts (`provider.ts`, `fallback.ts`).

## Setup & Running Locally
1. Ensure Node.js 20+ is installed.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the development server at `http://localhost:3000`.

## Data Loading
The application uses local seed data (`lib/data/seed/`) copied from the assessment package. 
- PBL CSVs are parsed and normalized (unpivoted by class and subject) into `PBLRecord` typed structures using `papaparse`.
- Grant Profile, Performance, and Evidence CSVs are loaded into memory and mapped to typed structures.

## Metric Definitions
- **Total Schools**: Distinct schools.
- **Participating Schools**: Distinct schools where `projectConducted = true`.
- **Participation %**: `Participating Schools / Total Schools * 100`
- **Evidence Submission %**: `Evidence-submitting Schools / Participating Schools * 100` (Denominator is strictly participating schools to avoid dilution).
- **Attendance %**: `Total Attendance / Total Enrollment * 100`. 
  - **Enrollment Deduplication Rule**: Enrollment is a grade-level quantity, so it is deduplicated by school + grade. Each grade's enrollment is counted once, regardless of how many subjects were taught.
  - **Attendance**: Attendance remains a session-level summed value across all records.
- **MoM Movement**: Percentage point difference (`Current % - Previous %`). A previous month of data is required for a month-over-month comparison to be calculated; if unavailable, MoM is not shown.

## Risk Logic
Risk is calculated deterministically with strict, inclusive bounds:
- **On Track**: `>= 75%`
- **Behind**: `60%` to `< 75%`
- **At Risk**: `35%` to `< 60%`
- **Critical**: `< 35%`

## AI Architecture & Deterministic Fallback
- **Role of AI**: deterministic facts -> structured facts -> narrative. AI does not calculate KPIs/risk or decide actions. It acts solely as a communication layer to summarize structured facts.
- **Deterministic Fallback**: If the AI adapter is disabled or fails, `lib/ai/fallback.ts` safely generates a deterministic template from the exact same facts.
- **Evidence Traceability**: The system extracts structured evidence references directly from source CSVs (record ID, asset type, file path, district) into `SourceFacts`. Every narrative reference maps 1-to-1 with a source record without fabrication. The UI explicitly marks these as "SOURCE DATA".

## Grant Finance Aggregation
For Grant Reporting, multiple budget line items for the same grant and month are deterministically aggregated. The system sums the approved budget units, monthly utilized units, and cumulative utilized units across all rows, recalculates the overall cumulative utilization rate, and joins distinct finance notes into a single string.

## Assumptions
- School identity is uniquely determined by the synthetic school code.
- Priority rankings are primarily sorted by the gap to the 75% Participation Rate target, tie-broken by evidence rate, as a heuristic for intervention severity.
- Derived metrics pre-existing in the CSV are ignored; the application re-calculates all metrics dynamically based on the current filter scope to guarantee correctness.

## Limitations
- Datasets are loaded synchronously into memory for this assessment. Filtering massive datasets in the browser memory will not scale without pagination/SQL.
- AI Provider currently points to a Mock implementation to prevent requiring local API keys during the review.
- No deployed URL exists; this is a local application run via the `dev` script.

## How to Run Tests
The application uses Vitest for deterministic logic and boundary testing.
- Run `npm test` or `vitest run` to execute the test suite (configured in `package.json`).
- Tests cover risk boundaries, zero-denominators, missing previous months, MoM differences, filter logic, evidence traceability, and narrative validation.