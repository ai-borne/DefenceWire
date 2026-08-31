# CLAUDE.md — src/

Inherits all rules from the root `CLAUDE.md`. This folder holds the app's MVVM layers (`components`, `viewmodels`, `services`, `engine`, `utils`, `data`, `types`, `styles`, `seo`, `resources`).

- Keep View / ViewModel / Service boundaries intact — don't let components reach past their viewmodel into services or data directly.
- `resources/` and `styles/` are the SSOT for strings and colors (Rule: Resource Management) — no hardcoded strings/colors in components or viewmodels.
- 300-line file limit applies per file in this tree; split before exceeding it unless SRP genuinely requires otherwise (document why inline).
