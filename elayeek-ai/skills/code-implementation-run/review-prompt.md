# Review prompt

Fill each `<...>` and send the block as the reviewer's prompt. Use the `general-purpose` agent type. The scope is one of:
- **task**: one task's diff, before a later task builds on it.
- **stack**: one stack's diff, commit by commit. It covers the tasks no one reviewed alone, and how the tasks fit together.
- **final**: the whole branch across every stack.

```
You review the <scope> diff of an implementation plan run. Read-only on the repo: change no tracked file, the index, HEAD or any branch. Read files at the base commit with `git show`. Write only the report file.

Inputs:
- Base commit and head commit: <sha>..<sha>; for a final review, one pair per chain.
- Task files: <paths>. They are the requirements.
- Design decisions these tasks list:
<the text of each one, from plan.md>
- Implementer reports: <paths>. Treat them as claims, not as evidence.
- Report file: <run folder>/reviews/<T-n, S-n or final>-r0-report.md
- For a stack or final review: the stack scope and boundary contract from plan.md:
<text>
- The stacks before and after this one, and what each owns:
<one line each>
- For a final review: the parked findings from the ledger:
<lines>

Method:
- Before you report a finding, check that this diff introduced it: search for the symbol at the base commit. A problem that exists at the base is not a finding here.
- Code that a later stack owns is not missing from this one.
- The orchestrator runs the gates when it closes a stack; until then, the implementer report is a claim. Run a focused test only for a doubt you can name.
- Do all of this review yourself; dispatch no subagents.

Spec:
- Missing: a requirement of a task file that the diff does not do.
- Extra: behavior no task file asks for.
- Misunderstood: the right requirement, built the wrong way.

Quality:
- Reuse and duplication: for each new function, helper, type, constant or file, name what in the repo or an installed package already does the job, as a path and a name, or say none exists. A match, or two bodies that share most of their code, is Important.
- Tests: each one pins a behavior a caller sees. A behavior that crosses a boundary, such as the database, a webhook or another service, is tested through that boundary. Each mock names why the repo cannot run the real thing. Each fixture matches what the dependency really returns. The report shows red, then green.
- For a stack or final review: a helper one task adds and another duplicates, names that drift between tasks, and an interface one task produces differently than another consumes.
- For a final review: say for each parked finding whether it must be fixed before the push.

Severity:
- Critical: wrong behavior, lost or corrupt data, or a security hole.
- Important: a missed requirement, fragile behavior, a test that asserts nothing, duplicated logic, or a reuse match.
- Minor: everything else.
A finding about bad input or a race is a fix only when the input comes from outside the system, or when you can name the code that produces the value or runs at the same time. Otherwise it is a Minor question, with the evidence.
When a task file or design decision mandates a defect, report it as Important and label it "plan-mandated".

Write the full report to the report file, in this shape, with no preamble:
### Spec
Compliant | Issues: <each one, with path and name>
### Issues
#### Critical
#### Important
#### Minor
For each: path and name, what is wrong, why it matters, the fix when it is not obvious.
### Verdict
Approved | Needs fixes

Your final message is at most 15 lines: the verdict, the count of findings for each severity, and the report file path.
```
