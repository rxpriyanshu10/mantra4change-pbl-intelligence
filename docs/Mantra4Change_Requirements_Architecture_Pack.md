Mantra4Change PBL Program Intelligence
& Grant Reporting Assistant

Requirements, Product, Architecture & Implementation Specification

Assessment-aligned baseline specification • September 2026

# 0. Document Control

# 1. Executive Product Definition

Build an explainable internal decision-support application that transforms monthly school-level PBL responses into deterministic program intelligence, helps users prepare a monthly review, and assembles a grant-reporting section from structured finance, performance, milestone, risk, and evidence data.

## 1.1 Product principle

The application is a decision-support system, not a generic dashboard or autonomous decision-maker. The core architecture is raw data → normalized domain model → deterministic analytics → structured results → optional generated narrative. The system calculates and displays KPI values, risk classifications, performance rankings, and geography results deterministically. The evaluator/user interprets those results and decides what operational action, if any, should be taken.

## 1.2 Success definition

A user can select a reporting slice, understand progress and gaps, identify priority geographies, explain risk classification, prepare review talking points, select a grant/month, inspect supporting facts/evidence, and obtain a report-ready grant section whose factual claims are traceable to computed or supplied records.

# 2. Source Assignment Requirements

# 3. Product Requirements Document (PRD)

## 3.1 Personas

## 3.2 Core user journeys

1. Open Program Review.

1. Select month and optional district/block/grade/subject filters.

1. Application filters normalized PBL records.

1. Analytics layer computes KPIs, trends, geography summaries, risks, and priorities.

1. UI displays facts and explanations.

1. User opens Monthly Review Summary and sees achievements, changes, risks, priority geographies, and discussion prompts.

1. Open Grant Reporting.

1. Select grant and reporting month.

1. Application assembles structured grant facts and evidence references.

1. Narrative generator creates a report-ready section from only those structured facts; deterministic fallback is available.

1. User inspects source facts/evidence and copies the report section.

## 3.3 Product requirements

# 4. Software Requirements Specification (SRS)

## 4.1 Functional requirements

## 4.2 Non-functional requirements

# 5. Data & Metric Specification

## 5.1 Canonical PBL model

Recommended normalized TypeScript shape:

PBLRecord { month, schoolCode, schoolName, district, block, grade, subject, projectConducted, evidenceSubmitted, classes, enrollment, attendance, attendanceRate, sourceFile }

## 5.2 Canonical grant model

GrantProfile { grantId, month, budgetLines, totalBudget, cumulativeUtilized, utilizationRate }

GrantPerformance { grantId, month, outcomes, milestones, risks, reportMaterial }

EvidenceAsset { grantId, month, assetId, assetType, title, relativePath, description, synthetic }

## 5.3 Metric definitions

Important interpretation: evidence submission rate should be measured among participating schools, because a non-participating school cannot reasonably be treated as an evidence-submission failure.

## 5.4 Risk thresholds

Implementation rule: thresholds are inclusive/exclusive exactly as above. Keep them in one configuration/module.

## 5.5 Risk explanation contract

RiskResult { status, metricName, observedRate, lowerBound, upperBound, explanation }. Example explanation: 'Evidence submission is 58.2%, which falls in the 35%–<60% At Risk band.'

## 5.6 Geography aggregation

For each district and block, run the same metric engine over records in that geography. Rank by a documented primary metric (recommended: participation rate) and expose secondary evidence and attendance metrics. Do not silently combine incompatible denominators.

## 5.7 Priority logic

Recommended deterministic priority score for the assessment: first classify risk, then rank within risk bands by magnitude of gap to 75%. Example gap = max(0, 75 − rate). Tie-break using lower evidence/attendance rate and then geography name. Document this as an implementation assumption rather than claiming it is prescribed by the assignment.

# 6. System Architecture

Recommended stack: Next.js + TypeScript + React, with static seed data for the assessment. A backend/API layer can be added for AI calls and future database access. The architecture should remain valid if seed data is replaced by PostgreSQL/Supabase.

## 6.1 Logical architecture

