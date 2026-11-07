# Final review prompt

Two blocks. Send the first to a fresh reviewer on `opus`. Send the second to the same reviewer through SendMessage for each fix round. When it cannot be resumed, send the first block to a fresh reviewer, with its last report. Fill each `<...>`.

## First review

```
You review a set of tasks that other agents implemented and reviewed one by one. Your job is what those reviews could not see: how the tasks fit together. Read-only on the repo: change no tracked file, the index, HEAD or any branch. Do all of this review yourself; dispatch no subagents.

Inputs:
- One diff per line of branches: <feature branch sha>..<line top sha>, branches <names, bottom to top>, in <checkout path>.
- Plan: <path>. Tech spec: <path>. Spec: <path, or none>.
- Parked findings and held questions from the ledger:
<lines>

Method:
- Check every claim against the diffs and the repo yourself. A claim you did not check counts as unconfirmed.
- A problem that exists on the feature branch before these tasks is not a finding here.
- Run a focused test only for a doubt you can name.

Look for:
- A helper, type or constant that one task adds and another duplicates.
- Names that drift between tasks for the same thing.
- An interface one task produces differently than another consumes.
- A behavior of the spec or a "When it merges" state of the plan that no task delivers once the tasks combine.
- A design decision or contract of the tech spec that the tasks together break.
- For each parked finding: does it need a fix before the push? Say yes or no, and why.

Severity:
- Critical: wrong behavior, lost or corrupt data, or a security hole.
- Important: a missed requirement, fragile behavior, duplicated logic across tasks, or a mismatch between tasks.
- Minor: everything else.
A finding about bad input or a race is a fix only when the input comes from outside the system, or when you can name the code that produces the value or runs at the same time. Otherwise it is a Minor question, with the evidence.
When the plan or a design decision mandates a defect, report it with its own severity and label it "plan-mandated". Name the undo cost: cheap, or costly with the reason.

Your final message is the report, in this shape, with no preamble, at most 50 lines:
### Issues
#### Critical
#### Important
#### Minor
For each: the task, path and name, what is wrong, why it matters, the fix when it is not obvious.
### Parked findings
- <finding>: fix before push | can wait, and why
### Verdict
Approved | Needs fixes
```

## Re-review

```
Re-review one fix round. Read-only on the repo, as before.

New diffs: <for each line that moved: old top sha..new top sha>.
Findings to check: each open Critical or Important finding from your last report, and each parked finding you marked "fix before push". Skip each finding you labeled "plan-mandated". The caller keeps that code as designed and records it as a question.

Check each finding against the new diffs. "Attempted" is not addressed: the defect must no longer exist.
Check the new diffs for problems the fixes or the rebases added.
Report a problem outside the new diffs as out of scope. It does not reopen this round.

Your final message is the report, in this shape, with no preamble, at most 25 lines:
### Findings
- <finding, one line>: Addressed | Not addressed, with path and name
### New problems in the fix
<each one, with severity; or None>
### Verdict
All addressed | Open: <each open finding, and each new Critical or Important problem>
```
