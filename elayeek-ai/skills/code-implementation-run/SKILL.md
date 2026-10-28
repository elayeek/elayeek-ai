---
name: code-implementation-run
description: Use when the user asks to run or resume an implementation plan, a plan folder with a `plan.md` and one file per task. Runs the plan's tasks to local commits; never pushes.
---

# Code implementation run

This skill runs an approved plan: each task through a fresh implementer agent, with gates and reviews, committed on one local branch per stack. It ends with a hand-over in the ledger for the step that pushes and opens the pull requests (PRs).

Terms:
- The **plan folder** holds `plan.md`, `open-items.md` and `tasks/T-<n>.md`. Its default place is `<repo>/.elayeek-ai/<plan-name>/`.
- The **run folder** is `<repo>/.elayeek-ai/<plan-name>/run/`, a folder git ignores. With the plan in its default place, it sits inside the plan folder.
- A **stack** is a run of tasks that becomes one PR. A **chain** is a line of stacks, each built on the one before it. Most plans have one chain.
- A **design decision** is a choice another task depends on, or one that costs more than its own task to undo: a cross-module type, a new layer or abstraction, a schema or persisted format, a new dependency, a public signature change.
- A **gate** is the repo's typecheck, lint or test command, judged by its exit code.

## Stops

The run decides everything the plan leaves open, and records each choice in the ledger as a decision taken. Stop and ask the user only at these points, then end the turn:
- A new design decision comes up that the plan does not settle.
- The plan and the code disagree in a way that changes behavior.
- A review finding conflicts with a design decision in the plan.
- A gate stays red after five fix rounds, or a Critical or Important finding stays open after five fix rounds and changes behavior.
- A gate fails because a resource outside the checkout is missing or down.
- The main checkout has uncommitted changes at the start.
- At setup, to choose the release base and to confirm that the resources the gates need are ready.

Never push, open a PR or merge, by this skill or by any other path.

## Ledger

`<run folder>/ledger.md` is the record of the run. Append each line when its event happens. After a compaction, trust the ledger and `git log` over your memory.

```
# Run ledger: <plan folder path>
Gates: typecheck `<command>`; lint `<command>`; tests `<command>` (or `none configured` for each)
Integration: <name> from <release base> at <sha7>
S-1: branch <name> from <integration branch> at <sha7>
T-1: started (base <sha7>; implementer <model>, <effort>, <agent id>[; <effort reason>])
T-1: reviewer <model>, <effort>, <agent id>[; <effort reason>]
T-1: decision: <the choice the task left open, and what was chosen>
T-1: deviation: <what differs from the task file>
T-1: fix round 1/5 (fixer <model>, <effort>, <agent id>; <count> open: <one line each>)
T-1: parked: <finding> (<severity>; <why it stays>)
T-1: complete (<sha7>..<sha7>, review: own | with stack)
S-1: reviewer <model>, <effort>, <agent id>[; <effort reason>]
S-1: complete (gates exit 0 at <sha7>; review clean | <count> parked)
Final: reviewer <model>, <effort>, <agent id>
Final: fix round 1/5 (fixer <model>, <effort>, <agent id>; <count> open: <one line each>)
Final: complete (review clean | <count> parked)
```

To resume, read the ledger when it exists and its first line names this plan folder. Skip each setup item whose line the ledger already holds. Skip every task and every stack with a `complete` line. When every task of a stack is complete but the stack is not, resume at step 3 for that stack. Otherwise start at the first task without a `complete` line. A task whose last line is a fix round resumes at its next round. For a task with only a `started` line, read `git log <base>..HEAD` and its report file before you dispatch it again. When every stack is complete, resume at step 4 after its last `Final` line, or at step 5 when `Final: complete` is there.

## Dispatch rules

Dispatch on `sonnet` by default, and on `opus` for architecture, algorithm correctness, data integrity, concurrency, and the final review. Set `effort` on every dispatch: `medium` by default, one level up or down for a task that is harder or easier, with the reason at the end of that agent's ledger line. Use `xhigh` or `max` only when the user asks.

Give each agent its prompt file filled in, and nothing of the session's history. A brief carries only workspace actions and the gates listed in the ledger. Continue an agent through SendMessage; a fresh agent rebuilds the whole context.

Each reviewer writes its full report to the file its prompt names, and returns a short message. Read the report file only when the message shows a finding.

## 1. Set up

1. Read `plan.md` once. Note the stacks, the task list with its "Depends on" column, and the design decisions. All stacks form one chain, in plan order, unless `plan.md` names separate chains.
2. Create the run folder with `reports/` and `reviews/`. When `<repo>/.elayeek-ai/.gitignore` is missing, write it with the single line `*`.
3. Read the ledger, if it exists, and resume as the Ledger section says.
4. In the main checkout, install the dependencies when none are installed. Find the gate commands the repo configures, and write them to the ledger, or `none configured` for each one it lacks. Never write or run a check the repo does not configure. Name each resource outside the checkout that a gate needs, such as a test database.
5. Ask the user for the release base, and suggest the repo's default branch. In the same question, ask the user to confirm that each resource from item 4 is ready. Create an integration branch from the release base, named for the ticket or the plan, with one empty commit, so the step that pushes can open a draft feature PR.
6. Create the first stack's branch from the integration branch. Name the stack branches by the repo's convention for branch names.
7. Run the first chain in the main checkout. For each other chain, create its first stack's branch from the integration branch, and add a worktree on it under `<repo>/.claude/worktrees/<plan-name>-<chain>`. Add `**/.claude/worktrees/` to `.git/info/exclude` when it is missing. Install the dependencies in each new worktree before its first gate.