Presentation → Application services → Domain analytics → Data access/import → Seed/CSV data

Grant narrative path: Grant UI → Report service → deterministic fact assembler → optional AI adapter → validator → narrative + source facts.

## 6.2 Component boundaries

## 6.3 Recommended repository structure

app/
  dashboard/
  review/
  grants/
  api/
components/
  filters/
  kpi/
  geography/
  review/
  grants/
  evidence/
lib/
  data/
    loaders/
    seed/
  domain/
    metrics.ts
    risk.ts
    trends.ts
    geography.ts
    priorities.ts
  application/
    programReviewService.ts
    grantReportService.ts
    reviewSummaryService.ts
  ai/
    provider.ts
    prompt.ts
    fallback.ts
    validator.ts
types/
tests/
docs/
public/
  evidence/

# 7. End-to-End Workflows

## 7.1 Program review workflow

Load → validate → normalize → store in memory → initialize filters → filter records → calculate metrics → calculate previous-month metrics → calculate MoM → aggregate geography → classify risks → rank priorities → render dashboard → build review summary.

## 7.2 Filter workflow

User changes filter → update filter state → filterPBLRecords(records, filters) → derive all analytics from the same filtered set → rerender. Do not maintain separate filtered copies for individual widgets.

## 7.3 Grant report workflow

Grant/month selection → retrieve matching finance/performance/evidence rows → calculate utilization/performance metrics → construct immutable ReportFacts object → display fact panel → generate narrative through AI adapter or deterministic fallback → validate narrative against facts → display narrative + source facts/evidence.

## 7.4 AI-disabled workflow

Same GrantFacts object → deterministic template generator → report preview. No dashboard KPI, risk, priority, finance calculation, or evidence link depends on an LLM.

# 8. AI / Responsible AI Specification

## 8.1 AI role

AI is a language layer, not the source of truth. It may improve wording, structure, and readability of already-computed facts. The deterministic system calculates and displays KPIs, risks, rankings, and geography results; the evaluator interprets those results and decides operational action.

## 8.2 Allowed inputs

- Computed program metrics.

- Computed MoM changes.

- Computed risk results.

- Priority geographies produced by deterministic logic.

- Grant finance facts.

- Grant outcomes/milestones/risks supplied by the grant dataset.

- Evidence metadata and references selected by the application.

## 8.3 Prohibited AI behavior

- Determine risk classification.

- Calculate KPI values from raw CSVs.

- Invent achievements, locations, numbers, milestones, evidence, or media.

- Convert synthetic media into claims of independently verified field activity.

- Override deterministic facts.

## 8.4 Prompt contract

The prompt should explicitly instruct the model to use only supplied facts, preserve numeric values exactly, distinguish facts from interpretation, avoid unsupported causal claims, and return a concise report section.

## 8.5 Validation

At minimum validate that every numeric value in the generated narrative is either absent or matches a supplied fact. For a take-home, a simpler source-facts panel is acceptable, but the README should explain how production would implement structured output/schema validation.

## 8.6 Fallback

If AI provider configuration is absent, times out, errors, or returns invalid output, use the deterministic template generator and display a non-blocking AI-unavailable state.

# 9. UX / Information Architecture

## 9.1 Navigation

- Program Review

- Grant Reporting

## 9.2 Program Review screen

Header → filter bar → KPI cards → trend section → district performance → block performance → priority follow-ups → Monthly Review Summary.

## 9.3 Grant Reporting screen

Grant/month selectors → grant facts → finance utilization → outcomes/milestones/risks → evidence/media gallery → report preview → source facts.

## 9.4 UX rules

- Show 'No data' rather than zero when a filter has no records.

- Show 'N/A' when a percentage denominator is zero.

- Use clear labels for percentage-point MoM change.

- Risk badges must be accompanied by the underlying metric.

- Evidence assets must be labeled synthetic.

- Do not bury the primary follow-up areas below decorative charts.

# 10. API / Service Contracts

## 10.1 Program review service

getProgramReview(filters) → { metrics, trends, districts, blocks, priorities, reviewFacts }

