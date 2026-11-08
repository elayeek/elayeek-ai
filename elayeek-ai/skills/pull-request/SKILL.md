---
name: pull-request
description: Use when you push a branch, open a pull request (PR), or update one with new commits, a new title or a new body, whether the user asks directly or another skill calls. Checks the gates, writes the title and body, and waits for the user's yes before each push.
---

# Pull request

This skill takes one line of branches to open PRs on the remote, and keeps those PRs current after later pushes. Every push and every PR change waits for the user's yes.

Terms:
- Each branch has a **base**: the branch its PR targets. In a line, a branch's base is the branch below it.
- A **line** is a chain of branches, each built on the one before. One branch alone is a line. Each line becomes one stack of PRs.
- A **gate** is the repo's typecheck, lint or test command, judged by its exit code.

## Approvals and stops

Run nothing outward without the user's yes. A base branch that is not on the remote has its own yes for its push. For each line, one yes covers the push, each PR, each review comment and the stack link. The approval message lists all of them. It also lists each side effect on the remote, such as CI runs, review requests from CODEOWNERS, or bots that comment. Mark each side effect "checked" with its source, or "unchecked".

A user message that names the push and the PR, such as "push it and open a PR to <base>", is that yes for its line. List the side effects in the report instead. Ask again when a step goes beyond the message: a base branch push, a force push, or a PR already open for the branch.

A push that rewrites a remote branch uses `--force-with-lease`. Ask for it as its own yes, and say in the message that it rewrites the remote branch.

Stop and ask the user when a gate is red, or when the remote rejects a push.

## 1. Gather the line

1. Take the line from the caller: each branch with its base, the gate logs, the feature folder, and the "decided, please confirm" decisions and held questions. With no caller, take the current branch. Take its base from the user's message; else ask, and suggest the branch at `git merge-base`.
2. Find the ticket key and the main module of each branch: from the tech spec, the plan or the branch name. A branch that changes several modules equally has no module tag. With no ticket key, ask for it with the approval.
3. Check for open PRs: `gh pr list --head <branch> --state open` for each branch. A branch with an open PR goes to step 4, not step 3.

Done when: every branch has a base, a ticket key, a module or none, and a known PR state.

## 2. Check the gates

For each branch's top commit, read the caller's gate log for that exact commit when it exists and the run was not interrupted. Otherwise run every gate the repo configures, in the branch's worktree or checkout. Write each output to a log file outside the repo, append the exit code as its last line, and read the summary and the failures.

Done when: every gate exits 0 on every branch's top commit, or a red gate is a stop.

## 3. Open the PRs

1. Check for the stack tool: run `gh stack --version`. Exit 0 means the tool is there.
2. Write each PR's title, body and review comment, as `${CLAUDE_SKILL_DIR}/pr-body.md` says, to files outside the repo. Read each file back in full.
3. When the base of the bottom branch is not on the remote, ask for its push, then run `git push -u origin <base>`.
4. Run `git fetch origin`, a read-only call. Check each branch that is already on the remote: `git merge-base --is-ancestor <remote>/<branch> <branch>`. Push a branch that fails first, alone: `git push --force-with-lease origin <branch>`, on its own yes. Leave it out of the line's one-command push.
5. Ask for the line's yes. Then run, in order:
   - `git push -u origin <branches, bottom to top>`, as one command.
   - For each branch, bottom to top: `gh pr create --base <base> --head <branch> --title "<title>" --body-file <file> --assignee @me`.
   - The review comment on each PR, as `pr-body.md` says: `gh api repos/<owner>/<repo>/issues/<number>/comments -F body=@<file>`.
   - When the stack tool is there and the line has two or more PRs: `gh stack link --base <base of the bottom branch> <PR numbers, bottom to top>`. Pass PR numbers only, never branch names: given a branch, `link` pushes it and opens a PR itself.
   - A `link` that fails (for example exit 9, stacks not enabled) leaves the PRs stacked by their bases. Note it for the report and go on.
   - Run no other `gh stack` command: `init`, `submit`, `sync` and `rebase` push or rewrite branches.
6. Read back each PR's body and comment with `gh pr view <number> --json body,comments`. Check that each one is complete and its length is right.

Done when: every branch has its PR, each with the right base, title, body, assignee and comment.

## 4. Update open PRs

1. Compare what each PR does now with its title and body: `gh pr view <number> --json title,body`, against the branch's commits since the remote branch.
2. When the meaning changed, save the current body to a file. Write the new title and body as `pr-body.md` says, with Write, and read the body back in full. A change that leaves the PR's meaning as it was keeps the title and body.
3. Ask for the yes. One yes covers the title and body edit and its push. A push that rewrites the remote branch has its own yes, as above.
4. Edit before the push: `gh pr edit <number> --title "<title>" --body-file <file>`. Read the body back with `gh pr view <number> --json body`.
5. Push the changed branches with `git push`, or `--force-with-lease` on its own yes.

Done when: every changed branch is pushed, and each PR's title and body describe what it does now.

## 5. Report

Send the user one message: each branch with its PR link, new or updated; the gates with their exit codes; the read-back result; a stack link that failed; and the decisions to confirm and the held questions. When a caller called this skill, return the same facts to it instead.

Done when: the user or the caller has the report.
