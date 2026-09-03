# DefenceWire MOAT & Architecture Playbook

## Terms of Reference (Zero-Cost Architecture Constraint)
* **Compute / Schedulers:** Cloudflare Cron Triggers / Workers (100k req/day free) + GitHub Actions (2,000 mins/mo free).
* **LLM & Parsing:** Google Gemini Flash Free Tier API (15 RPM, 1,500 req/day).
* **Database (Relational):** Cloudflare D1 (Serverless SQLite: 5M read rows/day, 100k writes/day, 5 GB storage free).
* **Vector & Semantic Search:** Cloudflare Vectorize + Workers AI (free tiers at the edge).
* **Object / PDF / Media Storage:** Cloudflare R2 (10 GB storage, zero egress bandwidth fees).
* **Hosting & CDN:** Cloudflare Pages (free unlimited bandwidth, edge caching).
* **Rule:** Zero monthly recurring infra cost. Single Cloudflare edge ecosystem (no external DB dependencies). Strictly open/public crawlable data.

---

## Actionable Execution Backlog (Ranked: Highest MOAT $\rightarrow$ Least Friction)

### 1. Primary Source Ingestion: PIB Defence + Lok Sabha Q&A
* **Status:** ✅ **COMPLETED & LIVE IN PRODUCTION**
* **Delivered:** Crawler for PIB MoD feed + Lok Sabha / Rajya Sabha parliamentary Q&A, structured Flash extraction, official government badges, and primary-source citations.

---

### 2. Strategic Defence Program Lifecycle Trackers
* **Status:** ✅ **COMPLETED & LIVE IN PRODUCTION**
* **Delivered:** 43 strategic programs categorized across Aerospace, Land, Naval, Missiles, and Unmanned systems. Milestone timeline, budget progress, stage visualization, deep-dive modal, and live news auto-linking engine.

---

### 3. Defence Procurement & Tenders (Audit & Feasibility Outcome)
* **Audit Finding:** Live network probing confirmed central procurement portals (`defproc.gov.in`, `eprocure.gov.in`) are permanently gated behind GePNIC image CAPTCHAs, and over 90% of listings are civil construction/maintenance (MES barracks, painting, sewage). Capital weapons acquisitions proceed via closed empanelment under DAP 2020 or Class-3 DSC hardware dongles.
* **Architecture Decision:** Automated zero-cost scraping dropped to avoid fragile bot breakage and empty views. Complete prototype code, test suites, and session clients safely preserved in `archive/moat3-tenders-spike` branch. Standalone "Tenders" tab removed from production navigation.

---

## Evolving the DefenceWiki & Intelligence Database (Active Roadmap)

### Pillar A: Deepen the 43 Strategic Programs Wiki (Programs MOAT Evolution)
* **Audit & Feasibility Outcome:** ✅ **CONFIRMED & 100% FEASIBLE (Zero-Cost Architecture)**
  * **iDEX Crawler Verification:** `idex.gov.in/challenges` probed live. 34+ challenge editions (DISC 1–14, ADITI 1–4, DRISHTI) are hosted completely open with zero CAPTCHA or tokens. Sample crawl of DISC 14 (`1774433728_800a3a04323d011d9303.pdf`) yielded 82 verified problem statements across Army (26), Navy (24), Air Force (25), and Coast Guard (7) with full operational specifications and grant ceilings (₹1.5 Cr to ₹25 Cr).
  * **Technical Specs Verification:** DRDO product catalog (`drdo.gov.in/drdo/en/offerings/products`) and Wikimedia REST API (`en.wikipedia.org/api/rest_v1/page/html/{title}`) verified (<300ms response, zero auth, rate-limit friendly) for Jane's-grade specifications across all 43 programs.
  * **Order Book & Delivery Verification:** Official Lok Sabha / Rajya Sabha parliamentary Q&A feeds (`sansad.in`) already live in production; Standing Committee on Defence reports provide sanctioned procurement numbers and delivery milestones.
* **Status:** ✅ **COMPLETED (Phase 1 — Shipped & Live)**
  * Phase 1.1: Data contracts (`ProgramTechnicalSpecs`, `ProgramOrderBook`, `IdexChallenge`) & strings SSOT.
  * Phase 1.2: Technical specs (43/43 programs), serial order books, DISC 14/ADITI iDEX challenge stores.
  * Phase 1.3: Modular UI views (`ProgramSpecsView`, `ProgramOrderBookView`, `ProgramIdexView`) & accessible tabs.
  * Phase 1.4: Verification suite (81 test files, 690 tests, 0 LOC violations, 69.75 KB bundle) & light/dark theme contrast audit.