## 10.2 Grant report service

getGrantReportFacts({ grantId, month }) → { finance, outcomes, milestones, risks, evidence, metrics }

## 10.3 Narrative service

generateNarrative({ facts, mode }) → { narrative, sourceFacts, provider, fallbackUsed, validationStatus }

## 10.4 Data flow contract

UI requests application service → service retrieves normalized records → domain functions return typed results → UI renders typed results.

# 11. Testing & Quality Strategy

## 11.1 Boundary tests

- 74.99% → Behind.

- 75.00% → On Track.

- 59.99% → At Risk.

- 60.00% → Behind.

- 34.99% → Critical.

- 35.00% → At Risk.

- 0 participating schools → evidence rate N/A, not divide-by-zero.

- No previous month → MoM unavailable, not zero.

- No filtered records → explicit empty state.

# 12. Security & Privacy Requirements

- Treat all supplied data as synthetic, but design as if production data may be sensitive.

- Keep API secrets server-side.

- Do not send unnecessary school-level raw data to an external LLM.

- Prefer aggregated facts for narrative generation.

- Restrict evidence paths to known assets; avoid arbitrary filesystem/path traversal.

- In production, add authentication/authorization and role-based access to finance/reporting functions.

- Log AI provider failures and validation failures without logging secrets.

# 13. Production Architecture Evolution

Assessment: static seed data + local analytics. Production evolution: object storage/raw ingestion → validation pipeline → PostgreSQL/Supabase → materialized/aggregate analytics → API → React UI. AI gateway remains isolated from the analytics engine.

## 13.1 Production data flow

CSV/API ingestion → schema validation → raw landing zone → normalized tables → metric/query services → cached aggregates → UI/reporting. Evidence files should live in object storage with metadata in the database.

## 13.2 Scaling consideration

For millions of records, do not filter a large dataset in the browser. Push aggregation to SQL/API, index month/district/block/grade/subject, and cache common review slices.

# 14. Assumptions & Decisions Log

# 15. Requirements Traceability Matrix

# 16. Implementation Roadmap

# 17. Definition of Done

- All Tier 1 workflows work end-to-end.

- At least one Tier 2 enhancement is complete: Monthly Review Summary.

- Filters change all dependent dashboard metrics.

- Risk logic is centralized and tested at all boundaries.

- At least two MoM metrics are displayed correctly.

- District/block follow-up areas are visible and explainable.

- Grant report contains finance, outcomes, milestones, risks, evidence/media.

- Narrative is generated only from structured facts.

- AI-disabled mode produces a valid report.

- Synthetic assets are clearly identified.

- README contains setup, architecture, data model, assumptions, risk, AI, limitations, production notes, future improvements.

- Seed/import instructions are present.

- Repository is runnable by a reviewer.

- A small live code change can be demonstrated safely.

# 18. Interview / Live Review Preparation

# 19. Implementation Workflow — Exact Build Order

1. Create repository and TypeScript application.

1. Copy assessment data into a controlled seed-data location without modifying source records.

1. Implement import/normalization functions and validation.

1. Define domain types.

1. Implement metric calculations.

1. Implement risk configuration and risk explanation.

1. Implement filtering.

1. Implement MoM calculations.

1. Implement district/block aggregation and priority ranking.

1. Write unit tests against thresholds and known monthly baselines.

1. Build Program Review shell and filter bar.

1. Connect KPI cards to application service.

1. Add trends and geography views.

1. Add Monthly Review Summary from deterministic review facts.

1. Implement grant data loader and grant fact assembler.

1. Build Grant Reporting screen and evidence viewer.

1. Implement deterministic narrative fallback first.

1. Add optional AI provider adapter.

1. Add narrative validation and source-facts display.

1. Add empty/error states and accessibility pass.

1. Write README and architecture documentation.

1. Run end-to-end tests with AI disabled.

1. Deploy only after local acceptance criteria pass.

1. Perform mock live review and practice one small code change.

# 20. Final Architecture Diagram (textual)

