# CLAUDE.md — crawler/

Inherits all rules from the root `CLAUDE.md`. This is the autonomous crawler that refreshes the defence intelligence feed (runs unattended via CI, per recent commit history).

- Autonomous/unattended runs must fail loud: no silent skips of feed sources or partial writes reported as success (Rule 12).
- Deterministic parsing/fetch/retry logic belongs in code, not model judgment calls (Rule 5) — only use the model for genuinely ambiguous classification/extraction from source content.
- Changes here affect a scheduled job with no human in the loop per-run — be conservative; verify locally before assuming a change is safe for the next scheduled invocation.
