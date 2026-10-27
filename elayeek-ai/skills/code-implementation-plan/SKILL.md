---
name: code-implementation-plan
description: Use when the user asks for an implementation plan, or to revise one, from a spec, other documents, or the conversation. Writes a plan folder with a `plan.md` and one file per task, and gets the user's approval of its design decisions.
---

# Code implementation plan

A plan turns settled design into work an implementer agent can run task by task. It is a folder of these files:

- `plan.md` is the plan. The user approves it.
- `tasks/T-<n>.md` holds one task each: the instructions to the implementer. The implementer of a task receives its task file and only the design decisions that file lists, never the whole plan. So each task file stands alone with those decisions.
- `open-items.md` holds only questions still open and possible follow-ups, for the user to check after the plan. It is never sent to an implementer.

A **design decision** is a choice another task depends on, or one that costs more than its own task to undo: a cross-module type, a new layer or abstraction, a schema or persisted format, a new dependency, a public signature change. Every other choice belongs to the implementer.

A **stack** is a run of tasks that becomes one pull request (PR).

## 1. Find the place

Write the plan where this feature's plan already is. With no plan yet, use the place the user's instructions name. With neither, ask the user.

## 2. Read the sources and the code

Read the source documents: the spec, other documents the user names, and the conversation. When the feature spans repos, also read the plans or code the sibling repos already have for this feature. A name or shape they already have is a source fact, not a decision proposed here. Then scan the repo: the files the work changes, the patterns to follow, the test setup, and the code at risk. Check that every path and name you will cite exists.

Sort each open question you find:

- **No source document settles the behavior**: stop, and name it to the user. It belongs in the source documents, not in the plan.
- **A source document and other code or documents disagree**: follow the source documents, and list the choice as a design decision: what disagrees with the source, on what, and that the plan follows the source. In step 6, show it with the decisions proposed here: the alternative is the other side, and the cost if wrong is the disagreement. When the disagreement is significant, also record it in `open-items.md` as an open question. It is significant when the other side is code that runs, so following the source makes two parts of the system behave differently, or when undoing the choice costs more than its own task. Check the running code before you decide.
- **It is a design decision**: settle it yourself with a recommended choice. It goes in the plan's list for the user to approve.
- **Anything else**: leave it to the implementer. Write nothing about it.

A possible follow-up that is worth noting, but not worth handling in the plan or asking about now, goes to `open-items.md`, never into the plan. So does any question the user labels open or as a follow-up.

Done when: every behavior question is settled by a source document or named to the user, and every design decision has a recommended choice.

## 3. Split the work into tasks and stacks

A task is the smallest unit with its own test cycle and its own commit. Fold setup, configuration and documentation into the task whose code needs them.

"Depends on" names only real dependencies: a task depends on another when it consumes what that task produces. Tasks with no dependency between them can be built in parallel. The stacks still form one linear chain of PRs, in an order that respects every dependency. Fully separate work, such as two unrelated modules in one monorepo, may form independent chains.

Give each stack a scope and a boundary contract: what is true at the top of the stack.

A wide refactor is one mechanical change that breaks many call sites at once, such as renaming a shared symbol. Split it expand–contract: add the new form beside the old one, migrate the callers in batches that each stay green, then remove the old form once no caller remains.

Done when: every task has a stack, every stack has a scope and a boundary contract, every dependency is real, and the chain order respects every dependency.

## 4. Write the files

On revision, rename each file you will rewrite with a date suffix before you rewrite it, and keep it. Rewrite only the files the change touches.

Fill the templates below. A section with nothing in it says "None."

Code, pseudocode included, goes in a plan only as public signatures, wire contracts, DDL, UX copy, error formats, dependency pins, and types another task depends on. A type another task depends on is a design decision: its shape goes in `plan.md`, under that decision. Describe every other helper, internal type, regex, constant list or body by its behavior, plus the repo precedent it reuses, as a path and a name, or `none found`.

Each Approach names what it handles: the case, the input, the error. Each acceptance case covers a branch that the task's own code owns. A task whose code is only declarations has no unit test; its Verification is the typecheck, with no red.

Each test pins a behavior: given an input or a state, the output, the effect or the error a caller sees. A test that passes against a different correct implementation is right; a test that breaks when the code is restructured without a change in behavior is wrong.

Verification uses the test level the source documents ask for. A behavior that crosses a boundary, such as the database, a webhook or another service, is tested through that boundary. Mock only what the repo cannot run, and name the reason in the task.

Verification is red, then green. Red names the assertion that fails before the code exists, and why it fails. It fails on an assertion, not on a compile or import error. Green is the same command, exiting 0.

Each task lists the design decisions it consumes, and each other decision relevant to it with the reason.

Done when: every task in the task list has its file, every placeholder is filled, and every path and name exists in the repo or is created by an earlier task.

`plan.md`:

```
# Plan: <the feature, in plain words>

## Goal
<what the feature does, and the source documents it comes from>

## Design decisions
### DD-<n>: <name>
<the decision>. From: <source document, or "proposed here">.
Proposed here only: alternative <...>; cost if wrong <...>.
<verbatim shape, only for a type another task depends on>

## Stacks
### S-<n>: <concern>
Scope: <...>
Boundary contract: <what is true at the top of this stack>
Depends on: <stacks, or None>

## Task list
| ID | Title | Stack | Depends on | File |

## Risks
<risk, and the task that guards it>

## Out of scope
<item>
```

`tasks/T-<n>.md`:

```
# T-<n>: <title>

## Design decisions
DD-<n> (consumes: <what>). DD-<n> (relevant: <why>).

## Files
- Create: <path>
- Modify: <path> (<name or short description>)
- Test: <path>

## Interfaces consumed
<from the repo: path and name or short description. From an earlier task: the design decision that defines it.>

## Contract
<what it produces that other tasks or outside callers see; public signatures, wire contracts, DDL, UX copy, error formats and dependency pins verbatim>

## Approach
<design-level prose>

## Acceptance
- Given <state>, when <action>, then <result>.

## Verification
<which test proves which acceptance case>
Red: `<command>`. Expected: <which assertion fails, and why>.
Green: the same command. Expected: exit 0.

## Commit message
<message>
```

## 5. Have a fresh agent review the plan

Dispatch an agent that did not write the plan. Give it the plan folder, the source documents, and these checks:

- Every path and name exists in the repo, or an earlier task creates it.
- Code appears only in the kinds step 4 allows.
- Every type that crosses tasks is a design decision.
- Every task lists the decisions it consumes and the ones relevant to it.
- Every "depends on" is a real dependency.
- Every task has a run command, an expected output and a commit message.
- Every test is at the level the source documents ask for, every behavior that crosses a boundary is tested through it, and every mock names its reason.
- The plan adds no behavior the source documents do not ask for.

Fix each finding. For a finding you keep, tell the user in step 6 why it stays.

Done when: every finding is fixed or kept for the user.

## 6. Get the user's approval

Show the user the path of the plan and the count of tasks and stacks. Then list each decision proposed here as one sentence stating the choice, the rejected alternative, and the cost if wrong. Then list the decisions taken from the source documents by name only, on one line, for the user to check against what they decided. Name each decision by what it does, in plain words, as the user would say it. Add its ID in parentheses only as a pointer to the exact entry, never in its place. When `open-items.md` holds anything, name it in the message. For a revision, show only the decisions that changed. Wait for the user's answer. Only an answer about these decisions counts as approval.

When the user rejects a decision or asks about one, discuss that decision. Then update every file it touches, and show the changed decisions again.

Ask the user before you commit the plan.

Done when: the user approves every design decision.
