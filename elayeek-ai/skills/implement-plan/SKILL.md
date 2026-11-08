---
name: implement-plan
description: Use when the user asks to implement, run or resume a plan, a `plan.md` of PR-sized tasks. Sends each task to an implementer agent that runs `elayeek-ai:implement`, in parallel where the plan allows, then reviews the tasks together.
---

# Implement a plan

This skill runs every task of a plan through `elayeek-ai:implement`, one implementer agent per task. It hands over a set of local branches. Each task becomes one branch and later one pull request (PR). The plan says what each task delivers and what blocks it. `implement` owns how one task is built and reviewed.

Terms:
- The **feature folder** holds `plan.md`, `tech-spec.md` and `open-items.md`.
- The **feature branch** is the branch the task PRs target. It later merges into the default branch as one PR.
- A **line** is the path of task branches from the feature branch to a task that no other task builds on. Tasks may share a parent, so a branch can sit in several lines. Step 4 gates and step 5 review each line.
- A **worktree** is the task's own checkout, one per task, kept for the whole run. The main checkout stays on the branch it was on, and the run never switches it.
- A **gate** is the repo's typecheck, lint or test command, judged by its exit code.

Your work ends at local commits. Pushing, PRs and merges belong to the skill that finishes a branch.

## Questions and stops

Ask every question in one message, as numbered questions, each with the answer you recommend. Then end the turn.

Stop and ask when:
- the main checkout has uncommitted changes at the start. Ask the user to commit them, move them, or say to include them;
- an implementer returns `BLOCKED`;
- a gate stays red after five fix rounds;
- a finding of the final review stays open after five rounds and changes behavior;
- a final-review finding names the code of two tasks that sit on different lines;
- a plan-mandated finding is Critical or costly to undo;
- the blockers of a task are already built on separate branches.

When an implementer returns `BLOCKED`, start no new task. Let the running tasks finish, then ask all open questions in one round. On the answer, resume the blocked implementer through SendMessage with it.

When the user stops the run before all tasks are done, start no new task. Let the running tasks report. Then hand over the complete tasks (step 6) and call `elayeek-ai:finish-work` with them. Write `Stopped: by the user (complete: T-a, T-b)` to the ledger, and say "stopped early" in the call. Unfinished tasks stay in the ledger for a later run. A task that reports `BLOCKED` stays unfinished, and its questions go into the hand-over. Say in the hand-over that the final review did not run on the complete tasks.

## Ledger

`<feature folder>/run/ledger.md` is the record of the run. Append each line when its event happens. After a compaction, trust the ledger and `git log` over your memory.

```
# Run ledger: <feature folder path>
Gates: typecheck `<command>`; lint `<command>`; tests `<command>` (or `not configured` for each)
Resources: <each one, confirmed by the user>
Feature branch: <name> from <default branch> at <sha7>
Fork: T-<n> kept separate (children T-<a>, T-<b>)
Stopped: by the user (complete: T-a, T-b)
Edge: T-<n> after T-<m> (serialized: both block T-<k>)
T-<n>: started (branch <name>; parent <branch>; worktree <path>; base <sha7>; implementer <model>, <effort>, <agent id>[; <effort reason>])
T-<n>: report <status> (<base sha7>..<head sha7>)
T-<n>: moved (parent <branch>; <base sha7>..<head sha7>)
T-<n>: fix request (<gate log | final round k>)
T-<n>: decided: <choice, as the report states it>
T-<n>: departure: <as the report states it>
T-<n>: question <mark>: <question>
T-<n>: answered: <question>: <answer>
T-<n>: parked: <finding, as the reviewer wrote it>
T-<n>: complete
Gates: <line top sha7>: <gate> exit <code>, ...
Final: reviewer opus, <effort>, <agent id>
Final: fix round <k>/5 (<count> open: <one line each>)
Final: complete (review clean | <count> parked)
Hand-over: <task branch>: parent <branch>, base <sha7>, top <sha7>, line <T-n ... T-m>, <gate> exit <code>, ...
```

Read each task's top from its latest `report` or `moved` line. Write the `fix request` line when you send a fix request. Write `parent <branch>` on each `started` line (step 3), each `moved` line (steps 3 to 5) and each `Hand-over` line (step 6).

