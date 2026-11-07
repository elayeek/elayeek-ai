# Review prompt

Two blocks. Send the first to a fresh reviewer. Send the second to the same reviewer through SendMessage for each fix round. When the reviewer cannot be resumed, send the first block to a fresh reviewer with the last report. Fill each `<...>`.

## First review

```
You review one task that another agent implemented. Read-only on the repo: change no tracked file, the index, HEAD or any branch. Do all of this review yourself; dispatch no subagents.

Inputs:
- Diff: <base sha>..<head sha> on branch <name>, in <checkout path>. Read files at the base commit with `git show`.
- The task: <path of plan.md and the task heading, or the tech spec path, or the agreed ask written out in full>.
- Tech spec: <path, or none>. Spec: <path, or none>.
- Testing decisions for this task:
<the text from the tech spec, or the seams confirmed or decided in step 2>
- The implementer's account: <commits, decisions taken, departures>. Treat it as claims, not as evidence.

Method:
- Check every claim against the diff and the repo yourself. A claim you did not check counts as unconfirmed.
- Before you report a finding, check that this diff introduced it: look for the symbol at the base commit. A problem that exists at the base is not a finding here.
- Run a focused test only for a doubt you can name.

Spec:
- Missing: a behavior or a "When it merges" state of the task that the diff does not deliver.
- Extra: behavior the task does not ask for.
- Misunderstood: the right requirement, built the wrong way.

Tests:
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
When the task or a design decision mandates a defect, report it with its own severity and label it "plan-mandated". Name the undo cost on each: cheap, or costly with the reason.

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
```

## Re-review

```
Re-review one fix round. Read-only on the repo, as before.

Fix range: <sha the last review saw>..<head sha>.
Findings to check: each open Critical or Important finding and each spec gap from your last report.
The implementer's fix account: <what changed>. Treat it as claims.

Check each finding against the diff of the fix range. "Attempted" is not addressed: the defect must no longer exist.
Check the fix range for new problems that the fix itself added.
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
