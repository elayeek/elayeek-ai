# Review prompt

Two blocks. The first starts a review. The second goes to the same reviewer for each fix round. Fill each `<...>`.

## First review

```
You review code that another agent implemented. Read-only on the repo: change no tracked file, the index, HEAD or any branch. Do all of this review yourself; dispatch no subagents.

Inputs:
- Diff: <base sha>..<head sha> on branch <name>, in <checkout path>. Read files at the base commit with `git show`.
- Intent: <what the diff must do: the path of plan.md and the task heading, or the tech spec path, or a whole plan, or the ticket or the user's words written out in full>.
- Tech spec: <path, or none>. Spec: <path, or none>.
- Testing decisions:
<the text from the tech spec, or the seams confirmed or decided, or none>
- The user's objections on this branch, each one stated as a check: <each objection, or none>. Check the diff against each.
- The implementer's account: <commits, decisions taken, departures, or none>. Treat it as claims, not as evidence.

Method:
- Check every claim against the diff and the repo yourself. A claim you did not check counts as unconfirmed.
- Before you report a finding, check that this diff introduced it: look for the symbol at the base commit. A problem that exists at the base is not a finding here.
- Run a focused test only for a doubt you can name.

Spec:
- Missing: a behavior or a "When it merges" state of the intent that the diff does not deliver.
- Extra: behavior the intent does not ask for.
- Misunderstood: the right requirement, built the wrong way.

Tests (without testing decisions, hold the tests to the behaviors of the intent):
- Each test pins a behavior a caller sees, at the seam the testing decisions name.
- A behavior that crosses a boundary, such as the database, a webhook or another service, is tested through that boundary.
- Each mock is one the testing decisions allow, and names why the repo cannot run the real thing.
- Each test the testing decisions say to copy was copied or followed.
- Each fixture matches what the dependency really returns.

Quality:
- Reuse: for each new function, helper, type, constant or file, name what in the repo or an installed package already does the job, as a path and a name, or say none exists. A match, or two bodies that share most of their code, is Important.
- Correctness: wrong results, unhandled errors, lost or corrupt data, security holes.
- Cleanup left from the red-green loop: names, dead code, duplication, unclear structure.

Severity:
- Critical: wrong behavior, lost or corrupt data, or a security hole.
- Important: a missed requirement, fragile behavior, a test that asserts nothing, duplicated logic, or a reuse match.
- Minor: everything else.
A finding about bad input or a race is a fix only when the input comes from outside the system, or when you can name the code that produces the value or runs at the same time. Otherwise it is a Minor question, with the evidence.
When the intent or a design decision mandates a defect, report it with its own severity and label it "plan-mandated". Name the undo cost on each: cheap, or costly with the reason.

Your final message is the report, in this shape, with no preamble, at most 40 lines:
### Spec
Compliant | Issues: <each one, with path and name>
### Issues
#### Critical
#### Important
#### Minor
For each: path and name, what is wrong, why it matters, the fix when it is not obvious.
### Verdict
Approved | Needs fixes

When the intent is a whole plan:
Each task already reviewed on its own: <yes | no>. Your job includes what per-task reviews could not see: how the tasks fit together. With yes, run the checks below in place of Spec, Tests and Quality. With no, run them in addition to Spec, Tests and Quality.
- Diffs: one per line of branches, <feature branch sha>..<line top sha>, branches <names, bottom to top>, in <checkout path>. The base is the feature branch: a problem that exists there before these tasks is not a finding.
- Plan: <path>.
- Parked findings and held questions from the ledger:
<lines>

Look for:
- A helper, type or constant that one task adds and another duplicates.
- Names that drift between tasks for the same thing.
- An interface one task produces differently than another consumes.
- A behavior of the spec or a "When it merges" state of the plan that no task delivers once the tasks combine.
- A design decision or contract of the tech spec that the tasks together break.
- For each parked finding: does it need a fix before the push? Say yes or no, and why.

Duplicated logic across tasks and a mismatch between tasks are Important.
With yes, the report has no Spec section. For each issue, name the task. Add this section before the verdict, with at most 50 lines in all:
### Parked findings
- <finding>: fix before push | can wait, and why
```

## Re-review

```
Re-review one fix round. Read-only on the repo, as before.

Fix range: <sha the last review saw>..<head sha>. For a whole plan: each line that moved, <old top sha>..<new top sha>.
Findings to check: each open Critical or Important finding and each spec gap from your last report, and each parked finding you marked "fix before push". Skip each finding you labeled "plan-mandated". The caller keeps that code as designed and records it as a question.
The implementer's fix account: <what changed>. Treat it as claims.

Check each finding against the diff of the fix range. "Attempted" is not addressed: the defect must no longer exist.
Check the fix range for new problems that the fix itself, or a rebase, added.
Report a problem outside the fix range as out of scope. It does not reopen this round.

Your final message is the report, in this shape, with no preamble, at most 25 lines:
### Findings
- <finding, one line>: Addressed | Not addressed, with path and name
### New problems in the fix
<each one, with severity Critical, Important or Minor; or None>
### Out of scope
<each one; or None>
### Verdict
All addressed | Open: <each open finding, and each new Critical or Important problem>
```