To resume, read the ledger when its first line names this feature folder. Skip every setup line it holds and every task with a `complete` line. Then resume as follows:
- A task with a `started` line and no `report`: read `git log <base>..<branch>`. Resume its implementer through SendMessage, or dispatch a fresh one on the same branch. Before a fresh dispatch, check that no earlier implementer of that task still runs. If one runs, resume it through SendMessage.
- A task whose last line is `report BLOCKED`: ask the user its open questions. With an `answered` line, resume the implementer with the answer.
- Steps 4 to 6: resume after the last ledger line of the step (`Gates` lines, `Final` lines, `Hand-over` lines).
- Every task `complete` and no `Gates` line: check each sibling's worktree with `git -C <worktree> status` for a rebase in progress. Abort each one first with `git -C <worktree> rebase --abort`. Then redo the straightening of step 3 for each sibling and its children whose latest base is not the top it should sit on.
- A `fix request` line with no later `moved` line: resume that implementer through SendMessage and wait for its reply. Send no second request.

## 1. Set up

1. Read `plan.md`: the task table, each task's blocked-by edges, and the tasks to run. Run the whole plan unless the user names tasks. Refuse a named task whose blocker has no `complete` line, and name the blocker.
2. Read the ledger, if it exists, and resume as the Ledger section says.
3. Check the main checkout for uncommitted changes. With any, stop as Questions and stops says.
4. Find the gate commands the repo configures, in its package scripts, Makefile, CI config or agent instructions. Name each resource outside the checkout that a gate needs, such as a test database.
5. Serialize the blockers as step 2 says, and write nothing yet. List each fork in the serialized order: a task with two or more tasks built directly on it.
6. Ask the user one round: the feature branch, the confirmation of each resource from item 4, and for each fork whether to straighten it into one line or keep it separate. Recommend "straighten into one line". Suggest a new feature branch from the default branch, named by the repo's convention, or use one the user names.
7. Create the feature branch locally when it is new. Write the setup lines and the `Edge` lines of step 2 to the ledger. Add `<feature folder>/run/` and `**/.claude/worktrees/` to `.git/info/exclude` when missing, so the ledger, the logs and the worktrees never show as uncommitted changes. When nothing is installed in the main checkout, install the dependencies there.

Done when: the ledger names the gates, the confirmed resources, the feature branch and each fork kept separate.

## 2. Order the tasks

Setup item 5 already serialized the blockers by the rules below and wrote the `Edge` lines. At this step, only the readiness rule runs. A task is **ready** when every task that blocks it has a `complete` line.

A branch has one parent, so serialize the blockers:
1. Drop each edge already implied through other edges.
2. For a task with two or more blockers, chain those blockers in a topological order of the plan, every task after its blockers, with the table order for ties. Each blocker after the first is blocked by the one before it. Repeat until every task has at most one blocker.
3. Write each added edge to the ledger with the setup lines (setup item 7). The task then branches from the last of its blockers.

When the blockers of a task are already built on separate branches, as on resume or when the user names tasks, stop as Questions and stops says.

Done when: every task to run has one parent: the feature branch, or one blocker's branch.

## 3. Run the tasks

Run up to three implementer agents at once, each in the background. Start each ready task as a slot frees up:

1. **Branch**: create the task's branch from its parent's top, the feature branch or its blocker's branch: `git branch <name> <parent top>`. Name it by the repo's convention.
2. **Worktree**: run `git worktree add <path> <name>`. Put the path under `<repo>/.claude/worktrees/<feature>-T-<n>`, or where the repo's own worktree convention puts it. Install the dependencies with the command that keeps the lockfile exact, for example `npm ci`. Check that `git -C <worktree> status` is clean before dispatch. The task keeps this worktree for the whole run.
3. **Dispatch**: write the `started` line, then dispatch a `general-purpose` agent on `sonnet`, effort `medium`, one level up or down with the reason. Give it this prompt, filled in:

```
Call the Skill tool with `elayeek-ai:implement`. A skill called you.
Task: <absolute path of plan.md in the main checkout>, heading "<## T-n: title>".
Tech spec: <absolute path in the main checkout>. Spec: <absolute path in the main checkout, or none>.
Work in: <worktree path>, on branch <name>. Base: <sha>.
Gates: <each gate with its command, or not configured>.
Resources confirmed by the user: <each one, or none needed>.
Decisions and departures of earlier tasks that this task consumes:
<each one from the ledger, or None>
```

4. **Report**: when the report arrives, copy its status, decisions, departures, questions and parked findings to the ledger, one line each, as the report states them. Write `complete` for `DONE` and `DONE_WITH_CONCERNS`. Handle `BLOCKED` as the Questions and stops section says.

