#!/usr/bin/env node
/**
 * redaction-gate.mjs — the post-write redaction totality gate (the
 * REVIEW-011 finding 3 rebuild): scans the EXACT bytes of a written
 * transcript file — the same bytes a commit would record — against every
 * raw value registered in the run's ledger (REDACTION_LEDGER, written by
 * rls-probes.mjs registerSecret) plus the generic JWT shape. The in-process
 * gate inside rls-probes.mjs covers only its own buffered lines; this gate
 * covers the whole committed stream, including anything that reached the
 * child's stdout/stderr directly without passing through the buffer.
 *
 * Contract (the exit status): 0 = green — zero residual registered values
 * and zero JWT shapes in the file; the printed sha256 binds the scanned
 * bytes to the committed bytes. 1 = red — the transcript is DELETED so it
 * cannot be committed — or fail-closed (ledger missing, unreadable, or
 * implausibly small; transcript unreadable). 2 = usage. Ledger values are
 * never printed.
 *
 * Usage (invoked by live-probes.sh after the transcript file is complete):
 *   REDACTION_LEDGER=<ledger> node redaction-gate.mjs <transcript-file>
 */
import { createHash } from 'node:crypto';
import { readFileSync, unlinkSync } from 'node:fs';
import { basename } from 'node:path';

const file = process.argv[2];
if (!file) {
  console.log('usage: node redaction-gate.mjs <transcript-file>   (REDACTION_LEDGER must be set)');
  process.exit(2);
}
console.log(`file: ${basename(file)}`);
function fail(msg) {
  console.log(`verdict: RED — ${msg} (exit 1)`);
  process.exit(1);
}
const ledgerPath = process.env.REDACTION_LEDGER;
if (!ledgerPath) fail('REDACTION_LEDGER not set; nothing was scanned — fail closed');
let ledgerRaw;
try {
  ledgerRaw = readFileSync(ledgerPath, 'utf8');
} catch {
  fail('ledger unreadable; nothing was scanned — fail closed');
}
let buf;
try {
  buf = readFileSync(file);
} catch {
  fail('transcript unreadable — fail closed');
}
const text = buf.toString('utf8');
console.log(`bytes: ${buf.length}`);
console.log(`sha256: ${createHash('sha256').update(buf).digest('hex')}`);
// The >= 8 floor mirrors registerSecret's; blank lines drop out with it.
const values = [...new Set(ledgerRaw.split('\n').filter((v) => v.length >= 8))];
console.log(`registered values scanned: ${values.length} distinct (raw values never printed)`);
if (values.length < 2) {
  fail('ledger implausibly small (< 2 distinct values — did the child register?) — fail closed');
}
const jwtMatches = (text.match(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g) ?? [])
  .length;
console.log(`jwt-shape sweep: ${jwtMatches} matches`);
let classes = 0;
let occurrences = 0;
for (const v of values) {
  const n = text.split(v).length - 1;
  if (n > 0) classes += 1;
  occurrences += n;
}
console.log(`residual registered-value classes: ${classes} (occurrences: ${occurrences})`);
if (classes > 0 || jwtMatches > 0) {
  try {
    unlinkSync(file);
  } catch {
    // already gone; red either way
  }
  fail('residual secret bytes in the exact transcript file — transcript deleted');
}
console.log('verdict: GREEN (exit 0)');
process.exit(0);