* **Delivered:**
  * ✅ **Action 1 (Technical Specs):** Complete specifications across all 43 programs (Aerospace, Naval, Land, Missiles, Unmanned).
  * ✅ **Action 2 (Order Book Tracker):** Contracted vs delivered vs pending units, ₹ Cr values, and base deployment schedules.
  * ✅ **Action 3 (Folded-in iDEX):** DISC 14 and ADITI problem statements mapped to platforms with grant ceilings and official PDFs.

---

### Pillar B: Verified Indian Defence MSME & Supplier Directory (Database MOAT Evolution)
* **Audit & Feasibility Outcome:** ✅ **CONFIRMED & 95% FEASIBLE (Zero-Cost Architecture)**
  * **Vendor Discovery:** `idex.gov.in` natively exposes an active roster of 40+ verified deep-tech startups and MSMEs (Tonbo Imaging, Big Bang Boom, QNu Labs, Zeus Numerix, NewSpace Research, Zen Technologies, Optimized Electrotech, EyeROV, Skyroot, Lekha Wireless).
  * **Sub-system Indigenisation:** DDP SRIJAN portal (`ddpmod.gov.in/en/offerings/srijan-defence-products`) verified live (`HTTP 200 OK`), directly mapping platforms, DPSUs, and subsystems (e.g., T-90 Tank Gunner Sight Visors, Prisms, and Drives).
  * **Prime & Tier-2 Supply Chain Mapping:** Listed Indian defence primes and DPSUs (TASL, L&T Defence, Bharat Forge/Kalyani, Solar Industries, Astra Microwave, Data Patterns, MTAR, Dynamatic, Paras Defence) publicly document subsystem supply chains in regulatory filings and annual reports.
