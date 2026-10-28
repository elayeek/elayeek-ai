# Implementer prompt

Fill each `<...>` and send the block as the implementer's prompt. Use the `general-purpose` agent type.

```
You implement one task of an implementation plan: <T-n: title>.

Inputs:
- Task file: <path>. Read it first. It holds your requirements, with the exact values to use verbatim.
- Design decisions this task lists:
<the text of each one, from plan.md>
- Deviations from earlier tasks that touch what you consume:
<each one, or None>
- Work in: <checkout path>, on branch <name>. Edit only files under this path, and the report file.
- Gates: <each gate the ledger lists, with its command>. Run only these gates; a run of one of them scoped to some files counts. Never write or run a check that is not listed. List each other Verification step of the task file under Concerns, and leave it unrun.
- Report file: <run folder>/reports/<T-n>.md

Before you write:
- Read every file the task changes, in full. For a file over about 2,000 lines, read the symbols you touch, their neighbors, and the file's imports.

While you write:
- Make the smallest complete change.
- Reuse a repo helper or an installed package export before you write new code.
- Build each test fixture from the error or response a dependency really gives, not from what the code reads.

Tests:
- Each test pins a behavior: given an input or a state, the output, the effect or the error a caller sees. A test that passes against a different correct implementation is right; a test that breaks when the code is restructured without a change in behavior is wrong.
- Run red, then green. Write the test, run it, and see it fail on the assertion the task's Verification names, not on a compile or import error. Then write the code and run the same command to exit 0. When the task's Verification names no red, skip red and run the listed gates to exit 0.
- When the code's behavior looks wrong, stop and report it. Never encode wrong behavior as a passing test.

Decide every choice the task leaves open, except these. For each one, stop and return NEEDS_CONTEXT with the question:
- A design decision: a choice another task depends on, or one that costs more than this task to undo. Examples: a cross-module type, a new layer, a schema, a dependency, a public signature change.
- The code does not match the task file in a way that changes behavior.
- An input or error rule that neither the task file nor the code settles.

Before you commit, run the typecheck and the lint when they are listed, and the tests of every module you changed. Commit with the task's commit message. Stage only the files you changed, by name. Never push. Do all the work yourself; dispatch no subagents.

Write the full report to the report file:
- What you implemented.
- Red: the command and the failing assertion. Green: the command and the summary line.
- Files changed.
- New declarations: each new top-level declaration or file, with its repo precedent as a path and a name, or "none found".
- Decisions taken: each choice the task left open, and what you chose.
- Deviations: each place your code differs from the task file, such as a rename, a changed signature or a moved file.
- Concerns.

When you are sent a review report, fix each Critical and Important finding and each spec gap in it that is yours. Run the tests that cover the changed code. Commit the fix, and stage only the files you changed, by name. Append a fix report to the report file: what changed, the command, and its output. Then reply with the same short report as below.

Your final message is the report, at most 15 lines:
- Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- Commits: short SHA and subject.
- Tests: one line, for example "14 passed".
- Concerns, if any.
- The report file path.
For NEEDS_CONTEXT or BLOCKED, put the question or the blocker in the final message itself.
```
