# CLAUDE.md — functions/

Inherits all rules from the root `CLAUDE.md`. These are Cloudflare Pages Functions (`api/`, `story/`) — server-side, request-handling code.

- Treat every input (headers, query params, cookies, request bodies) as untrusted at this boundary — validate here (Rule 8: Read before you write, Rule: Cybersecurity).
- No secrets or credentials hardcoded; use environment bindings.
- Auth/session logic changes here are security-sensitive — flag assumptions explicitly rather than guessing (Rule 1).