┌──────────────────────────┐
                     │ Supplied CSV / Assets     │
                     └────────────┬─────────────┘
                                  │
                         Import + Validation
                                  │
                                  ▼
                     ┌──────────────────────────┐
                     │ Normalized Domain Data   │
                     │ PBL / Grant / Evidence   │
                     └────────────┬─────────────┘
                                  │
             ┌────────────────────┴────────────────────┐
             ▼                                         ▼
   ┌──────────────────────┐                 ┌──────────────────────┐
   │ Program Analytics    │                 │ Grant Fact Assembly  │
   │ metrics/trends/risk  │                 │ finance/outcomes/    │
   │ geography/priorities │                 │ milestones/evidence  │
   └──────────┬───────────┘                 └──────────┬───────────┘
              │                                        │
              ▼                                        ▼
   ┌──────────────────────┐                 ┌──────────────────────┐
   │ Program Review UI    │                 │ Report Facts         │
   │ KPIs/trends/geos     │                 └──────────┬───────────┘
   │ review summary       │                            │
   └──────────────────────┘                  ┌─────────┴─────────┐
                                             ▼                   ▼
                                   ┌─────────────────┐   ┌─────────────────┐
                                   │ Optional AI     │   │ Deterministic   │
                                   │ narrative       │   │ fallback        │
                                   └────────┬────────┘   └────────┬────────┘
                                            └──────────┬──────────┘
                                                       ▼
                                           ┌──────────────────────┐
                                           │ Narrative + Sources  │
                                           └──────────────────────┘

# 21. Important Scope Boundary

This specification intentionally does not invent requirements that are absent from the assignment. Authentication, production database, multi-tenant authorization, advanced forecasting, PDF/DOCX export, automated action management, and complex AI agents are extension points, not baseline deliverables. Implementing them before the Tier 1 workflow is reliable would increase risk without improving the core assessment score.

# 22. Decision-Support Boundary: System Results vs. Human Action

The system is responsible for calculating and displaying objective, reproducible analytical results from the supplied data. This includes KPI values, month-over-month movement, risk classifications, performance rankings, and district/block geography results.

The evaluator/user is responsible for interpreting those results in context and deciding operational action. A displayed risk, ranking, or priority is therefore a decision-support signal, not an autonomous instruction or an assertion that a particular intervention must occur.

## 22.1 System responsibilities

- Calculate required KPIs deterministically from the normalized data.

- Calculate and display month-over-month movement.

- Apply the prescribed risk thresholds deterministically.

- Calculate and display district/block performance results.

- Rank or prioritize geographies using documented deterministic rules.

- Show the underlying metric, denominator where relevant, and risk threshold so results are inspectable.

- Provide structured facts to the optional narrative generator.

## 22.2 Evaluator/user responsibilities

- Interpret the displayed KPI, risk, ranking, and geography results.

- Consider contextual factors not represented in the supplied dataset.

- Determine whether a displayed gap warrants operational attention.

- Decide what follow-up, intervention, escalation, or other action should be taken.

- Treat AI-generated wording as a communication aid rather than an independent decision authority.

## 22.3 Example

If the system calculates an evidence submission rate of 52% for a block, it deterministically displays 'At Risk' because 52% falls within the 35%–<60% band. The evaluator then decides whether the result warrants follow-up, what contextual explanation may exist, and what action is appropriate. The system does not autonomously prescribe the intervention.



| Item | Value |

| --- | --- |

| Purpose | Baseline specification to guide implementation of the Mantra4Change pre-interview assignment. |

| Primary audience | Candidate developer, reviewer/interviewer, future maintainer. |

| Source of truth | Assignment brief and supplied candidate package; implementation decisions below are explicit assumptions where the brief leaves room for interpretation. |

| Scope | Tier 1 complete end-to-end plus Tier 2 Monthly Review Summary. |

| Runtime AI | Optional. Deterministic functionality must work with AI disabled. |

| Data | Synthetic assessment data only; not real monitoring, donor, finance, field, or media records. |





| Requirement | Type | Implementation implication |

| --- | --- | --- |