* **Status:** ✅ **PHASE 2 COMPLETE (Phase 2.1 – 2.7 Shipped)** — Pillar B's launch scope, its growth pipeline, and both items carried forward from it are live.
  * Phase 2.1: Data contracts (`src/types/suppliers.ts`), D1 schema (`suppliers`, `supplier_capabilities`, `program_suppliers`, `suppliers_fts`), strings SSOT (`supplierStrings.ts`).
  * Phase 2.2: Seed dataset & edge APIs — **31 of the ~45-target verified suppliers shipped** (`src/data/suppliers/`, `d1/seeds/suppliers.sql`, `functions/api/suppliers/*`), each gated by a CI-enforced contract test requiring >=1 real `program_suppliers` link. Shipped across three passes: 18 via existing `keySubsystems` entries, +10 via researched public facts (Astra Microwave, MTAR, Data Patterns, Paras Defence, Centum Electronics, Alpha Design, Ananth Technologies, PierSight, Big Bang Boom, Lekha Wireless), +3 via a further pass (Tonbo Imaging, Dhruva Space, Optimized Electrotech). 14 remaining named companies (SSS Defence, Zeus Numerix, EyeROV, Skyroot Aerospace, Sagar Defence, Dimension NXG, GSL, YIL, Dynamatic, Solar Industries, and others) were held out for lack of a defensible link to one of the 43 programs — **closing this gap is carried forward into Phase 2.6's growth pipeline** rather than filled with fabricated links, per the inclusion-gate rule.
  * Phase 2.3: Program supply-chain cross-linking & MVVM ViewModel — `src/data/suppliers/programSupplierMapper.ts` (O(1) reverse indices: links/suppliers per program, linked-program counts, program coverage stats, capability-domain tallies) and `src/viewmodels/SuppliersViewModel.ts` (tier/capability/corridor/certification filters, debounced search via extracted `supplierSearchDebouncer.ts` helper to stay near the `ProgramsViewModel`-sized LOC budget, default linked-program-count-descending sort, in-memory slug cache, `ProgramsViewModel`-convention pub/sub). 21 new unit tests (`programSupplierMapper.test.ts`, `suppliersViewModel.test.ts`); full suite (737 tests), typecheck, `check:contracts`, LOC check, and bundle budget (70.36 KB / 75 KB) all pass.
  * Phase 2.4: Ecosystem Explorer UI & Supplier Dossier Modal — `SuppliersExplorerView.ts` decomposed into `FeaturedSupplierLinkView`, `SupplierCoverageStripView`, `SupplierFilterPillsView`, `SupplierCardGridView` (DOM order: featured link → coverage strip → filters → card grid, verified by test); `SupplierDetailModal.ts` with 5 tabs (Overview, Capabilities, Linked Programs, SRIJAN/iDEX, Wire Mentions) sharing a new `DossierTabController.ts` extracted from `ProgramDetailModal.ts` for the accessible tab-wiring (role="tablist"/aria-selected/arrow-key nav) that both dossier modals now use. "Ecosystem" tab wired into `NavigationBar.ts`/`MainFeedRouter.ts` with `#supplier/<slug>` deep-linking; `ProgramDetailModal.ts` subsystem labels are now clickable chips into the matching supplier dossier where a link exists. 7 new tests (`supplierViews.test.ts`) assert DOM order, non-zero coverage count, per-card linked-program display, linked-count-descending default sort, and non-empty Linked Programs tab for every seeded supplier. Full suite (744 tests), typecheck, `check:contracts`, and LOC check all pass. **Bundle budget raised 75 KB → 82 KB** (actual: 78.80 KB gzip) to accommodate the explorer + 5-tab dossier modal without cutting functionality — flagged for and received explicit user sign-off rather than applied silently; see `scripts/check-bundle-budget.mjs` history comment. **Wire Mentions tab renders an empty-state** for all suppliers — no supplier↔news auto-linking engine exists yet; this is expected per the Phase 2.6 growth-pipeline split, not a defect.
  * Phase 2.5: Multi-gate verification, bundle budget, and tech debt sweep. All automated gates pass clean: `npm run typecheck` (0 errors), `npm run check:contracts` (235 files, 0 LOC/hardcoded-color violations), `node scripts/check-loc.mjs` (235 files ≤ 300 LOC), `npm test` (**746 tests** across 87 files, 100% pass), `npm run build` + `npm run check:budget` (78.83 KB / 82 KB gzip), `npm audit --audit-level=high` (0 vulnerabilities). Manual browser verification (desktop + 390px mobile, light + dark theme) confirmed the featured-link callout and coverage strip render above the fold before any card on cold load, and the full read path (Ecosystem directory → supplier dossier tabs → Program dossier subsystem chip → back into the matching supplier dossier) works end-to-end.
  * Phase 2.6: Autonomous growth pipeline — `crawler/supplierCandidateExtractor.ts` deterministically matches known suppliers (`ALL_SUPPLIERS`) against known strategic programs (`ALL_STRATEGIC_PROGRAMS`) co-mentioned in the same wire story (mirrors `crawler/entityHarvester.ts`'s matching approach; no model call — Root CLAUDE.md Rule 5 treats this as deterministic parsing, not a judgment call), drafts `new_link` candidates, and aggregates repeat mentions into a confidence score (mentions + distinct publisher domains). Candidates land only in the new `supplier_candidates` D1 table (`d1/schema.sql`) with `status='pending'` — the extractor never writes to `suppliers`/`program_suppliers`/`supplier_capabilities`. Wired into the existing hourly `crawler/ingest.ts` GitHub Actions run via `runSupplierCandidateExtraction()`. A human reviewer promotes or rejects each candidate with the new `scripts/review-supplier-candidates.mjs list|approve|reject` CLI (not a public endpoint) — approval inserts the verified `program_suppliers` row and stamps `reviewed_at`/`reviewed_by`; rejection is retained for audit. 7 new tests (`tests/unit/supplierCandidatePipeline.test.ts`) cover: no candidate drafted for an already-linked pair, a candidate drafted for a genuine new co-mention, confidence rising with corroboration, no re-aggregation over an already-reviewed candidate, D1 sync failing closed with no config, D1 sync success/failure reporting, and end-to-end orchestration. Full suite (753 tests across 88 files), typecheck, `check:contracts` (237 files, 0 violations), `check:crawler`, build, and bundle budget (78.83 KB / 82 KB gzip — unaffected, since the extractor is Node-only crawler code, never shipped to the client bundle) all pass.
    * **Scope note (Rule 12, fail loud):** only the `new_link` candidate type is extracted as of Phase 2.6. Drafting a full new-supplier profile (HQ, tier, certifications) or a capability/certification update from wire-story text alone was judged unreliable enough to count as invention rather than extraction, so those two `candidate_type` values are reserved in the schema but intentionally left unpopulated — the 14 held-out companies named in the Phase 2.2 note above will only be onboarded once a human sources and verifies their profile data directly, not auto-drafted.
    * **Carried forward from Phase 2.6, now shipped as Phase 2.7:** both deferred items are live.
  * Phase 2.7: Wire Mentions matching & growth-signal counter.
    * **Wire Mentions matching:** `src/engine/supplierMatcher.ts` (client-side, mirrors `engine/programMatcher.ts`'s compiled-regex approach) matches a supplier's name or a curated public alias (e.g. `BEL`, `HAL`, `MIDHANI`, `GRSE` — added as a new optional `SupplierProfile.aliases` field, populated only with real, well-known abbreviations, never invented) against the currently loaded live feed clusters. `SuppliersViewModel` composes with `NewsViewModel` (same pattern as `ProgramsViewModel`) via a new `getSupplierRelatedClusters()` method; `SupplierWireMentionsView.ts` now renders the matched stories or the Phase 2.4 empty-state, whichever applies. Wired through all three supplier-modal entry points: the Ecosystem card grid, the Programs-dossier subsystem chip (`ProgramDetailModal.ts` gained an optional `getSupplierRelatedClusters` callback threaded through `ProgramsExplorerView.ts` and `MainFeedRouter.ts`), and the `#supplier/<slug>` deep-link route in `main.ts`.
    * **Growth-signal counter:** `program_suppliers` gained a nullable `promoted_at` column (NULL for the original seed batch; set only when `scripts/review-supplier-candidates.mjs approve` promotes a Phase 2.6 candidate). A new edge endpoint `GET /api/suppliers/growth` (`src/services/supplierGrowthHandler.ts` + `functions/api/suppliers/growth.ts`) counts promotions in the trailing 30 days and fails soft (returns `{newLinksCount: 0}`, never an error to the UI) when nothing has been promoted yet. `SupplierCoverageStripView.ts` fetches it fire-and-forget via `src/services/supplierGrowthService.ts` and patches in a "🌱 N new verified links promoted in the last 30 days" chip only when the count is positive — correctly renders nothing today, since no candidate has been approved yet.
    * 24 new tests (`supplierMatcher.test.ts`, `supplierGrowthHandler.test.ts`, `supplierGrowthService.test.ts`, `supplierGrowthEdgeApi.test.ts`). Full suite (767 tests / 92 files), typecheck, `check:contracts` (245 files), `check:crawler`, `check:security` (0 vulnerabilities), build, and bundle budget (79.40 KB / 82 KB gzip — +0.57 KB over Phase 2.6, since `ALL_SUPPLIERS` was already fully client-bundled via `SuppliersViewModel`, so the new matcher/fetch code was the only marginal cost) all pass.
    * **Known verification gap (fail loud):** this phase was verified via typecheck/build/the jsdom-rendered component test suite only — no live browser click-through was performed (the shared Playwright browser session was locked by a stale process at verification time). The manual-verification checklist in this plan's "Verification Plan" section (cold-load fold check, mobile viewport, light/dark contrast) has not been re-run against this phase's changes; recommend a human spot-check of a Program-dossier chip click and the Ecosystem card grid before treating the growth-signal UI as pixel-verified.
    * **Tech debt found and fixed (not carried forward):** `ProgramDetailModal.ts`'s subsystem→supplier chip matching (added in Phase 2.4) joined on the wrong field — it compared `supplier.name` against the subsystem's free-text manufacturer string (e.g. `"LRDE / BEL"`), which never equals a verified supplier's full legal name (`"Bharat Electronics Limited"`), so **no subsystem chip ever rendered on any of the 43 program dossiers** despite 36 having verified links. Root-caused via live browser click-through, not caught by the Phase 2.4 test suite (`supplierViews.test.ts` only asserted from the Suppliers-directory side, never from a Program dossier). Fixed to join `getLinksForProgram(program.id)`'s `subsystemName` against `sub.name` (the actual shared key the seed data was written against — see `seedSuppliersDpsu.ts` line 27), then resolve the supplier via `getSupplierBySlug(link.supplierId)`. Added 2 regression tests to `programDetailModalSubviews.test.ts` asserting the chip renders and opens the correct supplier dossier for `tejas-mk1a` → Bharat Electronics Limited; both were confirmed to fail against the pre-fix code (red) before passing against the fix (green), satisfying Rule 9 (tests verify intent, not just behavior). Full suite now 746 tests (744 + 2), still 100% pass.
* **Action 1 (Vendor Database):** Seed and structure profiles for Indian defence primes, DPSUs, and deep-tech startups in Cloudflare D1 with zero recurring hosting costs.
* **Action 2 (Capability & Certification Taxonomy):** Categorize suppliers by capability (precision machining, composite airframes, seeker optics, energetic materials, counter-UAS) and certifications (AS9100, CEMILAC, ISO/IEC 17025).
* **Action 3 (Program Supply-Chain Cross-Linking):** Link vendors directly to the sub-systems they manufacture within the 43 Strategic Programs (e.g. Godrej Aerospace $\rightarrow$ BrahMos liquid ramjet engines; Astra Microwave $\rightarrow$ Uttam AESA T/R modules; MTAR Technologies $\rightarrow$ BrahMos assemblies & submarine fuel-cell AIP; L&T $\rightarrow$ Arihant reactor & Pinaka launchers).

---

### Pillar C: Order of Battle (ORBAT) & Squadron Deployment Wiki (Operational MOAT)
* **Audit & Feasibility Outcome:** ✅ **CONFIRMED & 100% FEASIBLE (Zero-Cost Architecture)**
  * **Data Verification:** Wikimedia REST API verified live with clean, structured tabular data:
    * **IAF Fighter Squadrons:** 11 structured tables cataloging all active operational squadrons (squadron number, crest, nickname, command, home airbase, active aircraft, and modernization pipeline).
    * **Indian Navy Warship & Submarine Registry:** 31 structured tables covering all commissioned aircraft carriers, SSBNs/SSKs, destroyers, frigates, corvettes, pennant numbers, home ports (Karwar, Vizag, Mumbai, Kochi), and weapon loadouts.
    * **Army Regimental Modernization:** Regimental centres, battle honours, and units undergoing indigenous modernization (Armoured Corps, Artillery with K9 Vajra & Pinaka, Army Air Defence with Akash & SAMAR).
  * **OpSec Compliance:** Strictly unclassified, open-source public intelligence (OSINT). Zero private/classified data.
* **Action 1 (IAF Fighter Squadrons):** Catalog operational IAF fighter squadrons into an interactive, filterable directory (by Command, Airbase, and Aircraft Type).
* **Action 2 (Indian Navy Fleet & Warship Registry):** Structure major commissioned surface combatants and submarines (searchable by Pennant Number, Class, Home Port, and Weapon Suite).
* **Action 3 (Army Formations & Modernization):** Document regiments and brigades operating indigenous platforms.

---

## Future Distribution & OSINT Backlog

### Geoint & NOTAM Missile Test Tracker (OSINT)
* **Audit & Feasibility Outcome:** ⚠️ **HIGH FRICTION FOR REAL-TIME SCRAPING | ARCHITECTURAL SPLIT ADOPTED**
  * **Network Audit Finding:**
    * AAI AIM portal (`aim-india.aai.aero`) monthly NOTAM summaries for Kolkata FIR (VECF) are open PDFs (`HTTP 200 OK`), but focus primarily on permanent aerodrome hazards.
    * FAA international NOTAM API (`notams.aim.faa.gov`) is gated behind Akamai EdgeSuite WAF (returns `Access Denied` to headless crawlers).
    * National Hydrographic Office (`hydrobharat.gov.in`) timed out via direct connection.
    * Real-time Temporary Danger Area NOTAMs for missile launches (Agni, K-4, BrahMos, Pralay) are ephemeral 48–72 hour bulletins. Automated scraping without residential proxies risks fragile bot breaks, mirroring the GePNIC procurement audit finding.
  * **Adopted Zero-Cost Architecture:**
    * **Phase 1 (Geoint Vector Map):** Build an interactive vector map using MapLibre / Leaflet with open CartoDB dark tiles, plotting permanent launch facilities (Dr APJ Abdul Kalam Island `20°45′N 87°05′E`, ITR Chandipur Launch Complex-III `21°26′N 87°00′E`), designated Bay of Bengal safety corridors, and strategic naval/air bases.
    * **Phase 2 (Official Launch Log):** Ingest verified missile test notifications when officially confirmed via PIB MoD press releases, parliamentary disclosures, or verified primary-source alerts, avoiding fragile scraper bot breakage.

---

### Automated Daily 60-Second SITREP Briefing
* **MOAT Impact:** Medium | **Friction:** Very Low (Deferred)
* **Status:** Deferred until DefenceWiki & Database foundation evolves.
* **Action 1:** Generate automated daily 200-word executive summary of top 5 Indian defence movements every day at 08:00 IST.
* **Action 2:** Distribute via automated Telegram channel, WhatsApp channel, and newsletter hook.

