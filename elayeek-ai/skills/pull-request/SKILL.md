---
name: pull-request
description: Use when you push a branch, open a pull request (PR), or update one with new commits, a new title or a new body, whether the user asks directly or another skill calls. Checks the gates, writes the title and body, and waits for the user's yes before each push.
---

# Pull request

This skill takes one branch to an open PR on the remote, and keeps that PR current after later pushes. Every push and every PR change waits for the user's yes.

Terms:
- The **base** is the branch the PR targets.
- A **gate** is the repo's typecheck, lint or test command, judged by its exit code.

## Approvals and stops

Run nothing outward without the user's yes. One yes covers the push, the PR and its review comment. The approval message lists them, and each side effect on the remote, such as CI runs, review requests from CODEOWNERS, or bots that comment. Mark each side effect "checked" with its source, or "unchecked".

Two things count as that yes:
- A message the user wrote to ask for this push and PR, such as "push it and open a PR to <base>". List the side effects in the report instead.
- A yes the caller got from the user for this branch's push and PR, which the caller quotes. A choice in a caller's round, such as an exit option, is not a yes for the push.

Ask again when a step goes beyond that yes: a base branch push, a force push, or a PR already open for the branch.

A push that rewrites a remote branch uses `--force-with-lease`. Ask for it as its own yes, and say in the message that it rewrites the remote branch.

Stop and ask the user when a gate is red, or when the remote rejects a push.

## 1. Gather

1. Take the branch from the caller, with its base, the ticket key, the gate log, the feature folder, the "decided, please confirm" decisions, the held questions and the user's yes. With no caller, take the current branch. Take its base from the user's message; else ask, and suggest the branch at `git merge-base`.
2. Find the ticket key, unless the caller passed it, and the main module: from the tech spec, the plan or the branch name. A branch that changes several modules equally has no module tag. With no ticket key, ask for it in the approval message, or as its own question when a yes already covers the push.
3. Check for an open PR: `gh pr list --head <branch> --state open`. A branch with an open PR goes to step 4, not step 3.

Done when: the branch has a base, a ticket key, a module or none, and a known PR state.

## 2. Check the gates

Read the caller's gate log for the branch's top commit when it exists and the run was not interrupted. Otherwise run every gate the repo configures, in the branch's worktree or checkout. Write each output to a log file outside the repo, append the exit code as its last line, and read the summary and the failures.

Done when: every gate exits 0 on the top commit, or a red gate is a stop.

## 3. Open the PR

1. Write the PR's title, body and review comment, as `${CLAUDE_SKILL_DIR}/pr-body.md` says, to files outside the repo. Read each file back in full.
2. When the base is not on the remote, ask for its push, then run `git push -u origin <base>`.
3. Run `git fetch origin`, a read-only call. When the branch is already on the remote, check `git merge-base --is-ancestor <remote>/<branch> <branch>`. When that fails, push with `git push --force-with-lease -u origin <branch>`, on its own yes.
4. With the yes, run, in order:
   - `git push -u origin <branch>`, unless item 3 pushed it.
   - `gh pr create --base <base> --head <branch> --title "<title>" --body-file <file> --assignee @me`.
   - The review comment, as `pr-body.md` says: `gh api repos/<owner>/<repo>/issues/<number>/comments -F body=@<file>`.
5. Read back the body and the comment with `gh pr view <number> --json body,comments`. Check that each one is complete and its length is right.

Done when: the PR is open with the right base, title, body, assignee and comment.

## 4. Update the open PR

1. Compare what the PR does now with its title and body: `gh pr view <number> --json title,body`, against the branch's commits since the remote branch.
2. When the meaning changed, or the user asks for a new title or body, save the current body to a file. Write the new title and body as `pr-body.md` says, with Write, and read the body back in full. A change that leaves the PR's meaning as it was keeps the title and body.
3. Ask for the yes. One yes covers the title and body edit and its push. A push that rewrites the remote branch has its own yes, as above.
4. Edit before the push: `gh pr edit <number> --title "<title>" --body-file <file>`. Read the body back with `gh pr view <number> --json body`.
5. Push the branch with `git push`, or `--force-with-lease` on its own yes.

Done when: the branch is pushed, and the PR's title and body describe what it does now.

## 5. Report

Send the user one message: the PR link, new or updated; the gates with their exit codes; the read-back result; the side effects, when the user's message was the yes; and the decisions to confirm and the held questions. When a caller called this skill, return the same facts and the PR number to it instead.

Done when: the user or the caller has the report.
