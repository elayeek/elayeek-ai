---
name: fan-out-research
description: Use when scanning a large corpus (sessions, logs, docs) with several analyst agents. Preprocess deterministically, share one rubric, batch by input size, compute numbers in code, archive each report.
---

# Fan-out analysis and research

For scanning large corpora (sessions, logs, docs) with N analyst agents:

- Preprocess deterministically first: script the raw data down to small per-unit extracts. Agents read extracts, never raw dumps.
- Put one shared rubric file on disk. Every prompt says "read the rubric at <path> and follow it exactly." Use the identical rubric across comparison groups, or the comparison is invalid.
- Batch by input size, not agent count: one 400KB file alone; several small ones together.
- Compute the numbers yourself in code. Analysts estimate; scripts measure.
- Archive each report to disk as it lands. Context summarization eats inline results in long sessions.
