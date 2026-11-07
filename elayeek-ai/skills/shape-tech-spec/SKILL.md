---
name: shape-tech-spec
description: Use when the user asks for a tech spec, or to revise one. Turns a settled spec into design decisions, contracts and testing decisions for one repo.
---

# Shape a tech spec

A tech spec is the technical design of one story in one repo. It sits between the spec, which says what the feature does, and the plan, which breaks the work into tasks. It holds design decisions, contracts and testing decisions. The task breakdown belongs to the plan.

A **design decision** is a choice that other parts of the work depend on, or one that costs more than its own change to undo: a cross-module type, a new layer or abstraction, a schema or persisted format, a new dependency, a public signature change.

A **foundation decision** is a design decision that other design decisions hang on: extend a module or add one, the data model or schema, sync or async, a new external dependency, a change to a public API.

A **contract** is a shape that other code relies on, written verbatim: a public signature, a wire contract, DDL, an error format, UX copy, a dependency pin, a type that crosses a module boundary or that more than one part of the change uses.

A **behavior** is one expected behavior from the spec. The tech spec **cites** behaviors and leaves their text in the spec, so each fact has one home. Cite by number when the source numbers them (`B-4`). Otherwise cite by a short, distinct name and where it sits: "the overdue badge (Jira description)".

## Asking in rounds

Whenever you ask the user something, ask all of it in one message, then end the turn. Ask each round as numbered questions. Each question states the choice you recommend, the alternative, and the cost if wrong, worded so that "yes" accepts the recommendation. Name each decision by what it does, in plain words, as the user would say it. Add its ID in parentheses only as a pointer.

## 1. Find the place

Write `tech-spec.md` where this feature's tech spec or plan already is. Source documents elsewhere do not set the place. With none, use the place the user's instructions name. With neither, use `<repo>/.elayeek-ai/<feature>/`, and when `<repo>/.elayeek-ai/.gitignore` is missing, write it with the single line `*`.

## 2. Read the sources and the repo

Read the sources: the spec document, a ticket, other documents the user names, and the conversation. Then scan the repo: the modules the work changes, the patterns to copy, the test setup, and the code at risk. Check that every path and name you will cite exists.

Finding facts is your job; decisions are the user's. Look up every fact the repo, and the repos it calls or shares data with, can tell you, and ask the user only for what you cannot look up. Find every other runtime that reads or writes the persisted or shared state this story changes (a table, column, queue, file or cache), such as another repo, a job or a dashboard, and how each one is deployed.

Sort what you find:
- **A behavior no source settles**: stop and name the gap to the user. It belongs in the spec.
- **A source and other code or documents disagree**: follow the source. List the disagreement as a design decision, with the other side as the alternative. When the other side is code that runs, also record it in `open-items.md` as an open question.
- **A design decision**: settle it with a recommended choice, and note whether it is a foundation decision for step 3.
- **Anything else**: leave it to the implementer. Write nothing about it.

`open-items.md` sits beside `tech-spec.md`. It is the one home for the open questions and follow-ups of every document in the folder. Each item names the document it belongs to, and whether it blocks that document's approval. It never goes to an implementer. A follow-up worth noting but not worth handling now goes there too.

Done when: every behavior the work needs is settled by a source or named to the user, every runtime that reads or writes the changed state is named with how it is deployed, and every design decision has a recommended choice.

## 3. Confirm the foundation decisions

Before you write, stop and ask the foundation decisions in one round. When the user rejects one, rework the decisions that hang on it before you write. With no foundation decisions, say so in one line and go on.

Done when: the user has answered every foundation decision.

## 4. Write the tech spec

On a revision, first copy `tech-spec.md` to `tech-spec.<YYYY-MM-DD>.md` and keep the copy. Keep every ID stable: never renumber or reuse one. A removed decision or contract keeps its heading, and its body becomes "Removed: <reason>". Rewrite only the sections the change touches.

Fill the template below. A section with nothing in it says "None."

