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
* **MOAT Impact:** Very High | **Friction:** Lowest
* **Action 1:** Write Python crawler for PIB MoD feed (`pib.gov.in`, Ministry of Defence filter). Ingest official press releases hourly.
* **Action 2:** Write scheduled scraper for Lok Sabha / Rajya Sabha defence unstarred/starred questions and written answers.
* **Action 3:** Run Flash LLM prompt to extract structured tags (`program`, `budget_crores`, `delays`, `equipment_type`, `foreign_oem`).
* **Action 4:** Render official badges and primary-source citations in DefenceWire news cards.

---

### 2. Strategic Defence Program Lifecycle Trackers
* **MOAT Impact:** Very High | **Friction:** Low
* **Action 1:** Create structured schema for key programs (`AMCA`, `Tejas Mk1A/Mk2`, `Project 75I`, `Zorawar`, `MQ-9B`, `S-400/Kusha`, `TEDBF`).
* **Action 2:** Auto-link every ingested article, PIB release, and parliamentary answer to corresponding program IDs via keyword/semantic tagging.
* **Action 3:** Build frontend dedicated Program Pages showing milestone timeline, budget spent vs allocated, engine/radar trial status, and related news.

---

### 3. Defence RFI / RFP & Tender Pipeline Tracker
* **MOAT Impact:** Extreme | **Friction:** Medium
* **Action 1:** Scrape public procurement portals (`mod.gov.in/dod/tenders`, `defproc.gov.in`, `eprocure.gov.in`).
* **Action 2:** Parse RFI/RFP PDFs locally (`pypdf`/`pdfplumber`) and pass summary text to Flash LLM.
* **Action 3:** Extract metadata: Target Domain (Army/Navy/Air Force), Submission Deadline, Make-in-India / IDDM % requirement, Eligibility.
* **Action 4:** Build filterable `/tenders` page with instant email/webhook alerts for MSMEs and defence contractors.

---

### 4. iDEX, DRDO TDF & Startup Innovation Feed
* **MOAT Impact:** High | **Friction:** Low
* **Action 1:** Crawl `idex.gov.in` and `tdf.drdo.in` challenge updates, problem statements, grant announcements, and winner lists.
* **Action 2:** Extract specific technologies sought (e.g., AI target recognition, quantum key distribution, loitering munitions).
* **Action 3:** Create dedicated `/startups-idex` tracker categorizing open innovation grants for Indian defence founders.

---

### 5. Verified Indian Defence MSME & Supplier Directory
* **MOAT Impact:** High | **Friction:** Medium
* **Action 1:** Seed vendor database by parsing public exhibitor lists (Aero India, DefExpo) and iDEX/TDF winner archives.
* **Action 2:** Structure vendor profiles by capability (e.g., precision machining, carbon composites, EW avionics, AS9100/CEMILAC certified).
* **Action 3:** Add "Claim Listing / Submit Capability" self-service portal for Indian MSMEs to maintain their directory profile for free.

---

### 6. Geoint & Open-Source Conflict Tracker (OSINT)
* **MOAT Impact:** High | **Friction:** Medium-High
* **Action 1:** Ingest open NOTAM (Notice to Airmen) alerts to detect missile tests off Wheeler Island / ITR Chandipur.
* **Action 2:** Aggregate verified OSINT feeds/channels covering LAC, LoC, and Indian Ocean naval deployments.
* **Action 3:** Map geocoded events onto an interactive map widget using Leaflet / MapLibre (free, open-source tile sets).

---

### 7. Automated Daily 60-Second SITREP Briefing
* **MOAT Impact:** Medium | **Friction:** Very Low
* **Action 1:** Generate automated daily 200-word executive summary of top 5 Indian defence movements every day at 08:00 IST.
* **Action 2:** Distribute via automated Telegram channel, WhatsApp channel, and free Substack/newsletter hook.
