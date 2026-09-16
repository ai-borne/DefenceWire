-- Phase 16: track Gemini calls per UTC day so the crawler can hard-cap
-- live API usage at a configurable daily budget and fall back to the
-- existing Cloudflare Workers AI / heuristic cascade once exhausted,
-- instead of relying solely on client-side RPM throttling.
CREATE TABLE IF NOT EXISTS gemini_usage (
  usage_date TEXT PRIMARY KEY,   -- YYYY-MM-DD (UTC)
  call_count INTEGER NOT NULL DEFAULT 0
);