Run every gate and every rebase inside the task's own worktree (`git -C <worktree>`). Name the worktree and the branch in every message that resumes an implementer.

After every task has a `complete` line, straighten each fork the user did not keep separate into one line. Take the siblings in the plan's topological order, with the table order for ties. Rebase each sibling onto the top of the line through the sibling before it. That top is the last branch built on it, not that sibling's own branch. Run `git -C <sibling worktree> rebase --onto <that top> <old top below> <branch>`. `<old top below>` is the sibling's base from its latest `report` or `moved` line. Rebase the children of each moved sibling by the rule in step 5 item 5. Write a `moved` line for each branch that moves. A conflict follows the rebase-conflict rule in step 5 item 5. A fork kept separate stays as built.

Done when: every task to run has a `complete` line, and each fork not kept separate is one line.

## 4. Check the gates

Run every gate yourself on the top commit of each line, inside its worktree. Write each output to `<feature folder>/run/<line top sha7>-<gate>.log`, append the exit code as the last line, and read the summary and the failures from it. Write the `Gates` line to the ledger.

When a gate is red, send a fix request through SendMessage to the implementer of the task whose code fails. The request holds the log path, the worktree and the branch. The implementer fixes and commits on its branch. When that implementer is gone, dispatch a fresh one as in step 3, with the same fix request. Then write the `moved` line, rebase the branches above it by the rule in step 5 item 5, and run every gate again. Repeat up to five rounds.

Done when: every gate exits 0 on the top of every line.

## 5. Review the tasks together

Do this step only when the run has two or more tasks.

1. Call the Skill tool with `elayeek-ai:review-code`. Give it the whole plan as the intent, and say that `implement` reviewed each task: the plan, tech spec and spec paths, one diff per line (`<feature branch sha>..<line top sha>`, its branches bottom to top, the checkout path), and the parked findings and held questions from the ledger. Raise the tier to `opus`. Write the reviewer's line to the ledger. Wait for its report.
2. Send each Critical or Important finding, and each parked finding the reviewer marks "fix before push", as a fix request to the implementer of the task whose code it names. The request holds the findings, the worktree and the branch. When that implementer is gone, dispatch a fresh one as step 4 says.
3. A finding that names the code of two tasks goes to the higher task in the line, the one built on the other. When the two tasks sit on different lines, stop as Questions and stops says.
4. A plan-mandated finding follows the same rule as in `implement`. The code stays as the design says. Record it at once as a question and leave it out of the re-review. It is a stop when it is Critical or costly to undo. A fix after merge would need a migration, a data repair, or a change across other tasks or services. Otherwise it is a `blocks: none` question for the hand-over.
5. Each fix lands on that task's branch. Before the re-review, rebase every child of each fixed branch, bottom-up, inside each child's worktree: `git -C <child worktree> rebase --onto <new top below> <old top below> <branch>`. `<old top below>` is the child's base, from its latest `report` or `moved` line. These branches are local, so a rebase rewrites nothing anyone else holds. When a child rebase conflicts, run `git -C <child worktree> rebase --abort`. Then send the child's implementer a fix request to rebase onto the new parent top and resolve the conflict. When it cannot, it replies `BLOCKED` and the run stops for the user. Write a `moved` line for each fixed or rebased branch. Run every gate on each line top that moved.
6. Call `elayeek-ai:review-code` for the re-review, with each line that moved (`<old top sha>..<new top sha>`) and the fixes made. Write the `fix round` line. Repeat up to five rounds.
7. Park each Minor finding in the ledger, and list it in the hand-over.

Done when: no Critical or Important finding is open, or each one left is a stop or parked, and every gate exits 0 on every line top.

## 6. Hand over

1. Ask the user every held `blocks: none` question, in one round. For each one, the user resolves it, folds it into a later task, or leaves it open. Add the ones left open to `open-items.md`. Name the document, the task and the mark (`blocks: T-<n>` or `blocks: none`), as `implement` writes them.
2. Append the `Hand-over` section to the ledger: one entry per task branch, with its parent, base, top, line, and gates with exit codes.
3. Send the user one message. It holds the verdict and each line, with its branches in order, top commit, and gates with their exit codes. It also holds the decisions to confirm and the departures, in plain words. Last, it holds the parked findings, the "fix before push" findings still open after five rounds, and the ledger path.
4. Call the Skill tool with `elayeek-ai:finish-work`, passing the ledger path.

Done when: the user has the hand-over, and every held question has an answer or sits in `open-items.md`.
