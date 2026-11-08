---
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
---

# Diagnosing Bugs

A discipline for hard bugs. Skip phases only when explicitly justified.

This skill ends at a failing test and a confirmed cause. It does not write the fix: `elayeek-ai:implement` does, after the handoff in Phase 6.

When exploring the codebase, read `GLOSSARY.md` (if it exists) to get a clear mental model of the relevant modules, and check ADRs in the area you're touching.

## Redact

This skill has you show commands, outputs and captured artifacts. **Redact every secret first**: write `<REDACTED>` in its place. Build loops against env vars, so the credential stays in the environment rather than in what you show. Captured artifacts carry auth headers: quote only the lines that carry the signal.

If the redacted output is not enough to diagnose the bug, say so and ask the user.

## Phase 1: Build a feedback loop

**This is the core of the skill.** With a **tight** pass/fail signal for the bug (one that goes red on _this_ bug), you will find the cause: bisection, hypothesis-testing, and instrumentation all just consume it. Without one, no amount of staring at code helps.

### Before the loop

- Read the full error message and stack trace: every line number, file path and error code.
- Check recent changes: the git diff and recent commits, new dependencies, config changes, and environment differences.

### Ways to construct one, in roughly this order

1. **Failing test** at whatever seam reaches the bug: unit, integration, e2e.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) that drives the UI and asserts on DOM/console/network.
5. **Replay a captured trace.** Save a real network request / payload / event log to disk; replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system (one service, mocked deps) that exercises the bug code path with a single function call.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run 1000 random inputs and look for the failure mode.
8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" so you can `git bisect run` it.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs.
10. **HITL bash script.** Last resort. If a human must click, drive _them_ with `${CLAUDE_SKILL_DIR}/scripts/hitl-loop.template.sh` so the loop is still structured. Captured output feeds back to you.

### Tighten the loop

Treat the loop as a product. Once you have _a_ loop, **tighten** it:

- Can I make it faster? (Cache setup, skip unrelated init, narrow the test scope.)
- Can I make the signal sharper? (Assert on the specific symptom, not "didn't crash".)
- Can I make it more deterministic? (Pin time, seed RNG, isolate filesystem, freeze network.)

A 30-second flaky loop is barely better than no loop; a 2-second deterministic one is tight.

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not, so keep raising the rate until it's debuggable.

### When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Ask the user for: (a) access to whatever environment reproduces it, (b) a redacted captured artifact (HAR file, log dump, core dump, screen recording with timestamps), or (c) permission to add temporary production instrumentation. Do **not** proceed to hypothesise without a loop.

### Completion criterion: a tight loop that goes red

Phase 1 is done when the loop is **tight** and **red-capable**: you can name **one command** (a script path, a test invocation, a curl) that you have **already run at least once** (show the invocation and its output, redacted), and that is:

- [ ] **Red-capable**: it drives the actual bug code path and asserts the **user's exact symptom**, so it can go red on this bug and green once fixed. Not "runs without erroring"; it must be able to _catch this specific bug_.
- [ ] **Deterministic**: same verdict every run (flaky bugs: a pinned, high reproduction rate, per above).
- [ ] **Fast**: seconds, not minutes.
- [ ] **Agent-runnable**: you can run it unattended; a human in the loop only via `${CLAUDE_SKILL_DIR}/scripts/hitl-loop.template.sh`.

Reading code to build a theory before this command exists is the failure this skill prevents. No red-capable command, no Phase 2.

## Phase 2: Reproduce + minimise

Run the loop. Watch it go red as the bug appears.

Confirm:

- [ ] The loop produces the failure mode the **user** described, not a different failure that happens to be nearby. Wrong bug = wrong cause.
- [ ] The failure is reproducible across multiple runs (or, for non-deterministic bugs, reproducible at a high enough rate to debug against).
- [ ] You have captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the cause explains it.

### Minimise

Once it's red, shrink the repro to the **smallest scenario that still goes red**. Cut inputs, callers, config, data, and steps **one at a time**, re-running the loop after each cut, and keep only what's load-bearing for the failure.

A minimal repro shrinks the hypothesis space in Phase 3 (fewer moving parts left to suspect) and becomes the failing test in Phase 5.

Done when **every remaining element is load-bearing**: removing any one of them makes the loop go green.

Do not proceed until you have reproduced **and** minimised.

## Phase 3: Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable**: state the prediction it makes.

> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

If you cannot state the prediction, the hypothesis is a vibe: discard or sharpen it.

**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly ("we just deployed a change to #3"), or know hypotheses they've already ruled out. Don't block on it; proceed with your ranking if the user is AFK.

## Phase 4: Instrument

Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**

Tool preference:

1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".

When the bug crosses several components (CI → build → signing, API → service → database), log what enters and what leaves each component in one run. The component where good data turns bad is the failing layer; continue inside it.

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep. Untagged logs survive; tagged logs die.

**Perf branch.** For performance regressions, logs are usually wrong. Instead: establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect.

Done when one hypothesis's prediction held under a probe and the others are ruled out: that is the **confirmed cause**. Write it as the cause, the winning hypothesis, and the evidence.

## Phase 5: Failing test

Write the failing test **only if** there is a **correct seam** for it.

A correct seam is one where the test exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that can't replicate the chain that triggered the bug), a test there gives false confidence.

**If no correct seam exists, that itself is the finding.** The codebase architecture is preventing the bug from being locked down. Report it with the confirmed cause, and let the user decide; adding a seam is a design decision. Stop here; skip Phase 6's handoff.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail. If you forced the red by mutating code or a fixture, `diff` against a pristine copy to prove the mutation landed before you trust it.
3. Keep the test as an uncommitted file. Do not write the fix.

## Phase 6: Cleanup and handoff

Required before the handoff:

- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix)
- [ ] Every throwaway prototype and temporary probe edit removed; `git status` shows only the failing test file
- [ ] The failing test still goes red (run its command)

Then:

- **The user asked only for a diagnosis**: do not call `elayeek-ai:implement`. End with a report: the cause, the failing test, and the fix you propose.
- **Otherwise** call the Skill tool with `elayeek-ai:implement`. Give it an ask that holds:
  - the cause and the winning hypothesis, to state in the commit message so the next debugger learns;
  - the failing test's path;
  - the command that shows it red;
  - the words "include the failing test file", because implement stops on uncommitted changes unless told to include them.

When implement reports `DONE`, re-run the Phase 1 loop on the original scenario. Green: done. Red: the cause was wrong (see below).

When implement stops `BLOCKED` because the failing test stays red, the cause was wrong (see below). Pass any other `BLOCKED` question to the user.

### When the cause was wrong

Before the next attempt, name the failed fix's commits to the user and ask whether to revert them. Drop the winning hypothesis and go back to Phase 3 with what the failed fix taught you.

After 3 wrong causes, stop and question the design with the user. Signs that the design is the problem:

- Each fix reveals shared state or coupling in a different place.
- Each fix needs a large refactor.
- Each fix creates new symptoms elsewhere.