- **Modules affected**: each module as a path plus a name, never a line number. This is the map of the change for the plan and the reader.
- **Architecture**: write it when the story adds a module or service, changes a module boundary, adds a dependency between modules, or spans modules. Its first line names which of these applies. Otherwise the section says "None."
- **Design decisions**: each with its source, or "proposed here", plus the alternative and the cost if wrong. A type that crosses a module boundary, or that more than one part of the change uses, is a design decision, and its shape goes in a contract.
- **Contracts**: the only code in the tech spec. Everything else is described in words.
- **Testing decisions**: the test level the sources ask for. A behavior that crosses a boundary, such as the database, a webhook or another service, is tested through that boundary. Mock only what the repo cannot run, and name the reason. Point to existing tests to copy as a path plus a name, or write `none found`.
- **Release**: the deploy order across this repo and every runtime that reads or writes the state the story changes, the flag order, the data that must exist before a deploy, the rollback order, and, for each time that old and new code run side by side (a staged or rolling deploy, a rollback, another runtime that deploys on its own schedule), which version handles each new input and write. A story with nothing to order says "None."

Done when: every section is filled or says "None.", and every path and name exists in the repo, or in the other repo it names.

~~~markdown
# Tech spec: <the story, in plain words>

## Source
<the spec: a path, a ticket key, or "conversation, <date>">

## Modules affected
- <path> (<name>): <what changes>

## Architecture
<which trigger applies; then the modules, their boundaries and dependencies>

## Design decisions
### DD-<n>: <name>
<the decision>. Serves: <cited behaviors>. From: <source, or "proposed here">.
Alternative: <...>. Cost if wrong: <...>.

## Contracts
### C-<n>: <name>
Relied on by: <modules or decisions>.
```<language>
<verbatim shape>
```

## Testing decisions
- <behaviors or area>: through <boundary>; mocks: <what and why, or none>; copy: <path (name), or none found>.

## Release
<deploy order, flag order, data gates before a deploy, rollback order, which version handles each new input and write while old and new code run side by side>

## Out of scope
- <item>

## Risks
- <risk>: <what guards it>
~~~

## 5. Have a fresh agent review it

Dispatch an agent that did not write the tech spec. Give it `${CLAUDE_SKILL_DIR}/review-prompt.md` as its instructions, the repo path, the path of `tech-spec.md`, and each source. For a conversation source, write the behaviors into the prompt. Fix each finding. For a finding you keep, tell the user in step 6 why it stays.

Done when: every finding is fixed or kept for the user.

## 6. Get the user's approval

Stop and send one message:
- The path of `tech-spec.md`.
- The foundation decisions the user already confirmed, by name on one line. A foundation decision that changed since goes in the round below instead.
- Each other decision proposed here, and each decision that settles a disagreement between a source and other code or documents, as a question in the round form.
- Each testing decision that leaves a behavior or a script without an automated test, as a question in the round form.
- The other decisions taken from the sources, by name on one line, for the user to check against what they decided.
- Whether the architecture section is written, and why. The user may add or remove it.
- The review findings you kept, each with its reason.
- The items in `open-items.md` that belong to the tech spec. While an item that blocks its approval is open, the tech spec cannot be approved.

On a revision, show only the decisions that changed. When the user rejects a decision or asks about one, discuss that decision. Then update every section it touches, and show the changed decisions again. Only an answer about these decisions counts as approval.

Done when: the user approves every design decision, and no item that blocks the tech spec is open.

## 7. After approval

When shape-plan called this skill, do item 1, then return to that run at its step 2 instead of items 2 to 4.

1. Run `git check-ignore -q <folder>`. When the folder is ignored, there is no commit. When git does not ignore it, ask the user before you commit, and commit only the files this skill wrote or changed, by path.
2. When `plan.md` exists beside the tech spec, list the tasks that cite an ID this revision changed, removed, split or merged, and ask: "Revise the plan now?"
3. When no plan exists, ask: "Shape the plan now?"
4. On yes to either, call the Skill tool with `elayeek-ai:shape-plan`.

Done when: the user has answered.