| Filter by reporting month, district, block, grade, subject | Tier 1 | One shared filter state feeds a reusable filtering function; all dependent metrics recalculate. |

| Monthly review dashboard | Tier 1 | Show total schools, participating schools, participation %, evidence %, enrollment, attendance, attendance %, and ≥2 MoM metrics. |

| District and block performance | Tier 1 | Aggregate and rank geographies; expose high/low performers and follow-up areas. |

| Deterministic risk/gap engine | Tier 1 | Central code-based thresholds; no LLM dependency. |

| Grant reporting assistant | Tier 1 | Grant/month selection, fact panel, finance, outcomes, milestones, risks, evidence/media, report section. |

| Monthly Review Summary | Tier 2 | Chosen enhancement; deterministic insight object followed by narrative generation. |

| Report export | Tier 2 | Not selected for scope; in-app report preview is sufficient. |

| Recommended actions | Tier 3 | Not required; design extension point only. |

| README, seed/import instructions | Submission | Must document setup, architecture, data model, assumptions, risk, AI, limitations, production plan. |

| Live review | Assessment | Must be able to explain data model, calculations, risk, narrative flow, and make a small code change. |





| Persona | Goal | Primary needs |

| --- | --- | --- |

| Program/field reviewer | Understand monthly implementation | Filters, KPIs, trends, geography comparison, risks, priorities. |

| Program leadership | Prepare decisions for monthly review | Executive summary, biggest changes, priority locations, discussion prompts. |

| Grant/reporting user | Prepare donor/grant communication | Finance, outcomes, milestones, risks, evidence, grounded narrative. |

| Reviewer/interviewer | Evaluate engineering judgment | Explainable architecture, deterministic analytics, graceful AI fallback. |





| ID | Area | Requirement | Priority |

| --- | --- | --- | --- |

| PR-001 | Program Review | User can filter by month, district, block, grade, and subject. | High |

| PR-002 | Program Review | All dashboard metrics respond to filter changes. | Critical |

| PR-003 | Program Review | Dashboard shows required monthly KPIs. | Critical |

| PR-004 | Program Review | Dashboard shows MoM movement for at least two metrics. | High |

| PR-005 | Program Review | District and block summaries show high/low performance and follow-up. | High |

| PR-006 | Risk | Risk status is deterministic and centralized. | Critical |

| PR-007 | Risk | UI explains the metric value and threshold behind status. | High |

| PR-008 | Review | Monthly Review Summary is generated from deterministic insight objects. | High |

| PR-009 | Grant | User can select grant and reporting month. | Critical |

| PR-010 | Grant | Grant fact panel contains finance, outcomes, milestones, risks, evidence/media. | Critical |

| PR-011 | AI | Narrative generation receives structured facts rather than raw CSV rows. | Critical |

| PR-012 | AI | Narrative can be produced deterministically when AI is unavailable. | Critical |

| PR-013 | Traceability | Generated narrative exposes the facts/evidence used. | High |

| PR-014 | Data | Synthetic evidence/media are clearly labeled as assessment assets. | High |





| ID | Function | Requirement | Actor |

| --- | --- | --- | --- |

| FR-001 | Data import | Load July, August, September PBL CSVs into one normalized collection. | System |

| FR-002 | Data import | Load grant profile/finance, performance/report material, and evidence/media CSVs. | System |

| FR-003 | Filtering | Support month/district/block/grade/subject filters with an All option. | User |

| FR-004 | KPI calculation | Calculate school count, participation, evidence submission, enrollment, attendance, attendance rate. | System |

| FR-005 | Trend | Calculate current vs previous month movement for at least two KPIs. | System |

| FR-006 | Geography | Aggregate metrics by district and block. | System |

| FR-007 | Risk | Classify percentages using fixed thresholds. | System |

| FR-008 | Explanation | Return status, observed rate, threshold band, and reason. | System |

| FR-009 | Prioritization | Rank geographies/indicators needing attention. | System |

| FR-010 | Review summary | Create structured achievements, gaps, changes, risks, priorities, prompts. | System |

| FR-011 | Grant selection | Select grant and reporting month. | User |

