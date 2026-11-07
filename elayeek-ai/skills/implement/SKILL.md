---
name: implement
description: Use when the user or another skill asks to implement, build or fix one task: a plan task, a tech spec, or an ask agreed in the conversation. Builds it test-first on a branch, with a fresh review, to local commits.
---

# Implement one task

This skill builds one **task** test-first, gets it reviewed by a fresh agent, and reports. A task is one pull request's worth of work: a task section of `plan.md`, a whole tech spec, or an ask agreed in the conversation. The design is settled before this skill runs. Build what the task says, and turn every gap into a question.

Terms:
- A **design decision** is a choice that other parts of the work depend on, or one that costs more than its own change to undo: a cross-module type, a new layer, a schema, a dependency, a public signature change.
- A **gate** is the repo's typecheck, lint or test command, judged by its exit code.
- A **seam** is the public boundary a test observes behavior at. The `elayeek-ai:tdd` skill owns the rules for seams and tests.

Your work ends at local commits on the task's branch. Pushing, pull requests and merges belong to the skill that finishes a branch.

## Questions and stops

The spec, the tech spec and `plan.md` stay as they are; only their own `shape-` skills change them. Everything this skill finds goes into one of three kinds:
- **A choice local to this task**, such as a helper's name or a file's place: decide it, and list it in the report as "decided, please confirm".
- **A gap that blocks**: mark it "blocks this task", or "blocks T-<n>" when a later task consumes the answer. Stop at once. A gap blocks when it is:
  - a design decision the documents do not settle;
  - an input or error rule nobody settles;
  - a document and the code that disagree in a way that changes behavior;
  - existing code that behaves in a way that looks wrong. Do not write a test that locks the wrong behavior in.
- **A gap that does not block**: mark it "blocks: none" and hold it for the report.

Also stop at once when a gate stays red after five fix rounds, or when a gate needs a resource outside the checkout, such as a test database, that is missing or down after it was confirmed.

Also stop at once when the checkout has uncommitted changes at the start. Ask the user to commit them, move them, or say to include them.

Every stop goes to step 5: write the report with status `BLOCKED` and the question in it, whoever called you.

## Where you run

When the user or the calling skill says where the task runs, in this session or in an agent, do that. Otherwise decide. When you hand the task to an agent, the agent runs this skill as "a skill called you". You pass its questions and report on to the user. When the agent stops with `BLOCKED` and the user answers, resume it through SendMessage with the answer.

## 1. Read the task

A fix request: see Fix request.

Read the task and everything it points to:
- **A plan task**: its section of `plan.md`, each design decision and contract it consumes from the tech spec, the tech spec's testing decisions, and each spec behavior it cites.
- **A tech spec**: the whole tech spec, and the spec behaviors it cites.
- **An agreed ask**: the conversation that settled it.

Then read every file the task touches, in full. For a file over about 2,000 lines, read the symbols you change, their neighbors and the file's imports.

Done when: you can state what the task delivers, the observable state that shows it works (its "When it merges", or the agreed outcome), and the seams it is tested at.

## 2. Set up

1. **Clean checkout**: run the uncommitted-changes stop from Questions and stops.
2. **Branch**: work on the branch you are given, or the one checked out. On the repo's default branch, first create a branch named by the repo's convention.
3. **Base**: the base is the commit the caller gives, or else `git merge-base HEAD <default branch>`.
4. **Gates**: use the gate commands the caller gives. Otherwise find the ones the repo configures, in its package scripts, Makefile, CI config or agent instructions. Run only configured gates; a repo without a test command has no test gate.
5. **Resources**: when a gate needs a resource outside the checkout, use the caller's confirmation that it is ready. With none: when a skill called you, stop with status `BLOCKED` (resource not confirmed). When the user called you, ask the user once and end the turn.
6. **Resume**: when the branch already holds commits for this task, read `git log <base>..HEAD` and continue from where they end.
7. **Restate**: write one short message: what you build and the seams you test at. When there are no testing decisions and the user called you, ask the user to confirm the seams and end the turn. Otherwise continue without waiting.

Done when: you are on the task's branch, every gate is known or recorded as not configured, every resource a gate needs is confirmed, and the seams are agreed, confirmed, or recorded as decided.

