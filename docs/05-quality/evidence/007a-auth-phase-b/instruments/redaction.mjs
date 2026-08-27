// Redaction at source — the 004b discipline (REVIEW-011 finding 3 lineage),
// adapted to this unit's transcript design, plus ruling 24's code relay.
//
// TWO LAYERS, as in 004b:
//
// 1. AT SOURCE (this module): every artifact line passes through `redact()`
//    before it is buffered. Registered values — staging URL, host, project
//    ref, publishable key, every test-identity email, every relayed one-time
//    code, every access and refresh token observed — are replaced with named
//    placeholders. A generic JWT-shape sweep then runs over the line, and any
//    line on which the marker prefix of a JWT still survives after the sweep
//    is REFUSED: the writer throws rather than buffering it. Transcript files
//    are written ONLY by this module's writers; the committed artifact stream
//    is never the process stdout, so a stray console.log cannot reach it —
//    a structural difference from 004b, stated in the README.
//
// 2. POST-WRITE, PRE-EXIT (in-run totality gate): every registered value is
//    mirrored into the 0600 scratch ledger named by REDACTION_LEDGER (outside
//    the repo, created by live-run.sh, deleted on exit; this module refuses
//    to construct without it — the 004b "refuses to run unledgered" rule).
//    After all transcript files are written, `finalScan()` re-reads the EXACT
//    file bytes and scans them against the full ledger plus the JWT sweep.
//    Any residue: the offending file is unlinked and the run exits nonzero.
//    The scan verdict, with a sha256 per file binding scanned bytes to
//    committed bytes, is recorded in the run summary.
//
// A third, ledger-free pattern scan over the committed bytes with positive
// controls (`redaction-scan.mjs`) runs after commit-time assembly; it is a
// separate instrument.
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';

// Longest-first replacement so a value containing another registered value
// (URL ⊃ host ⊃ project ref) is replaced before its substrings are looked at.
export class Redactor {
  constructor(ledgerPath) {
    if (!ledgerPath) {
      throw new Error(
        'REDACTION_LEDGER is not set. The producer refuses to run unledgered ' +
          '(004b discipline): the post-write totality scan needs the ledger.',
      );
    }
    let mode = null;
    try {
      mode = statSync(ledgerPath).mode & 0o777;
    } catch {
      throw new Error('REDACTION_LEDGER does not exist; live-run.sh creates it 0600.');
    }
    if (mode !== 0o600) {
      throw new Error('REDACTION_LEDGER is not 0600; refusing to run.');
    }
    this.ledgerPath = ledgerPath;
    this.entries = []; // { value, placeholder }
    this.counters = new Map();
  }

  register(value, placeholder) {
    if (typeof value !== 'string' || value.length < 4) return; // nothing meaningful to redact
    if (this.entries.some((e) => e.value === value)) return;
    this.entries.push({ value, placeholder });
    this.entries.sort((a, b) => b.value.length - a.value.length);
    appendFileSync(this.ledgerPath, `${value}\n`, { mode: 0o600 });
  }

  registerCounted(value, family) {
    if (typeof value !== 'string' || value.length < 4) return;
    if (this.entries.some((e) => e.value === value)) return;
    const n = (this.counters.get(family) ?? 0) + 1;
    this.counters.set(family, n);
    this.register(value, `<${family}-${n}>`);
  }

  /** Register both tokens of a session object, if present. Never logs. */
  registerSession(session) {
    if (!session || typeof session !== 'object') return;
    if (typeof session.access_token === 'string') {
      this.registerCounted(session.access_token, 'access-token');
    }
    if (typeof session.refresh_token === 'string') {
      this.registerCounted(session.refresh_token, 'refresh-token');
    }
    if (typeof session.provider_token === 'string') {
      this.registerCounted(session.provider_token, 'provider-token');
    }
    if (typeof session.provider_refresh_token === 'string') {
      this.registerCounted(session.provider_refresh_token, 'provider-refresh-token');
    }
  }

  redact(line) {
    let out = line;
    for (const { value, placeholder } of this.entries) {
      out = out.split(value).join(placeholder);
    }
    // Generic JWT-shape sweep: three base64url segments led by the JSON-object
    // marker. Runs after registered-value replacement, so it only ever
    // catches shapes that were never registered (e.g. a token embedded inside
    // a server error message).
    out = out.replace(
      /eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g,
      '<jwt-shape-redacted>',
    );
    return out;
  }

  /** Fail-closed check used by the writer on every buffered line. */
  assertClean(line) {
    for (const { value } of this.entries) {
      if (line.includes(value)) {
        throw new Error('redaction failure: a registered value survived replacement');
      }
    }
    if (/eyJ[A-Za-z0-9_-]{4,}\./.test(line)) {
      throw new Error('redaction failure: a JWT-shaped value survived the sweep');
    }
  }
}

/** A transcript file whose every line passes through the redactor. */
export class TranscriptWriter {
  constructor(redactor, path, title, headerLines = []) {
    this.redactor = redactor;
    this.path = path;
    this.lines = [];
    this.closed = false;
    this.line(`# ${title}`);
    for (const h of headerLines) this.line(h);
  }

  line(text = '') {
    if (this.closed) throw new Error(`writer for ${this.path} is closed`);
    for (const piece of String(text).split('\n')) {
      const redacted = this.redactor.redact(piece);
      this.redactor.assertClean(redacted);
      this.lines.push(redacted);
    }
  }

  close(footer) {
    if (footer) this.line(footer);
    this.closed = true;
    writeFileSync(this.path, this.lines.join('\n') + '\n');
  }
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * The in-run totality gate: scan the exact bytes of every written transcript
 * against the full ledger plus the JWT shape. Returns per-file results;
 * unlinks any file with residue. GREEN only when every file scanned clean.
 */
export function finalScan(ledgerPath, files) {
  const ledger = readFileSync(ledgerPath, 'utf8')
    .split('\n')
    .filter((v) => v.length >= 4);
  if (ledger.length < 2) {
    // Fewer than two distinct values means the run cannot have registered its
    // own credentials — fail closed rather than certify a vacuous scan.
    return { verdict: 'RED', reason: 'ledger implausibly small; nothing was proven', files: [] };
  }
  const results = [];
  let verdict = 'GREEN';
  for (const path of files) {
    let bytes;
    try {
      bytes = readFileSync(path, 'utf8');
    } catch {
      results.push({ path, status: 'UNREADABLE' });
      verdict = 'RED';
      continue;
    }
    const residual = ledger.filter((v) => bytes.includes(v)).length;
    const jwt = /eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/.test(bytes);
    if (residual > 0 || jwt) {
      unlinkSync(path);
      results.push({ path, status: 'RED-UNLINKED', residual, jwt });
      verdict = 'RED';
    } else {
      results.push({ path, status: 'GREEN', sha256: sha256File(path) });
    }
  }
  return { verdict, ledgerDistinct: ledger.length, files: results };
}