| FR-012 | Grant facts | Assemble finance, outcomes, milestones, risks, evidence references. | System |

| FR-013 | Narrative | Generate report-ready narrative from structured facts. | System |

| FR-014 | Fallback | Use deterministic template if AI disabled/unavailable. | System |

| FR-015 | Traceability | Display source facts and evidence references alongside narrative. | System |

| FR-016 | Edge states | Handle no data, missing previous month, zero denominators, and AI failure. | System |





| ID | Category | Requirement |

| --- | --- | --- |

| NFR-001 | Correctness | Deterministic analytics produce stable results for identical inputs. |

| NFR-002 | Explainability | Every risk status can be explained from metric value + threshold. |

| NFR-003 | Availability | Core dashboard and grant facts remain usable without AI. |

| NFR-004 | Performance | Local seeded dataset should render/filter interactively without perceptible delay. |

| NFR-005 | Maintainability | Business logic is isolated from presentation components. |

| NFR-006 | Testability | Metric, risk, trend, filtering, and narrative fallback logic are unit-testable. |

| NFR-007 | Data integrity | Normalize and validate CSV values at import boundary. |

| NFR-008 | Security | Do not expose provider API keys in browser code; server-side AI calls only. |

| NFR-009 | Auditability | Narrative input facts are inspectable. |

| NFR-010 | Accessibility | Controls and data tables should be keyboard usable and semantically labeled. |

| NFR-011 | Responsible AI | AI cannot create or alter business facts, risk labels, or source evidence. |

| NFR-012 | Production readiness | README documents path from seeded data to production database/ingestion. |





| Metric | Formula / rule | Notes |

| --- | --- | --- |

| Total schools | COUNT(DISTINCT schoolCode) in filtered scope | Use schoolCode as stable school identity. |

| Participating schools | COUNT(DISTINCT schoolCode WHERE projectConducted = true) | Participation is PBL/project completion in the supplied data. |

| Participation % | participating schools / total schools × 100 | If total schools = 0, return null/NA. |

| Evidence-submission schools | COUNT(DISTINCT schoolCode WHERE evidenceSubmitted = true) | Use participating schools as denominator for evidence rate. |

| Evidence submission % | evidence-submission schools / participating schools × 100 | Avoid denominator dilution by non-participating schools. |

| Total enrollment | SUM(enrollment) | Aggregate after filtering. |

| Total attendance | SUM(attendance) | Aggregate after filtering. |

| Attendance % | total attendance / total enrollment × 100 | If enrollment = 0, return null/NA. |

| MoM movement | current percentage − previous percentage | Display percentage-point change for percentage metrics. |





| Rate | Status | Interpretation |

| --- | --- | --- |

| ≥ 75% | On Track | Meets or exceeds target band. |

| 60% to <75% | Behind | Below target but not severe. |

| 35% to <60% | At Risk | Material performance concern. |

| <35% | Critical | Severe performance concern. |





| Layer | Responsibility | Must not do |

| --- | --- | --- |

| UI/components | Render controls, cards, tables, charts, report preview. | Calculate business metrics or risk rules. |

| Application services | Coordinate filtering, analytics, report assembly. | Know presentation-specific styling. |

| Analytics/domain | Metrics, trends, risk, geography, priorities. | Call LLMs or access browser APIs. |

| Data access | Load/validate normalized data. | Decide business interpretation. |

| AI adapter | Generate prose from structured facts. | Invent metrics, decide risk, access raw CSVs. |

| Evidence resolver | Map evidence relative_path to safe asset URL/path. | Treat synthetic media as verified real-world evidence. |





| Test layer | Examples | Priority |

| --- | --- | --- |

| Unit | Risk boundaries, participation %, evidence %, attendance %, MoM | Critical |

| Unit | Filter combinations | Critical |

| Unit | District/block aggregation | High |

| Unit | Priority ranking | High |

| Unit | Deterministic narrative fallback | High |

| Integration | Filter → dashboard metrics | Critical |

| Integration | Grant/month → fact panel | Critical |