## 3. Build test-first

Call the Skill tool with `elayeek-ai:tdd` and follow it for every slice. Make the smallest complete change, and reuse a repo helper or an installed package export before you write new code.

Note each decision ("decided, please confirm") and each departure when you make it, so the reviewer gets them in step 4.

After each green slice:
1. Run the test files that cover the code you changed.
2. Commit with the repo's message convention. Stage only the files you changed, by name.

When all slices are green, run every gate on the whole repo. Write each gate's output to a log file outside the repo, append the exit code as its last line, and read the summary and the failures from it. When a gate is red, fix, commit, and run every gate again, up to five rounds.

Done when: every behavior and the observable state from step 1 hold, each tested at its seam, and every gate exits 0 on the branch's last commit.

## 4. Review

1. Read `${CLAUDE_SKILL_DIR}/review-prompt.md`, fill in the first block with the diff `<base>..HEAD`, and dispatch a fresh `general-purpose` agent with it. Use `opus` when the task changes stored or shared data, concurrency, auth or PHI, or turns on algorithm correctness; otherwise `sonnet`. Effort `medium`, one level up or down with the reason.
2. The dispatch runs in the background. Wait for the reviewer's report before you go on.
3. Fix each Critical and Important finding and each spec gap. Run the tests that cover the changed code and the gates, then commit the fix as in step 3.
4. Resume the same reviewer through SendMessage with the re-review block of `review-prompt.md`, and wait for its report. If the reviewer cannot be resumed, dispatch a fresh reviewer with the first block and pass it the last report.
5. Repeat items 3 and 4 up to five rounds. Minor findings are parked: list them in the report, and leave them unfixed.

After five rounds, a Critical or Important finding that is still open is a stop when it changes behavior or blocks a later task. Park every other one, with the reason.

A plan-mandated finding stays as the design says. When the reviewer reports one, record it at once as a question and leave it out of the re-review, so it never enters the fix loop. It is a stop when it is Critical or costly to undo: put it to the user for a decision. A fix after this task merges would need a migration, a data repair, or a change across other tasks or services. Such a finding is costly to undo. Every other plan-mandated finding is a gap under the usual marks.

Done when: the reviewer reports no open Critical or Important finding, or every one left is a stop, a question, or parked.

## 5. Report

Write the report:
- Status: `DONE`, `DONE_WITH_CONCERNS` or `BLOCKED`. `DONE_WITH_CONCERNS` means parked or open findings, or held "blocks: none" questions.
- Branch, and the commit range `<base>..<head>`.
- Each gate with its exit code, or "not configured". For tests, the summary line.
- Decided, please confirm: each choice local to this task and each seam you chose, and what you chose.
- Departures: each place the code differs from the task, such as a rename, a changed signature or a moved file.
- Review: the reviewer's last verdict, and every open or parked finding, copied as the reviewer wrote them.
- Questions: each gap, with its mark.

When a skill called you, your final message is the report. The calling skill writes it to its ledger. Implement keeps no ledger.

When the user called you, add each question to `open-items.md` when the feature folder has one. The feature folder is the folder that holds `plan.md` or `tech-spec.md`. Name the document and the task. Add the mark: `blocks: T-<n>` (for a question that blocks this task or T-<n>), `blocks: the tech spec` when there is no plan, or `blocks: none`. Then send the user the report as one message, in plain words, with an ID only in parentheses as a pointer. End the report with the question "Finish the branch now?". On yes, call the Skill tool with `elayeek-ai:finish-branch`, with this branch, its parent and its worktree. The parent is the branch the task branch was created from (step 2, branch item), else the branch `git merge-base` suggests. Otherwise end the turn.

Done when: the caller or the user has the report.

## Fix request

When the prompt holds a fix request, read the task (step 1), then do only this section. A calling skill sends findings or a gate log for a task this skill already built. Fix them on the same branch. Run the tests that cover the changed code and every gate, then commit. Questions and stops apply; a stop replies `BLOCKED` with the question. Reply with the new head commit and each gate's exit code, and list any decisions and departures made in the fix. Run no new review in this path.
