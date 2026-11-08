---
name: shape-plan
description: Use when the user asks for an implementation plan, or to revise one. Breaks an approved tech spec into PR-sized tasks for one repo.
---

# Shape a plan

A plan breaks an approved tech spec into **tasks**. A task is one pull request (PR): a change a reviewer can read in one sitting and one implementer agent can finish within one context. The plan holds the tasks, their order, and what each one delivers. Design belongs to the tech spec, and behavior belongs to the spec.

A **design decision** is a choice that other parts of the work depend on, or one that costs more than its own change to undo: a cross-module type, a new layer or abstraction, a schema or persisted format, a new dependency, a public signature change. The tech spec settles every design decision. The plan consumes them.

A **contract** is a shape that other code relies on, written verbatim in the tech spec: a public signature, a wire contract, DDL, an error format, a shared type.

A **behavior** is one expected behavior from the spec. The plan **cites** behaviors and leaves their text in the spec. Cite by number when the source numbers them (`B-4`). Otherwise cite by a short, distinct name: "the overdue badge".

## Asking in rounds

Whenever you ask the user something, ask all of it in one message, then end the turn. Ask each round as numbered questions. Each question states the choice you recommend, the alternative, and the cost if wrong, worded so that "yes" accepts the recommendation. Name each task by what it does, in plain words, as the user would say it. Add its ID in parentheses only as a pointer.

## 1. Find the place

Write `plan.md` where `tech-spec.md` is.

## 2. Read the tech spec, the spec and the repo

Read the tech spec and the spec it cites. Finding facts is your job; decisions are the user's. Open every repo path the tech spec cites yourself, and check each name in it. A path or name that does not exist is a gap in the tech spec: handle it as in step 3. With no tech spec, stop and ask: "Shape the tech spec first?" On yes, call the Skill tool with `elayeek-ai:shape-tech-spec`.

A source can point to content that only a connected tool can read, such as an MCP server for tickets, designs or documents. When you need that content and the tool is not connected (call it to check; a tool search that finds nothing proves nothing), ask the user in one message: connect it, paste the content, or go on without it. List each item you go on without in `open-items.md`.

`open-items.md` sits beside `plan.md`. It is the one home for the open questions and follow-ups of every document in the folder. Each item names the document it belongs to, and whether it blocks that document's approval. It never goes to an implementer.

Done when: the tech spec exists, and every path and name it cites exists in the repo, or in the other repo it names.

## 3. Cut the tasks

- **Vertical slices**: each task cuts a narrow path through every layer it needs, and can be checked on its own.
- **Prefactoring first**: a change that reshapes existing code to make the work easier is its own task, ahead of the tasks it serves.
- **Wide refactor**: one mechanical change that breaks many call sites at once, such as renaming a shared symbol, runs as expand, migrate, contract. Add the new form beside the old one, migrate the callers in batches that each stay green, then remove the old form once no caller remains.
- **Size**: one PR that a reviewer can read and one implementer can finish within one context. A task too big for that becomes two tasks.
- **Order**: a task is blocked by another when it consumes what that task produces, or when both touch the same file. Write a shared-file edge with its reason: `T-2 (shares src/billing/invoice.ts)`. A task that the tech spec's Release section orders after another task is blocked by it too, written with its reason: `T-3 (release order)`. A release gate outside this repo goes in the task's Notes. Tasks with no edge between them can run in parallel. The plan records order, not branches.

When a task needs a design decision or a contract the tech spec lacks, stop, name the gap to the user, and ask: "Revise the tech spec now?" On yes, call the Skill tool with `elayeek-ai:shape-tech-spec`. The plan never settles a design decision itself.

Done when: every behavior in the spec is delivered by some task or listed as out of scope in the tech spec, every task fits the size, every edge is a real dependency, a shared file or a release order, and every output a task consumes comes from a task it is blocked by, directly or through others.

## 4. Write the plan

On a revision, first copy `plan.md` to `plan.<YYYY-MM-DD>.md` and keep the copy. Keep every task ID stable: never renumber or reuse one. A removed task keeps its heading, and its body becomes "Removed: <reason>". Rewrite only the tasks the change touches, and their rows in the table.

Fill the template below. A section with nothing in it says "None."

- **Tasks table**: the only home of the blocked-by edges.
- **Delivers**: the behaviors the task delivers, its own technical cases, or both. A task that only builds what others need, such as infrastructure, delivers no behavior and states its own cases. Write a technical case as given, when, then.
- **Interfaces consumed**: pointers only. From the tech spec: the ID plus the name, for example `C-2 (invoice event payload)`. From the repo: a path plus a name.
- **Files touched**: each as a path plus a name, never a line number, so tasks that share a file can be spotted and ordered.
- **When it merges**: the observable state that shows the task works on its own, not a restatement of Delivers.
- **Notes**: only a trap the implementer would not see from the code, such as "the cache is shared with the billing job". Otherwise "None."

Done when: every task in the table has its section, every placeholder is filled, and every pointer and every Files touched path resolves to an ID in the tech spec, a path in the repo, or a file that a task it is blocked by creates.

~~~markdown
# Plan: <the story, in plain words>

## Source
Tech spec: <path>. Spec: <path, ticket key, or "conversation, <date>">.

## Tasks
| ID | Title | Blocked by |
|---|---|---|

## T-<n>: <title>
<what the task delivers, in one or two sentences>

### Delivers
- <cited behavior>
- Given <state>, when <action>, then <result>.

### Design decisions consumed
- DD-<n> (<name>)

### Interfaces consumed
- <ID (name), or path (name)>

### Files touched
- <path> (<name>): <what changes>

### When it merges
<what is true once this PR is in>

### Notes
<a trap, or None>
~~~

## 5. Have a fresh agent review it

Dispatch an agent that did not write the plan, with `model: opus` and `effort: medium`. Give it `${CLAUDE_SKILL_DIR}/review-prompt.md` as its instructions, the repo path, the paths of `plan.md` and `tech-spec.md`, and the spec. For a conversation source, write the behaviors into the prompt. Fix each finding. For a finding you keep, tell the user in step 6 why it stays.

Done when: every finding is fixed or kept for the user.

## 6. Get the user's approval

Stop and send one message:
- The path of `plan.md`, and the count of tasks.
- The tasks in order, each as one line: what it delivers, and what blocks it.
- A round on the breakdown: each task you sized on a judgment call, with the merge or split you weighed and what each side costs, and whether each blocked-by edge is real. With no such task, ask nothing about granularity.
- The review findings you kept, each with its reason.
- The items in `open-items.md` that belong to the plan. While an item that blocks its approval is open, the plan cannot be approved.

On a revision, show only the tasks that changed. When the user asks for a change, make it in every task it touches, and show the changed tasks again. Only an answer about the breakdown counts as approval.

Done when: the user approves the breakdown, and no item that blocks the plan is open.

## 7. After approval

1. Run `git check-ignore -q <folder>`. When the folder is ignored, there is no commit. When git does not ignore it, ask the user before you commit, and commit only the files this skill wrote or changed, by path.
2. Ask: "Implement the plan now?" On yes, call the Skill tool with `elayeek-ai:implement-plan`.

Done when: the user has answered.

## Revision after a tech spec change

When the tech spec changed, removed, split or merged an ID that the plan cites, fix every pointer to it and every task the change affects, under step 4's revision rules, then continue from step 5. When a task may already be built, ask the user. Keep a built task, and report it as needing a fix.