| Integration | AI disabled → valid report | Critical |

| UI | Selectors and empty states | Medium |

| Regression | Known July/Aug/Sep baseline values | High |





| ID | Assumption/decision | Reason | Risk |

| --- | --- | --- | --- |

| A-001 | Use schoolCode as stable school identity. | Supplied data includes synthetic school codes. | Low |

| A-002 | Evidence rate denominator is participating schools. | More semantically meaningful for evidence submission. | Medium; document explicitly. |

| A-003 | MoM percentage metrics are shown as percentage-point change. | Avoid confusing relative % change with pp movement. | Low |

| A-004 | Primary geography ranking uses participation rate. | Assignment asks for performance/follow-up but does not mandate a ranking formula. | Medium |

| A-005 | Priority score is a gap-to-75% ranking within risk bands. | Simple, explainable deterministic prioritization. | Medium |

| A-006 | Monthly Review Summary is selected as the Tier 2 enhancement. | Highest leverage for review workflow. | Low |

| A-007 | No PDF/DOCX export in baseline. | Assignment says in-app report preview is sufficient. | Low |

| A-008 | Runtime AI is optional. | Explicit assignment requirement; deterministic fallback required. | Low |





| Requirement | Design element | Implementation module | Test |

| --- | --- | --- | --- |

| PR-001 / FR-003 | Filter bar | filterPBLRecords | Filter integration tests |

| PR-003 / FR-004 | KPI grid | metrics.ts | Metric unit tests |

| PR-004 / FR-005 | Trend cards | trends.ts | MoM tests |

| PR-005 / FR-006 | Geography tables | geography.ts | Aggregation tests |

| PR-006 / FR-007 | Risk badges | risk.ts | Boundary tests |

| PR-008 / FR-010 | Review summary | reviewSummaryService.ts | Summary tests |

| PR-009 / FR-011 | Grant selectors | grantReportService.ts | Grant integration tests |

| PR-010 / FR-012 | Grant fact panel | grantReportService.ts | Grant fact tests |

| PR-011 / FR-013 | Narrative | ai/provider.ts | Narrative tests |

| PR-012 / FR-014 | Fallback | ai/fallback.ts | AI-disabled integration test |

| PR-013 / FR-015 | Source facts panel | report UI | Traceability test |

| PR-014 | Synthetic label | evidence component | UI/content check |





| Phase | Deliverable | Exit criterion |

| --- | --- | --- |

| 0 | Repo + tooling | App runs locally; TypeScript/lint/test configured. |

| 1 | Data normalization | All supplied CSVs load into typed normalized structures. |

| 2 | Analytics | Metrics, risk, trends, geography, priorities implemented without UI dependency. |

| 3 | Tests | Core boundary and baseline tests pass. |

| 4 | Program Review UI | Filters and KPIs work end-to-end. |

| 5 | Geography + review | District/block views and Monthly Review Summary work. |

| 6 | Grant Reporting | Grant/month facts and evidence work. |

| 7 | Narrative | AI adapter + deterministic fallback + source facts work. |

| 8 | Hardening | Empty/error states, accessibility, security checks. |

| 9 | README/deploy | Submission-ready repo and optional demo. |

| 10 | Live review | Can explain and modify core code under interview conditions. |





| Likely question | Expected answer direction |

| --- | --- |

| Why this data model? | Separates raw ingestion from domain entities and keeps UI independent of survey-column names. |

| How is evidence rate calculated? | Evidence submissions divided by participating schools; denominator is explicit. |

| Why deterministic risk? | Risk is a business rule and must be reproducible/auditable. |

| What does AI do? | Language generation from structured facts; it does not calculate or decide. |

| What happens if AI fails? | Deterministic report fallback remains functional. |

| How do you prevent hallucinations? | Constrain input to facts, validate structured output/numbers, expose source facts. |

| How would this scale? | Move aggregation to SQL/API, add indexes/materialized views/cache, keep browser focused on presentation. |

| What would you change for production? | Authentication, database, ingestion validation, object storage, observability, audit logs, provider gateway, PII minimization. |

