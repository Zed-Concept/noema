#!/usr/bin/env node
/**
 * settings-control.mjs — the permanent control for the auth-settings
 * preflight in rls-probes.mjs (REVIEW-015 finding 2).
 *
 * What went wrong. `req()` turns a transport failure into HTTP status 0 with
 * an undefined body, so `readAuthSettings()` returned every field as
 * `undefined`, `disable_signup === true` was false, and the run continued.
 * The committed auth-probes.txt records exactly that —
 * `auth settings: HTTP 0 ... mailer_autoconfirm=undefined` — and the run
 * still finished 46 PASS / 0 FAIL / exit 0. A measurement that never
 * happened green-lit the run that quoted it.
 *
 * What this proves. Six cases drive rls-probes.mjs --anon against a loopback
 * HTTP server whose /auth/v1/settings response this file controls. Five are
 * negative controls, one per red path the preflight must catch; the sixth is
 * the positive control, without which "always aborts" would be
 * indistinguishable from "aborts correctly". Every case pins an exact child
 * exit code:
 *
 *   unreachable    no listener at all        -> HTTP 0, the exact shape the
 *                                               committed transcript recorded
 *   http-503       a non-200 status          -> abort
 *   unparseable    HTTP 200, body not JSON   -> abort
 *   missing-fields HTTP 200, {}              -> abort
 *   null-flags     HTTP 200, flags null      -> abort
 *   well-formed    HTTP 200, both booleans   -> ACCEPTED (exit 0)
 *
 * Nothing leaves the loopback interface: the server binds 127.0.0.1 on an
 * ephemeral port, the key is a runtime-assembled synthetic, and no Supabase
 * project, credential, or network host is contacted. Deterministic by
 * construction — the port is redaction-registered by the child, so it never
 * reaches the transcript, and this report prints no timing or path.
 *
 * Exit: 0 every case behaved exactly as pinned; 1 any case did not.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const evdir = dirname(fileURLToPath(import.meta.url));
const P = 'p';
const SYNTHETIC_KEY = `sb_${P}ublishable_SETTINGSCONTROLSYNTHETIC00`;

// Each case: how the server answers /auth/v1/settings, and the exact child
// exit the preflight must produce.
const CASES = [
  {
    name: 'unreachable',
    note: 'no listener — the transport failure shape req() maps to HTTP 0 (what the committed auth transcript recorded)',
    unreachable: true,
    expectExit: 4,
    expectReason: 'settings request did not return HTTP 200 (got 0)',
  },
  {
    name: 'http-503',
    note: 'reachable but non-200',
    respond: (res) => {
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end('{"msg":"service unavailable"}');
    },
    expectExit: 4,
    expectReason: 'settings request did not return HTTP 200 (got 503)',
  },
  {
    name: 'unparseable',
    note: 'HTTP 200 whose body is not JSON',
    respond: (res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html>gateway</html>');
    },
    expectExit: 4,
    expectReason: 'settings response body was not parseable JSON',
  },
  {
    name: 'missing-fields',
    note: 'HTTP 200, valid JSON, neither flag present',
    respond: (res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
    },
    expectExit: 4,
    expectReason: 'disable_signup is not a boolean (undefined)',
  },
  {
    name: 'null-flags',
    note: 'HTTP 200, both flags present but null — the shape a partial outage returns',
    respond: (res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"disable_signup":null,"mailer_autoconfirm":null}');
    },
    expectExit: 4,
    expectReason: 'disable_signup is not a boolean (null)',
  },
  {
    name: 'well-formed',
    note: 'POSITIVE CONTROL — HTTP 200 with both flags boolean; the preflight must ACCEPT, or the five results above would prove nothing',
    respond: (res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"disable_signup":false,"mailer_autoconfirm":true,"external":{"email":true}}');
    },
    preflightOnly: true,
    expectExit: 0,
    expectReason: '',
  },
];

let current = null;
const server = createServer((req, res) => {
  if (req.url === '/auth/v1/settings' && current?.respond) {
    current.respond(res);
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end('{"msg":"not found"}');
});

function runChild(url, preflightOnly, ledger) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(evdir, 'rls-probes.mjs'), '--anon'], {
      env: {
        ...process.env,
        EXPO_PUBLIC_SUPABASE_URL: url,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SYNTHETIC_KEY,
        REDACTION_LEDGER: ledger,
        REDACTION_CONTROL_LEAK: '',
        SETTINGS_PREFLIGHT_CONTROL: preflightOnly ? '1' : '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let buf = '';
    child.stdout.on('data', (d) => (buf += d));
    child.stderr.on('data', (d) => (buf += d));
    child.on('close', (code) => resolve({ code: code ?? -1, text: buf }));
  });
}

const scratch = mkdtempSync(join(tmpdir(), 'settings-control-'));
let violations = 0;
const rows = [];

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

for (const c of CASES) {
  current = c;
  const ledger = join(scratch, `ledger-${c.name}`);
  writeFileSync(ledger, '');
  // An unreachable case must not reach the live server: port 9 (discard) is
  // closed on loopback, so the connection is refused immediately.
  const url = c.unreachable ? 'http://127.0.0.1:9' : `http://127.0.0.1:${port}`;
  const { code, text } = await runChild(url, c.preflightOnly === true, ledger);

  const aborted = text.includes('RUN ABORTED — auth-settings preflight failed closed');
  const accepted = text.includes('preflight-control: the settings preflight ACCEPTED this response');
  const reasonOk = c.expectReason === '' ? true : text.includes(`reason: ${c.expectReason}`);
  const shapeOk = c.expectExit === 0 ? accepted && !aborted : aborted && !accepted;
  // No case may report a probe PASS: the five red cases stop before any probe
  // runs, and the positive control stops immediately after the preflight.
  const noProbePass = !/^PASS {2}/m.test(text);
  const ok = code === c.expectExit && reasonOk && shapeOk && noProbePass;
  if (!ok) violations += 1;
  rows.push({ c, code, aborted, accepted, reasonOk, shapeOk, noProbePass, ok });
}

server.close();
rmSync(scratch, { recursive: true, force: true });

console.log('# Auth-settings preflight — permanent control (REVIEW-015 finding 2).');
console.log('# rls-probes.mjs --anon is driven against a loopback HTTP server that');
console.log('# controls the /auth/v1/settings response. Five negative controls, one per');
console.log('# red path the preflight must catch, plus one positive control proving the');
console.log('# preflight still ACCEPTS a well-formed response. Synthetic key, 127.0.0.1');
console.log('# only: no Supabase project, credential, or network host is contacted.');
console.log('#');
console.log('# The defect under test: a settings read that failed was reported as');
console.log('# HTTP 0 with undefined fields and the run continued to 46 PASS / exit 0.');
console.log('# The `unreachable` case below reproduces that exact input.');
for (const r of rows) {
  console.log('');
  console.log(`case: ${r.c.name}`);
  console.log(`what it feeds the preflight: ${r.c.note}`);
  console.log(`child exit code: ${r.code} (${r.c.expectExit} required)`);
  console.log(
    `preflight verdict: ${r.aborted ? 'ABORTED' : r.accepted ? 'ACCEPTED' : 'neither'} ` +
      `(${r.c.expectExit === 0 ? 'ACCEPTED' : 'ABORTED'} required)`,
  );
  if (r.c.expectReason !== '') {
    console.log(`recorded reason matches "${r.c.expectReason}": ${r.reasonOk ? 'yes' : 'no'} (yes required)`);
  }
  console.log(`zero probe PASS lines emitted: ${r.noProbePass ? 'yes' : 'no'} (yes required)`);
  console.log(`case verdict: ${r.ok ? 'as pinned' : 'VIOLATION'}`);
}
console.log('');
console.log(`cases run: ${rows.length} (5 negative + 1 positive)`);
console.log(`violations: ${violations} (0 required)`);
console.log('--- enforced: every case exits exactly as pinned, the five red paths abort');
console.log('--- with their exact recorded reason and emit no probe PASS, and the');
console.log('--- well-formed case is accepted — or capture.sh exits 1 (fail closed) ---');
process.exit(violations === 0 ? 0 : 1);
