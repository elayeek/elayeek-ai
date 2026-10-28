#!/usr/bin/env python3
"""Structural lint for a Claude Code skill folder. Usage: skill_lint.py <skill-folder>"""
import re
import sys
from pathlib import Path

FIELDS = {
    "name", "description", "when_to_use", "argument-hint", "arguments",
    "disable-model-invocation", "user-invocable", "allowed-tools", "disallowed-tools",
    "model", "effort", "context", "agent", "background", "hooks", "paths", "shell",
    "metadata", "license", "compatibility",
}
HOUSE_ID_RE = re.compile(r"(?<!\w)([CGO]\d+|§\s?\d+)(?!\w)")
OUTSIDE = ("../", "~/.claude", "ORCHESTRATOR.md")
SKILL_DIR_PREFIX = "${CLAUDE_SKILL_DIR}/"
FENCE_RE = re.compile(r"```.*?```", re.S)
COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
SPAN_RE = re.compile(r"`([^`\n]*)`")
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
SCHEME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:")
KEY_RE = re.compile(r"^([A-Za-z][\w-]*):")

NAMES = ["Frontmatter fields", "SKILL.md size", "Outside references", "Pointers"]


def blank(text, pattern):
    # Keep newlines so offsets still map to the original line numbers.
    return pattern.sub(lambda m: "\n" * m.group(0).count("\n"), text)


def prose(text):
    return blank(blank(blank(text, FENCE_RE), COMMENT_RE), SPAN_RE)


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def frontmatter_keys(text):
    """Return [(line_no, key)] for top-level keys; empty when there is no frontmatter."""
    lines = text.split("\n")
    if lines[0].rstrip() != "---":
        return []
    end = next((i for i in range(1, len(lines)) if lines[i].rstrip() == "---"), None)
    if end is None:
        return []
    return [(i + 1, m.group(1)) for i in range(1, end) if (m := KEY_RE.match(lines[i]))]


def lint(folder):
    """Return [(check name, [problem strings])] for checks 1-4, in order."""
    root = Path(folder).resolve()
    skill_text = (root / "SKILL.md").read_text(encoding="utf-8")
    files = [(p, p.relative_to(root).as_posix(), p.read_text(encoding="utf-8"))
             for p in sorted(root.rglob("*.md"))]
    problems = [[] for _ in NAMES]

    for ln, key in frontmatter_keys(skill_text):
        if key not in FIELDS:
            problems[0].append(f"SKILL.md:{ln}: unknown frontmatter field '{key}'")

    if len(skill_text) > 18000:
        problems[1].append(f"SKILL.md:1: {len(skill_text)} characters, limit 18000")

    for path, rel, text in files:
        for n, line in enumerate(text.split("\n"), 1):
            for needle in OUTSIDE:
                if needle in line:
                    problems[2].append(f"{rel}:{n}: outside reference '{needle}'")
        stripped = prose(text)
        for m in HOUSE_ID_RE.finditer(stripped):
            problems[2].append(f"{rel}:{line_of(stripped, m.start())}: house rule ID '{m.group(1)}'")

        scan = blank(text, FENCE_RE)
        targets = [(m.start(), m.group(1), False) for m in LINK_RE.finditer(scan)]
        for m in SPAN_RE.finditer(scan):
            c = m.group(1)
            if c.startswith(SKILL_DIR_PREFIX) and c.endswith(".md"):
                targets.append((m.start(), c[len(SKILL_DIR_PREFIX):], True))
        for pos, target, is_span in targets:
            if not is_span:
                if SCHEME_RE.match(target) or target.startswith("#"):
                    continue
                target = target.split("#", 1)[0]
                if not target:
                    continue
            resolved = ((root if is_span else path.parent) / target).resolve()
            if not (resolved.is_file() and resolved.is_relative_to(root)):
                problems[3].append(f"{rel}:{line_of(scan, pos)}: target '{target}' is not an existing file inside the skill folder")

    return list(zip(NAMES, problems))


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 1 or not Path(argv[0]).is_dir():
        print("usage: skill_lint.py <skill-folder>", file=sys.stderr)
        return 2
    if not (Path(argv[0]) / "SKILL.md").is_file():
        print(f"FAIL no SKILL.md in {argv[0]}")
        return 1
    failed = False
    for n, (name, probs) in enumerate(lint(argv[0]), 1):
        print(f"{'FAIL' if probs else 'PASS'} {n} {name}")
        for p in probs:
            print(f"  {p}")
        failed = failed or bool(probs)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
