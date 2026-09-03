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
  * **Vendor Discovery:** `idex.gov.in` roster of 40+ verified deep-tech startups/MSMEs.
  * **Sub-system Indigenisation:** DDP SRIJAN portal verified live (`HTTP 200 OK`) mapping platforms, DPSUs, and subsystems.
  * **Prime & Tier-2 Supply Chains:** Listed primes/DPSUs public supply chain data from filings and annual reports.
* **Status:** 🟡 **NEXT UP (Phase 2)**
* **Action 1 (Vendor Database):** Seed profiles for primes, DPSUs, and deep-tech startups in Cloudflare D1.
* **Action 2 (Capability Taxonomy):** Categorize suppliers by capability and certifications (AS9100, CEMILAC, ISO/IEC 17025).
* **Action 3 (Supply-Chain Linking):** Map vendors to 43 strategic program subsystems and iDEX challenge awardees.

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

