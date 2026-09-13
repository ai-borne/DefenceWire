# Canonical Topic Phase 0 — Repository Baseline

- Captured: 2026-09-13
- News snapshot timestamp: 2026-09-08T11:47:40.546Z
- Reproduce: `npm run baseline:topics`
- Scope: committed repository snapshot only; no remote Cloudflare state was queried

## Source fingerprints

| Source | SHA-256 |
|---|---|
| `public/data/news.json` | `2d32b857ad676f4bcc6030ee4e827ca2fb8340fb3ac498bc1820c91a237df1c6` |
| `d1/seeds/threads.sql` | `9c270ec2ad07ccd9710f88de23751f2b9f7055200a9501c6732722aadd1f6fd9` |

The hashes bind these results to exact inputs. Later crawler updates must create a new dated baseline rather than silently rewriting this one.

## Results

| Metric | Baseline |
|---|---:|
| Articles fetched before freshness/relevance filtering | 293 |
| Eligible fresh river articles | 78 |
| Retained clusters | 31 |
| Clusters with `primaryTag` or at least one hashtag | 17 |
| Tagged cluster percentage | 54.84% |
| Distinct observed tag spellings | 22 |
| Normalized observed topic keys | 17 |
| Extra spelling variants | 5 |
| Observable eligible articles absent from retained cluster sources | 45 |
| Seeded story threads | 11 |
| Seeded thread events | 14 |
| Retained clusters represented by a seeded thread event | 13 |
| Orphan retained clusters in the repository snapshot | 18 |
| Seeded `canonical_entities` records | 0 |

## Observed tag fragmentation

| Normalized key | Spellings in the snapshot |
|---|---|
| `dacclearance` | `DAC Clearance`, `DACClearance` |
| `eos05` | `EOS-05`, `EOS05` |
| `inssudarshini` | `INS Sudarshini`, `INSSudarshini` |
| `projectkusha` | `Project Kusha`, `ProjectKusha` |
| `su57` | `Su-57`, `Su57` |

This is a spelling-fragmentation baseline, not proof that every pair is semantically equivalent. Phase 1 registry seeding and curator review determine canonical identity.

## Metric definitions

- **Tagged cluster:** a retained cluster with a non-empty `primaryTag` or `hashtags` array.
- **Observed tag spelling:** a distinct non-empty string found in either current field.
- **Normalized topic key:** an observed spelling after removing a leading `#`, applying Unicode compatibility decomposition, folding diacritics, lowercasing, and removing non-alphanumeric characters. This is a measurement heuristic, not linguistic transliteration or the future canonical resolver.
- **Extra spelling variant:** observed spelling count minus normalized key count.
- **Observable article excluded from retained clusters:** a URL in the committed eligible river that is absent from the primary and related source URLs of every retained cluster.
- **Orphan retained cluster:** a retained cluster ID absent from all committed `d1/seeds/threads.sql` event rows.
- **Existing canonical alias:** a durable `canonical_entities` alias row. The committed seed contains no such rows, so the repository baseline is zero; the five observed spelling groups above are candidate variants, not canonical aliases.

## Fail-loud limitations

1. The snapshot does not retain the pre-slice `allClusters` collection. Therefore, 45 is the observable article-level effect of truncation, not an exact discarded-cluster count.
2. Thread and orphan counts compare two committed artifacts. They do not claim to describe current remote D1 state.
3. Learned canonical entities and aliases live in remote D1 and cannot be reproduced from this repository. No Cloudflare credentials were available during Phase 0, so remote counts were not invented.
4. The river contains the eligible articles retained in the published snapshot, up to its existing limit. A future durable pipeline must measure exclusions before any river or homepage limit.

These limitations do not block the Phase 0 goal of measuring the current repository dataset. Production-runtime reconciliation is included in the plan's final validation phase so it cannot be silently forgotten.
