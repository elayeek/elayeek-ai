---
name: receiving-review
description: Use when a pull request has review comments to handle, from people or bots, when the user objects to code in chat, or when a reviewer agent returns findings. Covers collecting the comments, judging each one, fixing, replying, and resolving threads.
---

# Receiving review

This skill covers review comments on one pull request (PR), from people or bots, the user's objections to code in chat, and findings from a reviewer agent. It sets how to collect the comments, judge them, fix them, check the fixes, and reply.

The user's comments are decisions. Comments from bots, reviewer agents and other reviewers are claims: check each one against the code before you act on it.

## 1. Collect the comments

Skip this step for objections in chat and for a reviewer agent's findings; they are already in front of you.

Collect every open comment on the PR.

Inline threads: use the GraphQL `reviewThreads` field, paginated, because REST gives no resolved state for threads. Review bodies and top-level comments: paginated REST.

- Handle every thread where `isResolved` is false, at any age, with all of its comments.
- A comment that contains `Written by Claude Code` is a reply on the user's behalf. A thread that ends with one waits on the reviewer; skip it unless it is still relevant.
- Skip an outdated thread when the current code no longer has the problem.
- Handle each review body and top-level comment that no later reply on the user's behalf quotes. Skip one when the current code already does what it asks.

Done when: you have a list of every comment to handle, and a list of every skipped one with its reason.

## 2. Judge every comment, then ask once

Read each comment against the code. Read every comment before you fix any of them, because comments can depend on each other.

Put these comments to the user, all in one message, before you fix anything. In the same message, list every comment that step 1 skipped, with its reason, so the user can take one back.

- **Unclear**: you cannot say what change the comment wants.
- **No target**: the comment rejects code but names no fix. Show each concrete option you see, with its code shape. Add "keep as is" when that is a real option.
- **Conflict**: the comment conflicts with an earlier resolved thread or with something the user said. Quote both, and ask which wins.
- **Large change from a small comment**: a short comment from the user implies a large change. State the size of the change and wait for the user to discuss it.
- **Hypothetical**: the comment is about a case that might happen. It becomes a fix only when you can show a real path to the case: code that makes the value, input from outside the system, or a path that runs at the same time. With no real path, give the user the evidence for and against.
- **Wrong**: the comment is incorrect for this code. Give the evidence.
- **Do it properly**: the comment asks to build something out properly. Grep for real callers first.

Done when: every comment is either clear to fix or answered by the user.

## 3. Fix

Fix each comment that is clear to fix.

A comment is a **pattern** when it names a pattern ("everywhere", "all of these", "again"), or when it is the second comment that objects to the same kind of code. Sweep a pattern: search the whole branch for every instance, and list every hit to the user, with each hit whose fix changes a type or a name marked as a decision, in one message. Fix the other hits in one commit, and fix the decision hits after the user answers. For a minor kind, the sweep is one grep that you run yourself. A comment that is not a pattern gets a fix at its line only.

When a comment repeats an ask, do exactly what it asks, or ask one question. A repeat is an objection that an earlier reply said was fixed, or a request the user makes again after you offered an alternative. For the first kind, check again whether the earlier fix removed the problem.

## 4. Run the checks

Run the repo's own typecheck, lint, and tests, as its CLAUDE.md or its package scripts name them. Judge each one by its exit code.

Done when: every check exits 0.

## 5. Have a fresh agent check the fix diffs

Dispatch an agent that did not write the fixes. Give it the fix diffs and every objection, on the PR, in chat or from a reviewer agent, each stated as a pattern to look for. It lists every instance of an objected pattern that the diffs add. Fix each instance it lists, then run step 4 again.

## 6. Commit and push

Steps 6 and 7 apply only to comments from a PR. For objections in chat and a reviewer agent's findings, stop after step 5 and report the fixes to the user.

Commit the fixes. Stop, and ask the user for their word to push. Then push, as a command of its own: no commit, reply, or other command in the same call.

Done when: the commit is on the remote.

## 7. Update the PR body and reply

Write every reply with the Write tool, one file per reply:

- A **Fixed** reply quotes the problem as the comment states it, names the line that removes it, and adds a sweep line when a sweep ran: the search, its range, the count of other hits, and the commit that fixed them.
- A reply that disagrees gives the evidence from step 2 or the user's answer.
- Every reply ends with the line `🤖 Written by Claude Code on behalf of <login>`, where `<login>` is the account that `gh` runs as. The PR body and the commits do not get this line.

Update the PR body when a fix makes part of it wrong, or adds something that the body must document. Save the current body to a file first. Write the new body with the Write tool. Change only the parts that need it, and keep the rest word for word.

Stop, and ask the user for their word to post. In that message, list each thread as "reply only" or "reply and resolve", and show the changed parts of the PR body. A thread gets "reply and resolve" only with a Fixed reply; a reply that disagrees leaves the thread open for the reviewer.

Post each item as a command of its own. Use `-F` (uppercase), which reads the file; `-f` posts the literal text `@<path>`.

1. The PR body, first.
2. Each inline reply, inside its thread, not as a top-level comment.
3. Each reply to a review body or top-level comment, as a new top-level comment that quotes it.
4. Each "reply and resolve" thread, after its reply: run the GraphQL `resolveReviewThread` mutation with the thread `id`, and ask for `isResolved` in the result.

After each post, read the `body` that GitHub returns and check that it matches the file.

Done when: every reply and the PR body are posted and match their files, and every "reply and resolve" thread shows `isResolved: true`.