Done when: the ledger names the gates, the integration branch and the first branch of each chain, each one is checked out, and the user confirmed each resource the gates need.

## 2. Run each task

Run the tasks of a chain one at a time, in the order of the task list. Chains run in parallel, each in its own checkout.

1. Write the `started` line with the current commit as the task's base.
2. Read `${CLAUDE_SKILL_DIR}/implementer-prompt.md` and fill it in. Give it the task file path, the text of each design decision the task file lists, and the deviations from earlier tasks that touch what this task consumes.
3. Handle the status the implementer returns. Answer `NEEDS_CONTEXT` and `BLOCKED` yourself unless the question meets a stop.
4. Copy the report's "Decisions taken" and "Deviations" into the ledger, one line each.
5. When a later task depends on this task, review it now: read `${CLAUDE_SKILL_DIR}/review-prompt.md` with the scope "task". Write the reviewer's line to the ledger. The next task waits for this review. Other tasks are reviewed with their stack in step 3.
6. Run the fix loop below on the findings.
7. Write the `complete` line.

Done when: every task of the stack has a `complete` line.

### Fix loop

A Critical or Important finding, or a gap against the task file, enters the loop. A Minor finding goes to the ledger as `parked` for the final review, and never enters the loop.

One round:
1. Send the path of the last review report to the implementer whose code each finding names, and say which findings are its own. Resume that agent. When it is gone, or a finding stays open after its third round, fill `${CLAUDE_SKILL_DIR}/implementer-prompt.md` for a fresh implementer one tier higher, with the report path. From opus, raise the effort one level instead.
2. Send the reviewer a re-review, with `${CLAUDE_SKILL_DIR}/re-review-prompt.md` filled in.
3. Write the `fix round` line.

The loop ends when no Critical or Important finding is open. After five rounds, look at each open finding. A finding that meets a stop goes to the user. Park every other one in the ledger with its reason.

## 3. Close each stack

When the last task of a stack is complete:
1. Run each gate yourself on the stack's top commit. Write the output to `<run folder>/<stack>-<gate>.log`, and append the exit code as the last line. When a gate is red, send the log path to the implementer of the last task. It fixes and commits, and you run every gate again. Repeat up to five rounds. A gate still red after five rounds is a stop.
2. Read `${CLAUDE_SKILL_DIR}/review-prompt.md` with the scope "stack", and dispatch it. Write the reviewer's line to the ledger.
3. Run the fix loop on the findings. Run every gate again after a fix lands.
4. Write the stack's `complete` line. Create the next stack's branch from this stack's top commit.

Done when: every gate exits 0 on the stack's top commit, and every finding is fixed or parked.

## 4. Review the whole branch

Do this step only when the plan has two or more stacks.

1. Dispatch `${CLAUDE_SKILL_DIR}/review-prompt.md` with the scope "final", on `opus`. Give it one base and head pair per chain, from its first stack's base to its last stack's top. Give it the parked lines from the ledger, so it can say which ones must be fixed. Write the reviewer's line to the ledger.
2. Run the fix loop on its findings. The first fixer is one fresh implementer on `opus`, with `${CLAUDE_SKILL_DIR}/implementer-prompt.md` filled in for every task the findings name, and the branch of each stack it commits on. In each round, do item 3 before the re-review.
3. Before you commit this round's fixes, take each stack's old top from its latest `complete` line. Commit each fix on the branch of the stack whose code it changes. Then, bottom-up, move each later stack branch onto the new top of the branch below it: `git rebase --onto <new top below> <old top below> <branch>`. After every rebase of the round, run the gates of each stack whose top moved, and write its new `complete` line. These branches are local, so a rebase rewrites nothing that anyone else has. Then send the re-review, with one fix range per chain, from the top the last review saw to the new top.
4. When the fix loop ends, write the `Final: complete` line.

Done when: the fix loop has ended, every finding left is parked, and every gate exits 0 on the top of each stack.

## 5. Hand over

1. Remove each worktree that a chain used. The branches stay in the repo.
2. Append a `## Hand-over` section to the ledger. Open it with the line `Integration branch: <name>, from <release base>.` Then write one entry per stack, in chain order:
   ```
   ### S-<n>: <concern>
   Branch: <name>. Base: <branch below it, or the integration branch>. Top: <sha7>.
   Scope: <from plan.md>
   Boundary contract: <from plan.md>
   Gates at top: each gate with its exit code, or `none configured` (tests: <count> passed)
   Parked: <findings, or None>
   ```
3. Send the user one message, then wait: the verdict; each gate with its exit code; the decisions taken and the deviations in plain words, as the user would say it, with an ID only in parentheses as a pointer; the parked findings with severity and reason; the branches; and the ledger path.

Done when: the hand-over is in the ledger, and the user has the message.
