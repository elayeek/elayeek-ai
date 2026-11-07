---
name: review-code
description: Use when the user or a skill asks to review code, a branch, a commit range, a PR or a fix. Sends a fresh reviewer agent over a diff against its intent and returns the findings as Critical, Important and Minor. Fixes nothing.
---

# Review code

This skill reviews a **diff** against its **intent** and returns the findings by severity. The diff is a commit range, a branch against its parent, or the base and head of a PR. The intent is what the diff must do: a ticket, a tech spec, a plan task, a whole plan, or the user's words.

A fresh reviewer agent does the review, and this skill never reviews inline. It fixes nothing. The caller, or the user, decides what happens to each finding.

When the user calls you without a diff or without an intent, ask for the missing one and end the turn.

## Review

1. Fill in the first block of `${CLAUDE_SKILL_DIR}/review-prompt.md` from the inputs the caller gives. For a whole plan, pass on whether the caller states that each task was already reviewed. Dispatch a fresh `general-purpose` agent with it.
2. Set the model: `opus` when the change touches stored or shared data, concurrency, auth or PHI, or turns on algorithm correctness; otherwise `sonnet`. A caller may raise the tier. Set effort `medium`, one level up or down with the reason.
3. The dispatch runs in the background. Wait for the reviewer's report.
4. Return the report as the reviewer wrote it, with the reviewer's model, effort, reason for a changed effort, and agent id. When the user called you, give the user the report in chat and stop. The user decides.

Done when: the caller or the user has the reviewer's report.

## Re-review

After a caller fixes findings, it calls this skill again with the fix range and its account of the fix.

1. Resume the same reviewer through SendMessage with the re-review block of `${CLAUDE_SKILL_DIR}/review-prompt.md`, filled in. Wait for its report.
2. If the reviewer cannot be resumed, dispatch a fresh reviewer with the first block, the same model and effort, and the last report.
3. Return the report as Review step 4 says.

Done when: the caller has the reviewer's report on the fix range.
