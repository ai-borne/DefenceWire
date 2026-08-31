# DefenceWire

Defence intelligence aggregation platform built with Vite and TypeScript.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Testing

```bash
npm test
```

## Deployment

Deployed via Cloudflare Pages, connected to this repository. Pushes to `main` trigger automatic builds and deployment.

## Environment variables

Set in Cloudflare Pages: **Workers & Pages → DefenceWire → Settings → Variables and secrets**. Changes apply on the next deployment (retry the latest deployment to pick them up immediately).

| Variable | Required | Description |
| --- | --- | --- |
| `CURATOR_PASSCODE_HASH` | No (has dev default) | SHA-256 hash of the curator desk passcode, used by the edge-session fallback login. |
| `CURATOR_SESSION_SECRET` | No (has dev default) | HMAC secret for signing the `dw_curator_session` cookie. |
| `CURATOR_TEAM_DOMAIN` | No (defaults to `defencewire.cloudflareaccess.com`) | Zero Trust team domain used to fetch the JWKS (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`) that verifies the `CF_Authorization` cookie signature in `functions/api/curator/auth.ts`. If the Zero Trust team is ever renamed (Zero Trust → Settings → Team name), update this variable to match — otherwise curator login via Cloudflare Access will start failing silently, bouncing back to the login modal. |
