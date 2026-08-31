# CLAUDE.md — scripts/

Inherits all rules from the root `CLAUDE.md`. Operational/build/maintenance scripts.

- Deterministic transforms and routing belong in plain code, not model calls (Rule 5).
- Scripts that touch production data, deployments, or CI must state assumptions and success criteria up front before running (Rule 1, Rule 4).
