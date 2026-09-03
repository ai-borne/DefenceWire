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
* **Action 1 (Technical Encyclopedia):** Expand each program dossier with Jane's-grade technical specifications (dimensions, payload, powerplant, radar cross-section, weapon hardpoints, engine thrust, and sensor suites like Uttam AESA, Virupaksha, Varuna).
* **Action 2 (Order Book & Delivery Tracker):** Track sanctioned procurement numbers vs units delivered vs pending, contract values (₹ Cr), and delivery milestones (e.g. 83 Tejas Mk1A delivery schedule across Sulur and Nal air bases).
* **Action 3 (Folded-in iDEX Challenges):** Map parsed iDEX/ADITI challenge statements directly to relevant strategic programs (e.g. autonomous UAS targeting & heavy swarm logistics $\rightarrow$ CATS Warrior / Tapas-BH; microbolometer FPAs & Dewar coolers $\rightarrow$ Zorawar / BMP-2 upgrade; AIP fuel cells $\rightarrow$ Project 75I; T/R radar modules $\rightarrow$ AMCA).

---

### Pillar B: Verified Indian Defence MSME & Supplier Directory (Database MOAT Evolution)
* **Audit & Feasibility Outcome:** ✅ **CONFIRMED & 95% FEASIBLE (Zero-Cost Architecture)**
  * **Vendor Discovery:** `idex.gov.in` natively exposes an active roster of 40+ verified deep-tech startups and MSMEs (Tonbo Imaging, Big Bang Boom, QNu Labs, Zeus Numerix, NewSpace Research, Zen Technologies, Optimized Electrotech, EyeROV, Skyroot, Lekha Wireless).
  * **Sub-system Indigenisation:** DDP SRIJAN portal (`ddpmod.gov.in/en/offerings/srijan-defence-products`) verified live (`HTTP 200 OK`), directly mapping platforms, DPSUs, and subsystems (e.g., T-90 Tank Gunner Sight Visors, Prisms, and Drives).
  * **Prime & Tier-2 Supply Chain Mapping:** Listed Indian defence primes and DPSUs (TASL, L&T Defence, Bharat Forge/Kalyani, Solar Industries, Astra Microwave, Data Patterns, MTAR, Dynamatic, Paras Defence) publicly document subsystem supply chains in regulatory filings and annual reports.
* **Action 1 (Vendor Database):** Seed and structure profiles for Indian defence primes, DPSUs, and deep-tech startups in Cloudflare D1 with zero recurring hosting costs.
* **Action 2 (Capability & Certification Taxonomy):** Categorize suppliers by capability (precision machining, composite airframes, seeker optics, energetic materials, counter-UAS) and certifications (AS9100, CEMILAC, ISO/IEC 17025).
* **Action 3 (Program Supply-Chain Cross-Linking):** Link vendors directly to the sub-systems they manufacture within the 43 Strategic Programs (e.g. Godrej Aerospace $\rightarrow$ BrahMos liquid ramjet engines; Dynamatic Technologies $\rightarrow$ Tejas front fuselage; Solar Industries $\rightarrow$ Pinaka rocket warheads; Astra Microwave $\rightarrow$ Uttam AESA T/R modules; L&T $\rightarrow$ Arihant hull & Pinaka launchers).

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

