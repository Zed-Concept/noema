#!/usr/bin/env node
/**
 * settings-control.mjs — the permanent control for two properties of the live
 * probe surface that a green run cannot demonstrate about itself:
 *
 *   section 1  the auth-settings preflight in rls-probes.mjs aborts the run,
 *              before any probe, on every unusable /auth/v1/settings response,
 *              in BOTH production modes, and still lets a well-formed response
 *              through (REVIEW-015 finding 2, REVIEW-016 finding 2).
 *   section 2  live-probes.sh refuses to start when a control variable is
 *              present in its inherited environment, and still admits a clean
 *              environment (REVIEW-016 finding 2). Three variable/mode pairs
 *              are run: REDACTION_CONTROL_LEAK in the default and --control
 *              modes, and the retired SETTINGS_PREFLIGHT_CONTROL in the
 *              default mode. The retired name under --control is NOT
 *              exercised, so nothing here is entitled to say "every control
 *              variable in both modes" (REVIEW-017 finding 3).
 *
 * WHAT WENT WRONG, TWICE.
 *
 * First (REVIEW-015 finding 2): `req()` turns a transport failure into HTTP
 * status 0 with an undefined body, so `readAuthSettings()` returned every
 * field as `undefined`, `disable_signup === true` was false, and the run
 * continued. The committed auth-probes.txt records exactly that —
 * `auth settings: HTTP 0 ... mailer_autoconfirm=undefined` — and the run still
 * finished 46 PASS / 0 FAIL / exit 0. A measurement that never happened
 * green-lit the run that quoted it.
 *
 * Second (REVIEW-016 finding 2): the control written for that finding proved
 * the preflight ACCEPTS a well-formed response by setting an environment flag,
 * SETTINGS_PREFLIGHT_CONTROL, that made rls-probes.mjs --anon exit 0 straight
 * after the preflight with zero probes. live-probes.sh inherits its caller's
 * environment and reads child 0 as success, so that flag was an ambient switch
 * that could skip every anon denial probe and leave the wrapper green. The
 * same control also spawned --anon for every case, so the auth mode's own
 * preflight call was never exercised, and both of its non-boolean cases failed
 * on `disable_signup` before `mailer_autoconfirm` was ever read: removing the
 * auth-mode preflight, or the mailer guard, left every case green.
 *
 * HOW THIS VERSION AVOIDS BOTH. The settings-preflight success hook is gone —
 * no seam in either producer can make the preflight report success. That is
 * narrower than "no test hook at all", which would be false: rls-probes.mjs
 * still carries the contained synthetic REDACTION_CONTROL_LEAK hook and
 * live-probes.sh still has its --control mode, and both are refused on a
 * default production run when the variable is ambient (section 2, and
 * REVIEW-017 finding 4).
 * Every case below spawns the REAL `rls-probes.mjs --anon` and the REAL
 * `rls-probes.mjs --auth`, with no control variable set, against a loopback
 * HTTP server whose /auth/v1/settings response this file controls and which
 * 404s everything else. The nine negative cases are proved by the production
 * run ABORTING at exit 4 with its exact recorded reason and zero probe PASS
 * lines; the positive case is proved by the production run CONTINUING past the
 * preflight into probes — not by a flag that stops it. Because every case runs
 * in both modes, deleting the auth mode's preflight call turns nine cases red;
 * because three cases carry a valid `disable_signup` and an invalid
 * `mailer_autoconfirm`, and one carries the converse, deleting either boolean
 * guard turns cases red on its own.
 *
 * Nothing leaves the loopback interface. The server binds 127.0.0.1 on an
 * ephemeral port; the unreachable case uses 127.0.0.1:9 (discard, closed —
 * instant refusal, no DNS); the key is a runtime-assembled synthetic; no
 * Supabase project, credential, or network host is contacted, and the children
 * never read .env (rls-probes.mjs reads its URL and key from the environment
 * only). Deterministic by construction — the port is redaction-registered by
 * the child so it never reaches the transcript, and this report prints no
 * timing, port, or path.
 *
 * Exit: 0 every case behaved exactly as pinned; 1 any case did not.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const evdir = dirname(fileURLToPath(import.meta.url));
const P = 'p';
const SYNTHETIC_KEY = `sb_${P}ublishable_SETTINGSCONTROLSYNTHETIC00`;
const ABORT_LINE = 'RUN ABORTED — auth-settings preflight failed closed';
// Names live-probes.sh must refuse. Kept in step with its CONTROL_VARS list.
const CONTROL_VARS = ['REDACTION_CONTROL_LEAK', 'SETTINGS_PREFLIGHT_CONTROL'];

// Each case: how the server answers /auth/v1/settings, and — for the negative
// cases — the exact reason the preflight must record. `expectExit` is per
// mode, because a run that legitimately continues past the preflight ends
// differently in each mode against a server that 404s every other route.
const CASES = [
  {
    name: 'unreachable',
    note: 'no listener — the transport failure shape req() maps to HTTP 0 (what the committed auth transcript recorded)',
    unreachable: true,
    reason: 'settings request did not return HTTP 200 (got 0)',
  },
  {
    name: 'http-503',
    note: 'reachable but non-200',
    body: ['{"msg":"service unavailable"}', 503, 'application/json'],
    reason: 'settings request did not return HTTP 200 (got 503)',
  },
  {
    name: 'unparseable',
    note: 'HTTP 200 whose body is not JSON',
    body: ['<html>gateway</html>', 200, 'text/html'],
    reason: 'settings response body was not parseable JSON',
  },
  {
    name: 'missing-fields',
    note: 'HTTP 200, valid JSON, neither flag present',
    body: ['{}', 200, 'application/json'],
    reason: 'disable_signup is not a boolean (undefined)',
  },
  {
    name: 'null-flags',
    note: 'HTTP 200, both flags present but null — the shape a partial outage returns',
    body: ['{"disable_signup":null,"mailer_autoconfirm":null}', 200, 'application/json'],
    reason: 'disable_signup is not a boolean (null)',
  },
  {
    name: 'disable-signup-non-boolean',
    note: 'ISOLATES disable_signup — mailer_autoconfirm is a valid boolean, so only the disable_signup guard can reject this',
    body: ['{"disable_signup":"false","mailer_autoconfirm":true}', 200, 'application/json'],
    reason: 'disable_signup is not a boolean ("false")',
  },
  {
    name: 'mailer-missing',
    note: 'ISOLATES mailer_autoconfirm — disable_signup is a valid boolean and the mailer flag is absent, so only the mailer guard can reject this',
    body: ['{"disable_signup":false}', 200, 'application/json'],
    reason: 'mailer_autoconfirm is not a boolean (undefined)',
  },
  {
    name: 'mailer-null',
    note: 'ISOLATES mailer_autoconfirm — disable_signup valid, mailer flag null',
    body: ['{"disable_signup":false,"mailer_autoconfirm":null}', 200, 'application/json'],
    reason: 'mailer_autoconfirm is not a boolean (null)',
  },
  {
    name: 'mailer-non-boolean',
    note: 'ISOLATES mailer_autoconfirm — disable_signup valid, mailer flag a string',
    body: ['{"disable_signup":false,"mailer_autoconfirm":"true"}', 200, 'application/json'],
    reason: 'mailer_autoconfirm is not a boolean ("true")',
  },
  {
    name: 'well-formed',
    note: 'POSITIVE CONTROL — HTTP 200 with both flags boolean; the production run must CONTINUE past the preflight into probes, or the nine results above would prove only that the preflight is unconditionally red',
    body: [
      '{"disable_signup":false,"mailer_autoconfirm":true,"external":{"email":true}}',
      200,
      'application/json',
    ],
    positive: true,
    // Both modes proceed and then fail on the 404-everything server: --anon
    // runs its probes and reports failures (1); --auth cannot obtain a session
    // from a 404 signup endpoint and records the authenticated probes NOT RUN
    // (3). Neither is 4, and neither prints the abort line.
    expectExit: { '--anon': 1, '--auth': 3 },
  },
];

let current = null;
const server = createServer((rq, res) => {
  if (rq.url === '/auth/v1/settings' && current?.body) {
    const [payload, status, type] = current.body;
    res.writeHead(status, { 'content-type': type });
    res.end(payload);
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end('{"msg":"not found"}');
});

// A child environment with every control variable REMOVED, so no case can be
// green because of one, and so this control cannot itself become the ambient
// switch it exists to rule out.
function cleanEnv(extra) {
  const env = { ...process.env, ...extra };
  for (const v of CONTROL_VARS) delete env[v];
  return env;
}

function runProbe(mode, url, ledger) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(evdir, 'rls-probes.mjs'), mode], {
      env: cleanEnv({
        EXPO_PUBLIC_SUPABASE_URL: url,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SYNTHETIC_KEY,
        REDACTION_LEDGER: ledger,
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let buf = '';
    child.stdout.on('data', (d) => (buf += d));
    child.stderr.on('data', (d) => (buf += d));
    child.on('close', (code) => resolve({ code: code ?? -1, text: buf }));
  });
}

function runWrapper(args, env, outdir) {
  return new Promise((resolve) => {
    const child = spawn('bash', [join(evdir, 'live-probes.sh'), ...args, outdir], {
      env,
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
  // Port 9 (discard) is closed on loopback, so the connection is refused
  // immediately and nothing leaves the machine.
  const url = c.unreachable ? 'http://127.0.0.1:9' : `http://127.0.0.1:${port}`;
  for (const mode of ['--anon', '--auth']) {
    const ledger = join(scratch, `ledger-${c.name}${mode}`);
    writeFileSync(ledger, '');
    const { code, text } = await runProbe(mode, url, ledger);
    const aborted = text.includes(ABORT_LINE);
    const reasonOk = c.positive ? true : text.includes(`reason: ${c.reason}`);
    const probePassLines = (text.match(/^PASS {2}/gm) ?? []).length;
    const probeLines = (text.match(/^(PASS|FAIL) {2}/gm) ?? []).length;
    const expectExit = c.positive ? c.expectExit[mode] : 4;
    // A negative case must abort having emitted NO probe line of any
    // classification (REVIEW-017 finding 2: accepting on zero PASS lines let a
    // FAIL probe run before the abort and still green). probe() in
    // rls-probes.mjs emits exactly one `PASS  `/`FAIL  ` line per probe, so
    // zero such lines is what "before any probe runs" means here. The positive
    // case must NOT abort and must have run probes — that is what "continued"
    // means.
    const shapeOk = c.positive ? !aborted && probeLines > 0 : aborted && probeLines === 0;
    const ok = code === expectExit && reasonOk && shapeOk;
    if (!ok) violations += 1;
    rows.push({ c, mode, code, expectExit, aborted, reasonOk, probePassLines, probeLines, ok });
  }
}

server.close();

// --- section 2: control-variable containment ---------------------------------
// Each wrapper case also pins a loopback URL and a synthetic key in the child
// environment, so that even a regression that removed the guard could not
// reach a real project or fall back to the repo-root .env.
const SAFE_ENV = {
  EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SYNTHETIC_KEY,
};
const WRAPPER_CASES = [
  {
    name: 'leak-var-default-mode',
    note: 'REDACTION_CONTROL_LEAK present, default (production) mode',
    args: [],
    setVar: 'REDACTION_CONTROL_LEAK',
    expectExit: 5,
    expectRefusal: true,
  },
  {
    name: 'retired-var-default-mode',
    note: 'SETTINGS_PREFLIGHT_CONTROL present — the name is retired from the producers, and a stale ambient value must still surface as a refusal',
    args: [],
    setVar: 'SETTINGS_PREFLIGHT_CONTROL',
    expectExit: 5,
    expectRefusal: true,
  },
  {
    name: 'leak-var-control-mode',
    note: 'REDACTION_CONTROL_LEAK present, --control mode — the guard is not a courtesy the production path alone gets',
    args: ['--control'],
    setVar: 'REDACTION_CONTROL_LEAK',
    expectExit: 5,
    expectRefusal: true,
  },
  {
    name: 'clean-env-control-mode',
    note: 'POSITIVE CONTROL — no control variable in the inherited environment, --control mode: the guard must ADMIT the run and let it complete, or the three refusals above would prove only that the wrapper never starts',
    args: ['--control'],
    setVar: null,
    expectExit: 0,
    expectRefusal: false,
    expectFile: 'redaction-control.txt',
  },
];

const wrapperRows = [];
for (const w of WRAPPER_CASES) {
  const outdir = join(scratch, `wrapper-${w.name}`);
  const env = cleanEnv(SAFE_ENV);
  if (w.setVar) env[w.setVar] = '1';
  const { code, text } = await runWrapper(w.args, env, outdir);
  const refused = text.includes('REFUSED: control variable(s) present in the inherited environment');
  // A refusal must happen before anything is written: the output directory the
  // wrapper was handed must not even exist.
  const wroteNothing = !existsSync(outdir) || readdirSync(outdir).length === 0;
  const fileOk = w.expectFile ? existsSync(join(outdir, w.expectFile)) : wroteNothing;
  const ok = code === w.expectExit && refused === w.expectRefusal && fileOk;
  if (!ok) violations += 1;
  wrapperRows.push({ w, code, refused, fileOk, ok });
}

rmSync(scratch, { recursive: true, force: true });

console.log('# Live-probe fail-closed controls — permanent (REVIEW-015 finding 2,');
console.log('# REVIEW-016 finding 2, REVIEW-017 findings 2 and 4). The settings-preflight');
console.log('# success hook is gone from both producers; the contained synthetic redaction');
console.log('# hook and live-probes.sh --control remain, and section 2 is what shows an');
console.log('# ambient control variable cannot switch a production run. Every case below');
console.log('# drives the REAL production entry points with no control variable set.');
console.log('# Loopback only — 127.0.0.1 on an ephemeral port, 127.0.0.1:9 for the');
console.log('# unreachable case, a runtime-assembled synthetic key, and children that read');
console.log('# their URL and key from the environment and never from .env. No Supabase');
console.log('# project, credential, or network host is contacted.');
console.log('#');
console.log('# section 1 — the auth-settings preflight aborts before any probe on every');
console.log('# unusable /auth/v1/settings response, in BOTH production modes, and lets a');
console.log('# well-formed one through. The defect under test: a settings read that failed');
console.log('# was reported as HTTP 0 with undefined fields and the run continued to');
console.log('# 46 PASS / exit 0. The `unreachable` case reproduces that exact input. Each');
console.log('# case runs --anon AND --auth, so the auth mode\'s own preflight call is');
console.log('# exercised; four cases isolate one boolean guard from the other, so neither');
console.log('# guard can be deleted without turning cases red.');
for (const r of rows) {
  console.log('');
  console.log(`case: ${r.c.name} [${r.mode}]`);
  console.log(`what it feeds the preflight: ${r.c.note}`);
  console.log(`child exit code: ${r.code} (${r.expectExit} required)`);
  console.log(
    `preflight verdict: ${r.aborted ? 'ABORTED' : 'CONTINUED'} ` +
      `(${r.c.positive ? 'CONTINUED' : 'ABORTED'} required)`,
  );
  if (!r.c.positive) {
    console.log(`recorded reason matches "${r.c.reason}": ${r.reasonOk ? 'yes' : 'no'} (yes required)`);
    console.log(
      `probe lines emitted, PASS or FAIL: ${r.probeLines} (0 required — ` +
        `${r.probePassLines} of them PASS)`,
    );
  } else {
    console.log(`probe lines emitted after the preflight: ${r.probeLines} (> 0 required — this is what "continued" means)`);
  }
  console.log(`case verdict: ${r.ok ? 'as pinned' : 'VIOLATION'}`);
}

console.log('');
console.log('# section 2 — live-probes.sh refuses to start when a control variable is');
console.log('# present in its inherited environment. The defect under test: an ambient');
console.log('# control variable was an undeclared switch on a production run, because the');
console.log('# wrapper passes its whole environment to the child and reads child 0 as');
console.log('# success. The wrapper must ABORT, not clear the variable and continue.');
for (const r of wrapperRows) {
  console.log('');
  console.log(`case: ${r.w.name}`);
  console.log(`what it hands the wrapper: ${r.w.note}`);
  console.log(`wrapper exit code: ${r.code} (${r.w.expectExit} required)`);
  console.log(
    `refusal message printed: ${r.refused ? 'yes' : 'no'} (${r.w.expectRefusal ? 'yes' : 'no'} required)`,
  );
  console.log(
    r.w.expectFile
      ? `run completed and wrote ${r.w.expectFile}: ${r.fileOk ? 'yes' : 'no'} (yes required)`
      : `handed output directory left untouched: ${r.fileOk ? 'yes' : 'no'} (yes required — the refusal precedes every .env/credential read, every write, and any network contact; it does NOT precede the wrapper's own directory resolution and git rev-parse — REVIEW-017 finding 4)`,
  );
  console.log(`case verdict: ${r.ok ? 'as pinned' : 'VIOLATION'}`);
}

console.log('');
console.log(`section 1 cases run: ${rows.length} (9 negative + 1 positive, each in both production modes)`);
console.log(`section 2 cases run: ${wrapperRows.length} (3 refusals + 1 positive)`);
console.log(`violations: ${violations} (0 required)`);
console.log('--- enforced: every preflight case exits exactly as pinned; the nine red');
console.log('--- paths abort in both modes with their exact recorded reason and emit no');
console.log('--- probe line of ANY classification, PASS or FAIL (REVIEW-017 finding 2);');
console.log('--- the well-formed case continues into probes in both modes; the wrapper');
console.log('--- refuses the ambient control variables in the three variable/mode pairs');
console.log('--- run above — not every pair: SETTINGS_PREFLIGHT_CONTROL under --control');
console.log('--- is NOT exercised here (REVIEW-017 finding 3) — without touching the');
console.log('--- output directory, and still admits a clean');
console.log('--- environment — or capture.sh exits 1 (fail closed) ---');
process.exit(violations === 0 ? 0 : 1);
