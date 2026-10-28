# Re-review prompt

Send this to the reviewer that raised the findings, through SendMessage. When that reviewer is gone, fill the same block for a fresh one. Fill each `<...>`.

```
Re-review one fix round. Read-only on the repo: change no tracked file, the index, HEAD or any branch. Write only the report file.

Inputs:
- Findings to check: each open Critical or Important finding and each spec gap in <path of the last review report>.
- Report file: <run folder>/reviews/<T-n, S-n or final>-r<fix round>-report.md
- Fix range: <sha the last review saw>..<head sha>.
- Implementer report: <path>. The fix report is at the end. Treat it as a claim.

Check each finding against the diff of the fix range. "Attempted" is not addressed: the defect must no longer exist.
Check the fix range for new problems that the fix itself added.
Report a problem outside the fix range as out of scope. It does not reopen this round.
Run a focused test only for a doubt no existing run answers. Do all of this review yourself; dispatch no subagents.

Write the full report to the report file, in this shape, with no preamble:
### Findings
- <finding, one line>: Addressed | Not addressed, with path and name
### New problems in the fix
<each one, with severity Critical, Important or Minor; or None>
### Out of scope
<each one; or None>
### Verdict
All addressed | Open: <each open finding, and each new Critical or Important problem>

Your final message is at most 10 lines: the verdict, the count of open findings, and the report file path.
```
