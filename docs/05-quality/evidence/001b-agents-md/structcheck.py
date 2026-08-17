#!/usr/bin/env python3
"""Validate AGENTS.md structure against the GFM rules it depends on.

Checks headings, the Quick reference table, the indented lock-protocol
block, and the absence of tab-separated pseudo-table rows. Exits non-zero
on any failure so the evidence artifact cannot record a false PASS.
"""
import re
import sys

path = sys.argv[1]
lines = open(path, encoding="utf-8").read().split("\n")
fails = []

# --- headings -------------------------------------------------------------
headings = [(i + 1, l) for i, l in enumerate(lines) if re.match(r"^#{1,6} ", l)]
print(f"ATX headings found: {len(headings)}")
for ln, h in headings:
    level = len(h) - len(h.lstrip("#"))
    print(f"  L{ln:<4} h{level}  {h.lstrip('# ')}")
if not headings:
    fails.append("no ATX headings")
if headings and not headings[0][1].startswith("# "):
    fails.append("document does not open with an h1")
# A heading needs a blank line before it (except at line 1) to render.
for ln, h in headings:
    if ln > 1 and lines[ln - 2].strip() != "":
        fails.append(f"L{ln}: heading not preceded by a blank line")

# --- Quick reference table ------------------------------------------------
rows = [(i + 1, l) for i, l in enumerate(lines) if l.startswith("|")]
print(f"\nPipe table rows found: {len(rows)}")
if len(rows) < 3:
    fails.append("table has fewer than 3 rows (header + delimiter + body)")
else:
    def ncols(l):
        return len(l.strip().strip("|").split("|"))

    header_ln, header = rows[0]
    delim_ln, delim = rows[1]
    if not re.fullmatch(r"\|[\s|:-]*\|", delim):
        fails.append(f"L{delim_ln}: row after header is not a delimiter row")
    if delim_ln != header_ln + 1:
        fails.append("delimiter row does not immediately follow the header")
    width = ncols(header)
    print(f"  header L{header_ln}: {width} columns -> {header}")
    for ln, r in rows:
        if ncols(r) != width:
            fails.append(f"L{ln}: {ncols(r)} columns, expected {width}")
    print(f"  delimiter L{delim_ln}: OK")
    print(f"  body rows: {len(rows) - 2}, all {width} columns")
    if lines[header_ln - 2].strip() != "":
        fails.append("table not preceded by a blank line")

# --- lock-protocol preformatted block ------------------------------------
indented = [i + 1 for i, l in enumerate(lines) if l.startswith("    ") and l.strip()]
print(f"\nIndented (code-block) lines: {len(indented)} at {indented}")
if not indented:
    fails.append("lock-protocol block is not indented as preformatted text")

# --- regression guard: no tab-separated pseudo-table ---------------------
tabs = [i + 1 for i, l in enumerate(lines) if "\t" in l]
print(f"Lines containing a literal tab: {len(tabs)} {tabs}")
if tabs:
    fails.append(f"literal tabs present at {tabs} (the original defect)")

# --- verdict --------------------------------------------------------------
print("\n" + ("FAIL: " + "; ".join(fails) if fails else "PASS: structure valid"))
sys.exit(1 if fails else 0)
