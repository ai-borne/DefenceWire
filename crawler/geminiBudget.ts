/**
 * Gemini Daily Call Budget
 * Reads/increments a per-UTC-day call counter in D1 so a crawler run can hard-stop
 * live Gemini calls once a configured daily cap is reached, instead of relying only
 * on client-side RPM throttling. D1 outages fail open (never block ingestion).
 */
import { D1RestConfig } from './archiveSync.js';

export interface GeminiBudgetConfig {
  d1: D1RestConfig;
  dailyLimit: number;
}

export function geminiBudgetConfigFromEnv(
  d1: D1RestConfig | null,
  env: NodeJS.ProcessEnv = process.env
): GeminiBudgetConfig | null {
  if (!d1) return null;
  const dailyLimit = Number(env.GEMINI_DAILY_LIMIT ?? '');
  if (!Number.isFinite(dailyLimit) || dailyLimit <= 0) return null;
  return { d1, dailyLimit };
}

function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Returns how many Gemini calls have already been recorded for today (0 if unknown/offline). */
export async function getGeminiDailyCallCount(
  config: GeminiBudgetConfig | null,
  fetchFn: typeof fetch = globalThis.fetch,
  now: Date = new Date()
): Promise<number> {
  if (!config) return 0;
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.d1.accountId}/d1/database/${config.d1.databaseId}/query`;
  try {
    const res = await fetchFn(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.d1.apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: 'SELECT call_count FROM gemini_usage WHERE usage_date = ?;',
        params: [todayUtc(now)]
      })
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { result?: { results?: { call_count?: number }[] }[] };
    return data.result?.[0]?.results?.[0]?.call_count ?? 0;
  } catch {
    return 0;
  }
}

/** Best-effort increment; failures are logged but never throw (must not block ingestion). */
export async function recordGeminiCalls(
  config: GeminiBudgetConfig | null,
  count: number,
  fetchFn: typeof fetch = globalThis.fetch,
  now: Date = new Date()
): Promise<void> {
  if (!config || count <= 0) return;
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.d1.accountId}/d1/database/${config.d1.databaseId}/query`;
  try {
    const res = await fetchFn(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.d1.apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: `INSERT INTO gemini_usage (usage_date, call_count) VALUES (?, ?)
              ON CONFLICT(usage_date) DO UPDATE SET call_count = gemini_usage.call_count + excluded.call_count;`,
        params: [todayUtc(now), count]
      })
    });
    if (!res.ok) console.error('[GEMINI BUDGET] Failed to record calls, status=', res.status);
  } catch (err) {
    console.error('[GEMINI BUDGET] Failed to record calls', err instanceof Error ? err.message : String(err));
  }
}
