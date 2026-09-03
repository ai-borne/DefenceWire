#!/usr/bin/env node
/**
 * Supplier Candidate Review CLI (Phase 2.6 — Autonomous Growth Pipeline)
 * Human-in-the-loop gate for crawler/supplierCandidateExtractor.ts drafts.
 * Not exposed as a public endpoint — run locally/by a maintainer with
 * Cloudflare D1 REST credentials in the environment (same vars as the
 * crawler: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN).
 *
 * Usage:
 *   node scripts/review-supplier-candidates.mjs list
 *   node scripts/review-supplier-candidates.mjs approve <candidateId> [reviewerEmail]
 *   node scripts/review-supplier-candidates.mjs reject <candidateId> [reviewerEmail]
 *
 * Approval promotes the draft into the live `program_suppliers` table.
 * Rejection retains the row for audit with status='rejected'. Neither path
 * ever writes to `suppliers` — candidates only draft links between suppliers
 * and programs that already exist in the verified directory.
 */

async function runD1Query(sql, params, config) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params })
  });
  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`D1 REST HTTP ${res.status}: ${bodyText}`);
  }
  const body = JSON.parse(bodyText);
  return body.result?.[0]?.results ?? [];
}

function loadConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !databaseId || !apiToken) {
    console.error('❌ Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_DATABASE_ID / CLOUDFLARE_API_TOKEN in environment.');
    process.exit(1);
  }
  return { accountId, databaseId, apiToken };
}

async function listPending(config) {
  const rows = await runD1Query(
    `SELECT id, supplier_name, program_id, subsystem_name, confidence, mention_count, source_count, source_domains, source_story_id
     FROM supplier_candidates WHERE status = 'pending' ORDER BY confidence DESC, mention_count DESC;`,
    [],
    config
  );
  if (rows.length === 0) {
    console.log('No pending supplier candidates.');
    return;
  }
  console.log(`${rows.length} pending candidate(s):\n`);
  for (const r of rows) {
    console.log(`[${r.id}]`);
    console.log(`  ${r.supplier_name} -> program "${r.program_id}" (subsystem: ${r.subsystem_name})`);
    console.log(`  confidence=${r.confidence} mentions=${r.mention_count} sources=${r.source_count} domains=${r.source_domains}`);
    if (r.source_story_id) console.log(`  source story: ${r.source_story_id}`);
    console.log('');
  }
}

async function getCandidate(id, config) {
  const rows = await runD1Query('SELECT * FROM supplier_candidates WHERE id = ? LIMIT 1;', [id], config);
  return rows[0] || null;
}

async function approve(id, reviewer, config) {
  const candidate = await getCandidate(id, config);
  if (!candidate) {
    console.error(`❌ No candidate found with id "${id}".`);
    process.exit(1);
  }
  if (candidate.status !== 'pending') {
    console.error(`❌ Candidate "${id}" already reviewed (status=${candidate.status}).`);
    process.exit(1);
  }

  const payload = JSON.parse(candidate.payload_json);
  const supplierRow = await runD1Query('SELECT tier FROM suppliers WHERE id = ? LIMIT 1;', [candidate.supplier_id], config);
  if (supplierRow.length === 0) {
    console.error(`❌ Supplier "${candidate.supplier_id}" not found in the live suppliers table — cannot promote a link to it.`);
    process.exit(1);
  }

  const now = new Date().toISOString();
  await runD1Query(
    `INSERT INTO program_suppliers (program_id, subsystem_name, supplier_id, tier, indigenisation_status)
     VALUES (?, ?, ?, ?, 'in_house')
     ON CONFLICT(program_id, subsystem_name, supplier_id) DO NOTHING;`,
    [candidate.program_id, candidate.subsystem_name, candidate.supplier_id, supplierRow[0].tier],
    config
  );
  await runD1Query(
    `UPDATE supplier_candidates SET status = 'approved', reviewed_at = ?, reviewed_by = ? WHERE id = ?;`,
    [now, reviewer || 'unspecified-reviewer', id],
    config
  );
  console.log(`✅ Approved and promoted "${id}" — ${payload.supplierName} linked to program "${candidate.program_id}".`);
  console.log('   Note: subsystem_name and indigenisation_status were drafted defaults — verify/edit them in D1 if needed.');
}

async function reject(id, reviewer, config) {
  const candidate = await getCandidate(id, config);
  if (!candidate) {
    console.error(`❌ No candidate found with id "${id}".`);
    process.exit(1);
  }
  if (candidate.status !== 'pending') {
    console.error(`❌ Candidate "${id}" already reviewed (status=${candidate.status}).`);
    process.exit(1);
  }
  const now = new Date().toISOString();
  await runD1Query(
    `UPDATE supplier_candidates SET status = 'rejected', reviewed_at = ?, reviewed_by = ? WHERE id = ?;`,
    [now, reviewer || 'unspecified-reviewer', id],
    config
  );
  console.log(`🚫 Rejected "${id}".`);
}

async function main() {
  const [, , command, arg1, arg2] = process.argv;
  const config = loadConfig();

  if (command === 'list') {
    await listPending(config);
  } else if (command === 'approve' && arg1) {
    await approve(arg1, arg2, config);
  } else if (command === 'reject' && arg1) {
    await reject(arg1, arg2, config);
  } else {
    console.error('Usage: node scripts/review-supplier-candidates.mjs <list|approve|reject> [candidateId] [reviewerEmail]');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Review script failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
