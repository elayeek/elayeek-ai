---
name: finish-branch
description: Use when the user or another skill asks to finish, push, open PRs for, or wrap up one or more built branches. Checks the gates, then pushes and opens PRs, keeps the branches local, or merges locally, each step on the user's word.
---

# Finish a branch

This skill takes built branches to their exit: pull requests (PRs) on the remote, a local merge, or kept local for later. Every push and every PR waits for the user's yes.

Terms:
- Each branch has a **parent**: the branch it was built on. A task branch's parent is the feature branch or the task branch below it.
- The **feature branch** is the branch the task PRs target. It later merges into the default branch as one PR.
- A **line** is a chain of branches, each built on the one before, starting at the feature branch. Each line becomes one stack of PRs.
- A **gate** is the repo's typecheck, lint or test command, judged by its exit code.

## Approvals and stops

Run nothing outward without the user's yes. The feature branch push has its own yes. For each line, one yes covers the push, each PR, each review comment and the stack link. The approval message lists all of them. It also lists each side effect on the remote, such as CI runs, review requests from CODEOWNERS, or bots that comment. Mark each side effect "checked" with its source, or "unchecked".

A push that rewrites a remote branch uses `--force-with-lease`. Ask for it as its own yes, and say in the message that it rewrites the remote branch.

Stop and ask the user when:
- a gate is red;
- the remote rejects a push;
- a local merge conflicts, or its gates are red;
- a worktree removal is refused because it holds uncommitted files: show them with `git -C <worktree> status --porcelain -uall`, and ask whether to commit, move or delete them.

Delete only branches that are fully merged, with `git branch -d`. A squash merge leaves the branch unmerged for git. When `gh pr view <number> --json state` shows `MERGED`, offer `git branch -D` for that branch. Throw away other unmerged work only when the user asks for it in so many words: list the branch and its commits, and wait for a second yes.

## 1. Gather the branches

1. Take the branch list from the caller, with each branch's parent and worktree. When implement-plan calls, it passes its ledger path. Take only the branches in its `Hand-over` lines. Read each branch's parent from the `parent <branch>` field of its latest `Hand-over`, `moved` or `started` line. Read worktrees, gate logs, decisions and questions from the ledger. Called with no list, take the current branch, and ask the user to confirm its parent: suggest the branch at `git merge-base`.
2. Group the branches into lines, bottom to top. When the user kept a fork separate (the ledger records it), the shared part is its own line. Each child line waits until the shared part merges into the feature branch.
3. Find the ticket key and the main module of each branch: from the tech spec, the plan or the branch name. A branch that changes several modules equally has no module tag. With no ticket key, ask for it in the step 3 round.
4. When the call says "stopped early", or the ledger holds a `Stopped:` line, note that the final cross-task review did not cover these branches.
5. Collect the "decided, please confirm" decisions and the held questions: from implement-plan's ledger (`decided:` and `question` lines) or from implement's report, and from `open-items.md`. They fill the review comment and the step 6 report.

Done when: every branch has a parent, a line, a ticket key, and a module or none.

## 2. Check the gates

For each branch's top commit, read the caller's gate log for that exact commit when it exists and the run was not interrupted. Otherwise run every gate the repo configures, in the branch's worktree or checkout. Write each output to a log file outside the repo, append the exit code as its last line, and read the summary and the failures.

Done when: every gate exits 0 on every branch's top commit, or a red gate is a stop.

## 3. Choose the exit

Ask the user one round, with the first option recommended:
1. Push and open PRs.
2. Keep the branches local, for later.
3. Merge locally into the parent, with no push. This suits small work that needs no PR.

Include the note from step 1 item 4 when it applies, and the ticket key question from step 1 item 3.

Done when: the user has chosen.

## 4. Push and open PRs

1. Check for the stack tool: run `gh stack --version`. Exit 0 means the tool is there.
2. Write each PR's title, body and review comment, as `${CLAUDE_SKILL_DIR}/pr-body.md` says, to files outside the repo. Read each file back in full.
3. When the feature branch is not on the remote, ask for its push, then run `git push -u origin <feature branch>`.
4. Run `git fetch origin`, a read-only call. For each line that does not wait, check each branch that is already on the remote: `git merge-base --is-ancestor <remote>/<branch> <branch>`. Push a branch that fails first, alone: `git push --force-with-lease origin <branch>`. It needs its own yes, and the message says it rewrites the remote branch. Leave it out of the line's one-command push.
5. For each line, ask for its yes. The message lists the push, each PR, each comment and the link. Then run, in order:
   - `git push -u origin <branches, bottom to top>`, as one command.
   - For each branch, bottom to top: `gh pr create --base <parent> --head <branch> --title "<title>" --body-file <file> --assignee @me`.
   - The review comment on each PR, as `pr-body.md` says: `gh api repos/<owner>/<repo>/issues/<number>/comments -F body=@<file>`.
   - When the stack tool is there and the line has two or more PRs: `gh stack link --base <feature branch> <PR numbers, bottom to top>`. Pass PR numbers only, never branch names: given a branch, `link` pushes it and opens a PR itself.
   - A `link` that fails (for example exit 9, stacks not enabled) leaves the PRs stacked by their bases. Note it for the report and go on.
   - Run no other `gh stack` command: `init`, `submit`, `sync` and `rebase` push or rewrite branches.
6. Read back each PR's body and comment with `gh pr view <number> --json body,comments`. Check that each one is complete and its length is right.
7. Remove each pushed branch's worktree after its push. Remove only linked worktrees from the caller's list, never the main checkout. Run git from the main checkout: `git -C <main checkout> worktree remove <path>`, then `git -C <main checkout> worktree prune`. The branch stays.

Done when: every line that does not wait has its PRs, each with the right base, title, body, assignee and comment, and every pushed branch's worktree is removed.

## 5. Merge locally

1. Merge each line's top into the line's base, in a clean checkout of the base. Use the main checkout when it is on the base and clean. Otherwise use a temporary worktree, and install the dependencies before the gates.
2. Run every gate on the merged result.
3. When it is green, offer to delete each merged branch and its worktree. Remove a branch's worktree before `git branch -d`.

Done when: the merged result is green and the user has answered the offer.

## 6. Report

Send the user one message: the exit taken; each branch with its PR link or local state; the gates with their exit codes; the worktrees removed; the decisions to confirm and the held questions; and the next step, such as the feature branch PR once the task PRs merge. When a line waits for a fork's shared part, name that as the next step: push each child line after the shared part merges into the feature branch. When the user chose to keep the branches local, list each branch with its worktree, and end.

Done when: the user has the report.

## Later pushes

When a later push changes what a PR does, rewrite its body before the push. Save the current body to a file first, write the new body with Write, read it back in full. Send it with `gh pr edit <number> --body-file <file>`, and read the body back with `gh pr view <number> --json body`. Then push the changed branches with `git push`. One yes covers the body edit and its push. A push that leaves the PR's meaning unchanged leaves the body as it is.
