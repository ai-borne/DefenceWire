# DefenceWire Story Archive — One-Time Setup

The archive is a Cloudflare D1 database. All the application code (schema,
crawler write path, search API, UI) is already built and safe to deploy —
it degrades gracefully (archive sync no-ops, search returns a friendly
"not configured" error) until the steps below are completed. Nothing here
can be done by an agent without your Cloudflare account, so it's a manual
one-time checklist.

## 1. Log in to Cloudflare via Wrangler

```bash
npx wrangler login
```

## 2. Create the D1 database

```bash
npx wrangler d1 create defencewire-archive
```

This prints a `database_id`. Copy it.

## 3. Wire the database ID into `wrangler.toml`

Open `wrangler.toml` at the repo root and replace `REPLACE_WITH_D1_DATABASE_ID`
with the id from step 2. Commit that change — it's not a secret, just an
identifier, and Cloudflare Pages will read this file to bind the database
automatically on the next deploy (no dashboard step needed).

## 4. Apply the schema to the remote database

```bash
npm run d1:migrate:remote
```

(`npm run d1:migrate:local` runs the same schema against a local SQLite
emulator via `wrangler d1 execute --local` — useful for testing changes to
`d1/schema.sql` without touching the real database.)

## 5. Create a scoped API token for the crawler's write path

GitHub Actions has no Workers/D1 binding, so the crawler writes to the
archive over Cloudflare's D1 REST API using a token instead.

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token**
2. Use a custom token with permission: **Account → D1 → Edit**, scoped to
   your account (and ideally just the `defencewire-archive` database).
3. Copy the token — Cloudflare only shows it once.

## 6. Add three GitHub Actions secrets

In the repo's GitHub Settings → Secrets and variables → Actions, add:

| Secret | Value |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (dashboard right sidebar) |
| `CLOUDFLARE_D1_DATABASE_ID` | The `database_id` from step 2 |
| `CLOUDFLARE_API_TOKEN` | The token from step 5 |

Or via the CLI:

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set CLOUDFLARE_D1_DATABASE_ID
gh secret set CLOUDFLARE_API_TOKEN
```

## That's it

Once these are in place, the next scheduled crawl run (every 20 minutes)
will start archiving clusters that age out of the live feed, and the
**Archive** tab's search box will start returning results. You can verify
the write path is running by checking the Actions log for a line like:

```
[ARCHIVE SYNC] 3 archived, 0 failed
```

If it stays at `0 archived, 0 failed` for a long time, that's expected
until stories actually start aging out of the top-30 / 72-hour window —
give it a few hours to a day of real traffic before worrying.

## 7. (Curator Desk) Create the NEWS_LIVE KV namespace

The curator desk's "Sync to Cloudflare D1" / "Rollback Last Publish" flow
needs a KV namespace to hold the currently-live news snapshot. Like the D1
database, this degrades gracefully until provisioned: `functions/data/news.json.ts`
falls back to the static `public/data/news.json` asset when the binding is
absent, and `/api/curator/publish` / `/api/curator/rollback` return a 503
instead of erroring.

```bash
npx wrangler kv namespace create NEWS_LIVE
```

This prints an `id`. Open `wrangler.toml` and replace `REPLACE_WITH_KV_NAMESPACE_ID`
in the `[[kv_namespaces]]` block with it, then commit — same as the D1
`database_id`, it's an identifier, not a secret.
