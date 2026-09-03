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
* **MOAT Impact:** Very High | **Friction:** Low
* **Action 1 (Technical Encyclopedia):** Expand each program dossier with Jane's-grade technical specifications (operational range, combat radius, radar cross-section, weapon hardpoints, engine thrust, and sensor suites like Uttam AESA, Virupaksha, Varuna).
* **Action 2 (Order Book & Delivery Tracker):** Track sanctioned procurement numbers vs units delivered vs pending, contract values, and delivery milestones (e.g. 83 Tejas Mk1A delivery schedule across Sulur and Nal air bases).
* **Action 3 (Fold in iDEX Problem Statements):** Rather than an empty standalone tab, map the ~500 historical and active iDEX/ADITI challenge statements directly to relevant strategic programs (e.g. swarm drone jamming $\rightarrow$ CATS Warrior; fuel cell AIP $\rightarrow$ Project 75I; radar T/R modules $\rightarrow$ AMCA).

---

### Pillar B: Verified Indian Defence MSME & Supplier Directory (Database MOAT Evolution)
* **MOAT Impact:** High | **Friction:** Medium
* **Action 1 (Vendor Database):** Seed and structure profiles for Indian defence primes (Tata Advanced Systems, L&T Defence, Bharat Forge/Kalyani Strategic, Solar Industries), DPSUs (HAL, BEL, BDL, MDL), and deep-tech startups (Zen Technologies, Tonbo Imaging, ideaForge, SSS Defence).
* **Action 2 (Capability & Certification Taxonomy):** Categorize suppliers by capability (precision machining, composite airframes, seeker optics, energetic materials, counter-UAS) and certifications (AS9100, CEMILAC, ISO/IEC 17025).
* **Action 3 (Program Supply-Chain Cross-Linking):** Link vendors directly to the sub-systems they manufacture within the 43 Strategic Programs (e.g. Godrej Aerospace $\rightarrow$ BrahMos liquid ramjet engines; Dynamatic Technologies $\rightarrow$ Tejas front fuselage; Solar Industries $\rightarrow$ Pinaka rocket warheads).

---

### Pillar C: Order of Battle (ORBAT) & Squadron Deployment Wiki (Operational MOAT)
* **MOAT Impact:** High | **Friction:** Medium
* **Action 1 (IAF Fighter Squadrons):** Catalog operational IAF fighter squadrons (squadron number, crest, nickname, home airbase, active aircraft type, and re-equipment timeline).
* **Action 2 (Indian Navy Fleet & Warship Registry):** Structure major commissioned surface combatants and submarines (pennant numbers, class, home port: Karwar, Vizag, Mumbai, Kochi, and weapon loadouts).
* **Action 3 (Army Formations & Modernization):** Document armoured regiments, artillery brigades, and air defence units operating indigenous platforms (K9 Vajra regiments, Pinaka batteries, Akash-NG units).

---

## Future Distribution & OSINT Backlog

### Geoint & Open-Source Conflict Tracker (OSINT)
* **MOAT Impact:** High | **Friction:** Medium-High
* **Action 1:** Ingest open NOTAM (Notice to Airmen) alerts to detect and plot missile test launch danger corridors off Wheeler Island (APJ Abdul Kalam Island) and ITR Chandipur.
* **Action 2:** Aggregate verified OSINT feeds/channels covering LAC, LoC, and Indian Ocean naval deployments.
* **Action 3:** Map geocoded events onto an interactive map widget using Leaflet / MapLibre (free, open-source tile sets).

---

### Automated Daily 60-Second SITREP Briefing
* **MOAT Impact:** Medium | **Friction:** Very Low (Deferred)
* **Status:** Deferred until DefenceWiki & Database foundation evolves.
* **Action 1:** Generate automated daily 200-word executive summary of top 5 Indian defence movements every day at 08:00 IST.
* **Action 2:** Distribute via automated Telegram channel, WhatsApp channel, and newsletter hook.

