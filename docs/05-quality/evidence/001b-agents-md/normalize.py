#!/usr/bin/env python3
"""Strip markdown structure from a file, leaving only the wording.

Used to prove that restoring AGENTS.md formatting changed structure only.
Removes: ATX heading markers, list bullets, ordered-list numbers, bold
markers, inline-code backticks, table pipes and separator rows, and all
whitespace differences (including the old file's tab-separated table).
Emits one word per line so a diff points at the exact word that moved.
"""
import re
import sys


def normalize(path):
    words = []
    for raw in open(path, encoding="utf-8"):
        line = raw.strip()
        if not line:
            continue
        # Table separator rows carry no wording at all.
        if re.fullmatch(r"\|[\s|:-]*\|", line):
            continue
        # Table rows: drop the outer pipes, treat inner pipes as spaces.
        # Only lines that *start* with a pipe are rows -- this leaves the
        # lock-protocol line "Status: BUILD | REVIEW | ..." intact.
        if line.startswith("|"):
            line = " ".join(c.strip() for c in line.strip("|").split("|"))
        line = re.sub(r"^#+\s*", "", line)        # headings
        line = re.sub(r"^[-*]\s+", "", line)      # bullets
        line = re.sub(r"^\d+\.\s+", "", line)     # ordered items
        line = line.replace("**", "").replace("`", "")
        words.extend(line.split())
    return words


if __name__ == "__main__":
    for w in normalize(sys.argv[1]):
        print(w)
