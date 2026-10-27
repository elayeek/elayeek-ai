---
name: handoff
description: Use when the user asks to hand off, wrap up, or compact a session. Writes a handoff file that a fresh session, or this session after compaction, continues from, and gives the opening prompt for it.
---

# Handoff

A handoff is one file that lets the next session continue the work with no access to this chat. The next session is a new session, or this one after `/compact`. The user calls this skill before `/compact`; the opening prompt is the same in both cases.

The file is **stand-alone**: every reference resolves from the file alone. Write `PR #N` or `issue #N`, never a bare `#N`. Say each thing in words; an ID or label minted in this chat (an option number, a finding code, "item 3") gets its content beside it. Each handoff is a full rewrite: it restates everything still in force, so the reader never needs an older handoff.

## 1. Find the place and park the old file

Write the handoff where the previous handoff for this work is. With no previous handoff, use the place the user's instructions name. With neither, ask the user.

Rename the previous handoff with a suffix for its date or stage, and keep it. A handoff is never staged or committed.

## 2. Write the handoff

Fill the template below. Keep every section; a section with nothing in it says "None.", so the reader can tell it is empty and not forgotten.

- **Unfinished** lists the current task and every gate not yet run. A gate is a check with a pass or fail exit code: the repo's typecheck, lint, tests, or build. A gate entry names its command and the commit it ran on. A log worth keeping is copied next to the handoff; the session's scratchpad is deleted with the session, so the file never points into it. Unfinished leaves out what git shows.
- **Decided by the user** holds only what the user explicitly chose, with their words. A positive reaction without a commitment, a default you took, or a choice of unclear origin goes under **Proposed, not decided**, with whose it is and the cost if it is wrong.
- **Read this first** holds the rules the user stated for this work, and every rule they had to repeat.
- **Opening prompt** is one line, written in the file: "Read <absolute path of the handoff> and start with its first action."

Done when: you reread the file as a reader who never saw this chat, and every reference resolves, every placeholder is filled, and the first action needs no question.

```
# Handoff: <the work, in plain words>
Written <date>. Repo <absolute path>, branch <name>. Session <this session's ID>.

## Goal
<the goal of the work in the user's words, and where it stands in the larger plan when there is one>

## Read this first: how the next session must work
<rules the user stated or had to repeat, each with the user's words>

## First action
<one action>. Skill: <name, or None>. Before the user answers the questions below, do only <...>.

## Questions waiting for the user
1. <question> Recommended: <answer>. Changes: <what>.

## Unfinished
- <task stopped partway, and how far it got>
- Not checked: <what, and why>.
- Gate failed or not run: <command> on <sha>, <result>.

## Decisions in force
- Decided by the user: <decision> ("<user's words>").
- Proposed, not decided: <item> (whose, cost if wrong).
- Dropped: <item> ("<user's words>").

## Held and deferred
- <item> ("<user's words>"). Only the user lifts these.

## Branches and worktrees without their exit
<path, branch, exit owed>

## Records
<durable paths>. Older handoffs, history only: <parked file names>.

## Opening prompt
<the prompt text described in the Opening prompt bullet of step 2>
```

## 3. Finish the current task and run the gates

Finish the current task. Run the gates. As each one finishes, update the handoff: a finished task or a passing gate leaves **Unfinished**; a failing gate stays, with its command, commit and result. Keep the First action and the Opening prompt in line with what is still unfinished. Update the work's ledger the same way, when the work has one.

The file is current after every update, so a session that closes partway leaves the unfinished items named.

Done when: the current task is finished or recorded as stopped, and every gate is passed or recorded in **Unfinished**.

## 4. Give the opening prompt

Give the same text as the file's Opening prompt section in the chat reply, ready to copy.
