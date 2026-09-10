# Final Live Demo Script
**Mantra4Change PBL Program Intelligence & Grant Reporting Assistant**

*(Estimated Time: 5–10 minutes)*

---

## 1. PRODUCT PURPOSE
**Goal:** Explain the fundamental value proposition.
* "Welcome. This product bridges the gap between raw, messy PBL response data and executive-level clarity."
* "It transforms ground-level data into review-ready decisions for our program managers, and grant-ready reporting for our donors. It does this while strictly separating hard facts from AI narrative."

---

## 2. PROGRAM REVIEW
**Goal:** Walk through the interactive dashboard.
* **Navigation:** Click through the **Month**, **District**, **Block**, **Grade**, and **Subject** filters.
* **Demonstrate Cascading Filters:** Show how selecting a specific District immediately scopes the Block options, and clears any stale block selection automatically.
* **KPI Cards:** Highlight the 5 core KPIs: 
  * Total Enrollment
  * Total Attendance
  * Attendance Rate
  * Evidence Submission Rate
  * Participation
* **Month-Over-Month (MoM):** Point out the objective "vs previous month" trend indicators under the KPIs.

---

## 3. RISK
**Goal:** Explain how early-warning indicators work.
* Scroll down to the **Geography Performance** table.
* Highlight a row showing a **Risk Status** (e.g., "Behind" or "At Risk").
* **Explain the exact deterministic thresholds used across the entire application:**
  * `>= 75%` → **On Track**
  * `60% – <75%` → **Behind**
  * `35% – <60%` → **At Risk**
  * `< 35%` → **Critical**

---

## 4. DECISION-SUPPORT BOUNDARY
**Goal:** Clarify the relationship between the tool and the human evaluator.
* *Script:* "The system calculates and displays reproducible signals based on hard data. The human evaluator interprets those signals and decides what action to take. Risk statuses and rankings are strictly informational alerts, they are not autonomous instructions or mandates."

---

## 5. REVIEW SUMMARY
**Goal:** Highlight automated artifact generation.
* Scroll to the **Monthly Review Summary**.
* Show how the system has automatically synthesized the data into 4 distinct areas:
  1. Achievements
  2. Month-over-Month Changes
  3. Gaps & Risks
  4. Priority Geographies (and Discussion Points)

---

## 6. GRANT REPORTING
**Goal:** Demonstrate the donor-facing reporting tools.
* Navigate to the **Grant Reporting** tab.
* **Filters:** Select a specific **Grant** (e.g., GRANT_AA_2025) and **Month**.
* **Finance:** Point out the aggregated Total Budget, Cumulative Utilized, and exact Utilization Rate.
* **Outcomes & Milestones:** Show how outcomes are clearly mapped and risk is calculated deterministically.
* **Evidence Gallery:** Show the visual media gallery.
* **Evidence References:** Point out the traceability block matching images to their raw source path and `recordId`.
* **Narrative & Fact Traceability:** Show the generated AI narrative and explicitly point out the adjacent **Fact Traceability** panel, proving exactly which facts were fed to the AI.

---

## 7. AI
**Goal:** Explain the architecture's safety boundaries.
* *Script:* "The AI receives structured, deterministic facts and is strictly confined to producing a narrative draft. It does not calculate the KPIs, it does not determine risk, and it does not decide operational action. If the AI is unavailable, or returns something non-deterministic like 'Insufficient data', a structured deterministic fallback is immediately triggered to ensure continuous reliability."

---

## 8. SMALL CODE CHANGE
**Goal:** Prove the application is live, editable, and modular.
* **Action:** Open `app/layout.tsx`.
* **Change:** Find the navigation links array:
  ```typescript
  { name: "Grant Reporting", href: "/grants" }
  ```
* **Edit:** Change `"Grant Reporting"` to `"Donor Reporting"`.
* **Save & Show:** Save the file and instantly show the hot-reloaded UI updating the top navigation bar. It is a purely presentation-level change that is 100% safe to do live without risking business logic.

---

## 9. TECHNICAL QUESTIONS (Cheat Sheet)

**Why is enrollment deduplicated?**
Because a single student can attend multiple sessions in a month. Enrollment measures unique individuals, so it is deduplicated by `school_id` and `grade`.

**Why is attendance summed?**
Attendance measures the total volume of student interactions. Therefore, it is the raw sum of all attendance figures across all sessions in that reporting period.

**How is evidence submission calculated?**
It is the count of unique schools that submitted at least one piece of evidence, divided by the total number of enrolled/expected schools.

**How is risk calculated?**
It is strictly deterministic based on the core KPI (e.g., PBL Completion Rate). The algorithm runs: `<35` (Critical), `<60` (At Risk), `<75` (Behind), `>=75` (On Track).

**Why is AI separated from business logic?**
To enforce the decision-support boundary. AI models are inherently non-deterministic. Core program calculations (KPIs, risk, rankings) require auditable mathematical accuracy, so they must run independently in standard TypeScript.

**How does grant finance aggregation work?**
Budget line-items allocated to a specific grant are summed to calculate the Total Budget and Cumulative Utilized amounts. The Utilization Rate is simply `(Utilized / Total) * 100`.

**How is evidence traceability maintained?**
Facts are paired directly with the exact file paths and source `recordId`s from the raw CSV data. The UI lists them in the Evidence References panel explicitly to prove to the auditor exactly where the data came from.

**What would change for production scale?**
1. Replace the local CSV seed data loaders with a real relational database (e.g., PostgreSQL / Prisma).
2. Add authentication and role-based access control (e.g., NextAuth.js) to restrict donor data.
3. Connect the `provider.ts` AI wrapper to a real LLM endpoint (e.g., OpenAI or Gemini API) instead of returning mock strings.
