#!/usr/bin/env node
/**
 * rls-probes.mjs — live probes against the applied Unit C schema on staging
 * (CTRL-004 Phase B). Two modes, two transcripts:
 *
 *   --anon  anon-probes.txt: requests with NO session — the publishable key
 *           presented exactly as a sessionless client presents it (apikey +
 *           bearer, the supabase-js default). Expected: denial on every REST
 *           and storage surface (anon holds no table grants; storage shows
 *           zero-row visibility / not-found obfuscation / RLS insert
 *           rejection). The exact response shapes are recorded as the
 *           contract, and the summary names the exact subset: the two
 *           service-context probes (auth health, auth settings) prove
 *           reachability and run-time config, not denial — the
 *           denial/invisibility count is printed separately.
 *   --auth  auth-probes.txt: creates up to two disposable, clearly
 *           namespaced test users via the publishable-key signup path
 *           (identifiers documented in README.md; the generated passwords
 *           exist only in this process's memory), then proves signup
 *           provisioning, owner CRUD on own rows across all three tables,
 *           the full per-table per-operation cross-user grid (SELECT/
 *           UPDATE/DELETE/INSERT × all three tables, including the
 *           transcripts WITH CHECK isolation probe, distinct from the
 *           composite-FK case), storage {user_id}/ scoping, and
 *           REST-row/type-declaration consistency.
 *
 * Every response oracle pins a single exact expected HTTP status — plus the
 * single exact error code where the response carries one (REVIEW-012
 * finding 5: the earlier helper accepted 401 or 403, so a neighboring
 * status could earn a PASS label that named the other).
 *
 * Requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * in the environment (owner-held staging values; never committed), and
 * REDACTION_LEDGER (set by live-probes.sh): every registered secret is also
 * appended to that 0600 scratch ledger so redaction-gate.mjs can scan the
 * exact written transcript bytes after this process exits. Refusing to run
 * without the ledger keeps the post-write gate structurally unavoidable.
 *
 * Redaction is layered (REVIEW-011 finding 3 rebuilt the outer layer):
 * — at source (003a pattern, extended): URL, host, project ref, key,
 *   generated passwords, and every issued access/refresh token are
 *   registered and replaced before anything is buffered; auth-endpoint
 *   responses are additionally printed as reduced summaries, never as raw
 *   bodies; a generic JWT-shape sweep runs over every line; and an
 *   in-process gate over the buffered transcript suppresses the output and
 *   exits 1 if any registered value or JWT shape survives it. This layer
 *   covers only what flows through out().
 * — post-write (the totality guarantee): live-probes.sh commits this
 *   process's ENTIRE stdout/stderr to the transcript file, so
 *   redaction-gate.mjs then scans that file's exact final bytes against the
 *   ledger + JWT shape, deleting the file and failing the run on any
 *   residual. See redaction-gate.mjs and redaction-control.txt (the planted
 *   direct-stdout-leak positive control).
 *
 * Exit: 0 = every probe in the mode passed; 1 = a probe failed or the
 * redaction totality gate tripped; 2 = environment not configured;
 * 3 = (--auth only) no usable session was obtainable (e.g. email
 * confirmation required) — the authenticated probes are NOT RUN, the exact
 * refusal shapes are recorded, and the anon-denial evidence stands
 * separately.
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { extractTypesShape, repoRoot } from './types-shape.mjs';

const MODE = process.argv[2];
if (MODE !== '--anon' && MODE !== '--auth') {
  console.log('usage: node rls-probes.mjs --anon | --auth   (run via live-probes.sh)');
  process.exit(2);
}
const RAW_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!RAW_URL || !KEY) {
  console.log(
    'NOT CONFIGURED: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  );
  process.exit(2);
}
const LEDGER = process.env.REDACTION_LEDGER;
if (!LEDGER) {
  console.log(
    'NOT CONFIGURED: REDACTION_LEDGER must point at the run ledger (live-probes.sh sets it) — ' +
      'without it the post-write file-byte gate cannot scan, so this refuses to run (fail closed)',
  );
  process.exit(2);
}
const BASE = RAW_URL.replace(/\/+$/, '');

// --- redaction at source ----------------------------------------------------
const secrets = new Map();
function registerSecret(raw, placeholder) {
  if (raw && typeof raw === 'string' && raw.length >= 8) {
    secrets.set(raw, placeholder);
    // Mirror every registered value into the run ledger (0600, scratch,
    // deleted by live-probes.sh) so the post-write gate scans the same set.
    appendFileSync(LEDGER, `${raw}\n`);
  }
}
registerSecret(RAW_URL, '<staging-url>');
registerSecret(BASE, '<staging-url>');
registerSecret(KEY, '<publishable-key>');
let host = '';
try {
  host = new URL(BASE).host;
} catch {
  host = '';
}
if (host) {
  registerSecret(host, '<staging-host>');
  const ref = host.split('.')[0];
  if (ref && ref.length >= 16) registerSecret(ref, '<project-ref>');
}
const jwtShape = () => /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;

function redact(text) {
  let t = String(text);
  for (const [raw, placeholder] of [...secrets.entries()].sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    t = t.split(raw).join(placeholder);
  }
  return t.replace(jwtShape(), '<jwt-redacted>');
}

// --- buffered, redacted transcript -------------------------------------------
const lines = [];
function out(s = '') {
  lines.push(redact(s));
}
let passCount = 0;
let failCount = 0;
// Context probes (kind 'context') prove reachability/run-time config, not
// denial; the anon summary counts them separately (REVIEW-012 finding 5:
// 11 total PASS was labeled 11 denials — the denial/invisibility subset is 9).
let contextPass = 0;
let contextFail = 0;
function probe(name, pass, detail, kind) {
  if (pass) passCount += 1;
  else failCount += 1;
  if (kind === 'context') {
    if (pass) contextPass += 1;
    else contextFail += 1;
  }
  out(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  out(`      ${detail}`);
}
function finish(code) {
  const text = lines.join('\n');
  const residual =
    [...secrets.keys()].filter((raw) => text.includes(raw)).length +
    (jwtShape().test(text) ? 1 : 0);
  if (residual > 0) {
    console.log(
      `FATAL: redaction totality gate tripped (${residual} residual class(es)); transcript suppressed`,
    );
    process.exit(1);
  }
  console.log(text);
  console.log(
    `redaction totality gate: 0 residual occurrences (${secrets.size} registered values + JWT sweep)`,
  );
  if (MODE === '--anon') {
    console.log(
      `--- anon subset: ${passCount - contextPass} denial/invisibility PASS + ` +
        `${contextPass} service-context PASS (auth health reachability, auth settings record) ` +
        `= ${passCount} PASS total ---`,
    );
  }
  console.log(`--- probes: ${passCount} PASS, ${failCount} FAIL ---`);
  process.exit(code);
}

// --- HTTP helper --------------------------------------------------------------
async function req(method, path, { bearer, json, bodyRaw, headers = {} } = {}) {
  const h = {
    apikey: KEY,
    // A sessionless client presents the publishable key as its bearer, exactly
    // as supabase-js does; a session presents the user's access token instead.
    authorization: `Bearer ${bearer ?? KEY}`,
    ...headers,
  };
  let body;
  if (json !== undefined) {
    h['content-type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (bodyRaw !== undefined) {
    h['content-type'] = 'application/octet-stream';
    body = bodyRaw;
  }
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: h,
      body,
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return { status: 0, text: `request failed: ${String(e)}`, json: undefined };
  }
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  return { status: res.status, text, json: parsed };
}

function show(r, cap = 400) {
  const body = r.json !== undefined ? JSON.stringify(r.json) : r.text;
  const s = body.length > cap ? `${body.slice(0, cap)}…(truncated)` : body;
  return `HTTP ${r.status} ${s}`;
}

// One exact expected status + one exact expected code, per probe (REVIEW-012
// finding 5 — the prior helper accepted 401 or 403). anon REST denials are
// permission errors ahead of RLS (anon holds no grants): exactly 401/42501.
// Authenticated WITH CHECK denials are RLS violations behind valid grants:
// exactly 403/42501. Storage denials carry the storage-api code field:
// exactly 400/NoSuchKey (not-found obfuscation) or 400/AccessDenied (RLS).
function deniedExact(r, status, code) {
  return r.status === status && !!r.json && r.json.code === code;
}

function sameSet(a, b) {
  return a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');
}

const ZERO_UUID = '00000000-0000-4000-8000-000000000000';
const TABLES = ['profiles', 'captures', 'transcripts'];
function anonInsertBody(table) {
  if (table === 'profiles') return { id: ZERO_UUID };
  if (table === 'captures') return { user_id: ZERO_UUID };
  return { capture_id: ZERO_UUID, user_id: ZERO_UUID, text: 'anon probe' };
}

async function readAuthSettings() {
  const settings = await req('GET', '/auth/v1/settings');
  const sj = settings.json ?? {};
  return {
    settings,
    line:
      `HTTP ${settings.status} disable_signup=${JSON.stringify(sj.disable_signup)} ` +
      `mailer_autoconfirm=${JSON.stringify(sj.mailer_autoconfirm)} ` +
      `external.email=${JSON.stringify(sj.external ? sj.external.email : undefined)}`,
    disableSignup: sj.disable_signup === true,
  };
}

// --- anon mode -----------------------------------------------------------------
async function anonMode() {
  // REVIEW-011 finding 3 positive control: with the env flag set AND a
  // synthetic key (the marker guard makes this hook incapable of leaking a
  // real credential), write the raw key straight to stdout — bypassing
  // out()/redact() and the in-process gate — reproducing the exact leakage
  // class the review demonstrated. The post-write file-byte gate must go
  // red on it; redaction-control.txt is the committed proof that it does.
  if (process.env.REDACTION_CONTROL_LEAK === '1' && KEY.includes('SYNTHETIC')) {
    console.log(`control-leak: ${KEY}`);
  }
  out('# Anon-path probes: no session — the publishable key presented sessionless.');
  out('# Expected: denial everywhere. Exact response shapes below are the recorded');
  out('# contract for the applied Unit C schema (anon holds no table grants; the');
  out('# storage policies are TO authenticated only).');
  out();
  const health = await req('GET', '/auth/v1/health');
  probe(
    'auth service reachable (service-context: proves denials below are policy, not outage)',
    health.status === 200,
    show(health),
    'context',
  );
  const auth = await readAuthSettings();
  probe(
    'auth settings readable (service-context: records the config the authenticated path depends on)',
    auth.settings.status === 200,
    auth.line,
    'context',
  );
  out();
  for (const t of TABLES) {
    const sel = await req('GET', `/rest/v1/${t}?select=*`);
    probe(
      `anon REST SELECT ${t}: denied, exactly HTTP 401 code 42501 (insufficient_privilege)`,
      deniedExact(sel, 401, '42501'),
      show(sel),
    );
    const ins = await req('POST', `/rest/v1/${t}`, {
      json: anonInsertBody(t),
      headers: { prefer: 'return=representation' },
    });
    probe(
      `anon REST INSERT ${t}: denied, exactly HTTP 401 code 42501 (insufficient_privilege)`,
      deniedExact(ins, 401, '42501'),
      show(ins),
    );
  }
  out();
  const dl = await req('GET', `/storage/v1/object/captures-audio/${ZERO_UUID}/anon-probe.bin`);
  probe(
    'anon storage download: denied, exactly HTTP 400 code NoSuchKey (not-found obfuscation, no bytes served)',
    deniedExact(dl, 400, 'NoSuchKey'),
    show(dl),
  );
  const ul = await req('POST', `/storage/v1/object/captures-audio/${ZERO_UUID}/anon-upload.bin`, {
    bodyRaw: 'anon probe bytes',
  });
  probe(
    'anon storage upload: denied, exactly HTTP 400 code AccessDenied (no INSERT policy admits anon)',
    deniedExact(ul, 400, 'AccessDenied'),
    show(ul),
  );
  const ls = await req('POST', '/storage/v1/object/list/captures-audio', {
    json: { prefix: '', limit: 10 },
  });
  probe(
    'anon storage list: sees zero objects, exactly HTTP 200 empty array (RLS row invisibility)',
    ls.status === 200 && Array.isArray(ls.json) && ls.json.length === 0,
    show(ls),
  );
  finish(failCount ? 1 : 0);
}

// --- auth mode -------------------------------------------------------------------
function authSummary(r) {
  const j = r.json ?? {};
  const user = j.user ?? (j.id ? j : {});
  const code = j.error_code ?? j.code ?? j.error;
  const msg = j.msg ?? j.message ?? j.error_description ?? '';
  const err = code || msg ? ` error=${code ?? '<none>'} msg=${msg}` : '';
  return (
    `HTTP ${r.status} user_id=${user.id ?? '<none>'} session=${j.access_token ? 'yes' : 'no'} ` +
    `confirmation_sent_at=${user.confirmation_sent_at ?? '<none>'} ` +
    `identities=${Array.isArray(user.identities) ? user.identities.length : '<n/a>'}` +
    err
  );
}

// Fix-cycle-2 namespace (REVIEW-012 fix dispatch): fresh disposable users,
// distinct from the deleted ctrl004b-*/ctrl004c-* pairs, exactly two,
// owner-deleted after the run.
const USERS = [
  { tag: 'user1', email: 'ctrl004d-user1@example.com' },
  { tag: 'user2', email: 'ctrl004d-user2@example.com' },
];

async function obtainSession(u) {
  const password = randomBytes(18).toString('base64url');
  registerSecret(password, `<password-${u.tag}>`);
  const su = await req('POST', '/auth/v1/signup', { json: { email: u.email, password } });
  const sj = su.json ?? {};
  if (sj.access_token) registerSecret(sj.access_token, `<access-token-${u.tag}>`);
  if (sj.refresh_token) registerSecret(sj.refresh_token, `<refresh-token-${u.tag}>`);
  const uid = (sj.user ? sj.user.id : undefined) ?? sj.id ?? null;
  probe(
    `signup ${u.tag} (${u.email}): accepted via the publishable-key signup path (exactly HTTP 200)`,
    su.status === 200 && Boolean(uid),
    authSummary(su),
  );
  let token = sj.access_token ?? null;
  if (uid && !token) {
    const gr = await req('POST', '/auth/v1/token?grant_type=password', {
      json: { email: u.email, password },
    });
    const gj = gr.json ?? {};
    if (gj.access_token) {
      registerSecret(gj.access_token, `<access-token-${u.tag}>`);
      if (gj.refresh_token) registerSecret(gj.refresh_token, `<refresh-token-${u.tag}>`);
      token = gj.access_token;
      out(`      note: session via password grant — ${authSummary(gr)}`);
    } else {
      out(`      password grant refused — ${authSummary(gr)}`);
    }
  }
  return { ...u, uid, token };
}

async function authMode() {
  out('# Authenticated-path probes: two disposable, namespaced test users created via');
  out('# the publishable-key signup path (README.md documents the identifiers and the');
  out('# owner-class cleanup). Auth responses are reduced summaries, never raw bodies;');
  out('# every issued token and generated password is redaction-registered.');
  out();
  const auth = await readAuthSettings();
  out(`auth settings: ${auth.line}`);
  out();
  if (auth.disableSignup) {
    out('AUTHENTICATED PROBES NOT RUN — staging auth config disables signups, so the');
    out('publishable-key signup path (the only authorized user-creation path) cannot');
    out('produce a session. Anon-denial evidence stands separately in anon-probes.txt.');
    finish(3);
  }
  const u1 = await obtainSession(USERS[0]);
  const u2 = await obtainSession(USERS[1]);
  if (!u1.token || !u2.token || !u1.uid || !u2.uid) {
    out();
    out('AUTHENTICATED PROBES NOT RUN — no usable session for at least one test user;');
    out('the exact refusal shapes are recorded above (typical cause: email confirmation');
    out('required, which this path cannot complete for a non-deliverable namespaced');
    out('address). Anon-denial evidence stands separately in anon-probes.txt.');
    finish(3);
  }

  const shape = extractTypesShape(
    readFileSync(join(repoRoot(), 'src', 'lib', 'database.types.ts'), 'utf8'),
  );

  out();
  out('## Signup provisioning + owner visibility (profiles)');
  const p1 = await req('GET', '/rest/v1/profiles?select=*', { bearer: u1.token });
  probe(
    'user1 sees exactly the one provisioned own profiles row (trigger ran; SELECT-own admits; user2 row invisible)',
    p1.status === 200 && Array.isArray(p1.json) && p1.json.length === 1 && p1.json[0].id === u1.uid,
    show(p1),
  );
  const p2 = await req('GET', '/rest/v1/profiles?select=*', { bearer: u2.token });
  probe(
    'user2 sees exactly the one provisioned own profiles row',
    p2.status === 200 && Array.isArray(p2.json) && p2.json.length === 1 && p2.json[0].id === u2.uid,
    show(p2),
  );
  probe(
    'profiles REST row keys === types-declared Row columns (probe consistency)',
    Boolean(p1.json && p1.json[0]) &&
      sameSet(Object.keys(p1.json[0]), shape.get('profiles') ?? []),
    `row keys: ${p1.json && p1.json[0] ? Object.keys(p1.json[0]).sort().join(', ') : '<none>'}`,
  );

  out();
  out('## Owner CRUD — profiles (read proven above; update, delete, insert-back)');
  const pu = await req('PATCH', `/rest/v1/profiles?id=eq.${u1.uid}`, {
    bearer: u1.token,
    json: { display_name: 'ctrl004d user1' },
    headers: { prefer: 'return=representation' },
  });
  const puRow = Array.isArray(pu.json) ? pu.json[0] : undefined;
  probe(
    'profiles UPDATE own: allowed, and the updated_at trigger fired (updated_at moved off created_at)',
    pu.status === 200 &&
      Boolean(puRow) &&
      puRow.display_name === 'ctrl004d user1' &&
      puRow.updated_at !== puRow.created_at,
    show(pu),
  );
  const pd = await req('DELETE', `/rest/v1/profiles?id=eq.${u1.uid}`, {
    bearer: u1.token,
    headers: { prefer: 'return=representation' },
  });
  probe(
    'profiles DELETE own: allowed (exactly one row returned)',
    pd.status === 200 && Array.isArray(pd.json) && pd.json.length === 1,
    show(pd),
  );
  const pi = await req('POST', '/rest/v1/profiles', {
    bearer: u1.token,
    json: { id: u1.uid, display_name: 'ctrl004d user1' },
    headers: { prefer: 'return=representation' },
  });
  probe(
    "profiles INSERT own: allowed, locale defaults to 'en'",
    pi.status === 201 &&
      Boolean(pi.json && pi.json[0]) &&
      pi.json[0].id === u1.uid &&
      pi.json[0].locale === 'en',
    show(pi),
  );

  out();
  out('## Owner CRUD — captures');
  const ca = await req('POST', '/rest/v1/captures', {
    bearer: u1.token,
    json: { user_id: u1.uid, duration_ms: 1234, audio_path: `${u1.uid}/probe.bin` },
    headers: { prefer: 'return=representation' },
  });
  const capA = ca.json && ca.json[0] ? ca.json[0].id : undefined;
  probe(
    "captures INSERT own: allowed, status defaults to 'recorded'",
    ca.status === 201 && Boolean(capA) && ca.json[0].status === 'recorded',
    show(ca),
  );
  const cb = await req('POST', '/rest/v1/captures', {
    bearer: u1.token,
    json: { user_id: u1.uid },
    headers: { prefer: 'return=representation' },
  });
  const capB = cb.json && cb.json[0] ? cb.json[0].id : undefined;
  probe(
    'captures INSERT own (second row, for the delete probe): allowed',
    cb.status === 201 && Boolean(capB),
    show(cb),
  );
  const cs = await req('GET', '/rest/v1/captures?select=*&order=created_at.asc', {
    bearer: u1.token,
  });
  probe(
    'captures SELECT own: exactly the two own rows, every user_id = own uid',
    cs.status === 200 &&
      Array.isArray(cs.json) &&
      cs.json.length === 2 &&
      cs.json.every((r) => r.user_id === u1.uid),
    show(cs),
  );
  probe(
    'captures REST row keys === types-declared Row columns (probe consistency)',
    Boolean(cs.json && cs.json[0]) &&
      sameSet(Object.keys(cs.json[0]), shape.get('captures') ?? []),
    `row keys: ${cs.json && cs.json[0] ? Object.keys(cs.json[0]).sort().join(', ') : '<none>'}`,
  );
  const cu = await req('PATCH', `/rest/v1/captures?id=eq.${capA}`, {
    bearer: u1.token,
    json: { status: 'ready' },
    headers: { prefer: 'return=representation' },
  });
  const cuRow = Array.isArray(cu.json) ? cu.json[0] : undefined;
  probe(
    "captures UPDATE own: allowed (status recorded -> 'ready'), updated_at trigger fired",
    cu.status === 200 &&
      Boolean(cuRow) &&
      cuRow.status === 'ready' &&
      cuRow.updated_at !== cuRow.created_at,
    show(cu),
  );
  const cd = await req('DELETE', `/rest/v1/captures?id=eq.${capB}`, {
    bearer: u1.token,
    headers: { prefer: 'return=representation' },
  });
  probe(
    'captures DELETE own: allowed (exactly one row returned)',
    cd.status === 200 && Array.isArray(cd.json) && cd.json.length === 1,
    show(cd),
  );

  out();
  out('## Owner CRUD — transcripts (composite-FK child of capture A)');
  const t1 = await req('POST', '/rest/v1/transcripts', {
    bearer: u1.token,
    json: {
      capture_id: capA,
      user_id: u1.uid,
      text: 'ctrl004d probe transcript',
      language: 'en',
      provider: 'probe',
    },
    headers: { prefer: 'return=representation' },
  });
  const tid1 = t1.json && t1.json[0] ? t1.json[0].id : undefined;
  probe(
    'transcripts INSERT own (consistent composite FK): allowed',
    t1.status === 201 && Boolean(tid1),
    show(t1),
  );
  const t2 = await req('POST', '/rest/v1/transcripts', {
    bearer: u1.token,
    json: { capture_id: capA, user_id: u1.uid, text: 'disposable second transcript' },
    headers: { prefer: 'return=representation' },
  });
  const tid2 = t2.json && t2.json[0] ? t2.json[0].id : undefined;
  probe(
    'transcripts INSERT own (second row, for the delete probe): allowed',
    t2.status === 201 && Boolean(tid2),
    show(t2),
  );
  const ts = await req('GET', '/rest/v1/transcripts?select=*', { bearer: u1.token });
  probe(
    'transcripts SELECT own: exactly the two own rows',
    ts.status === 200 &&
      Array.isArray(ts.json) &&
      ts.json.length === 2 &&
      ts.json.every((r) => r.user_id === u1.uid),
    show(ts),
  );
  probe(
    'transcripts REST row keys === types-declared Row columns (probe consistency)',
    Boolean(ts.json && ts.json[0]) &&
      sameSet(Object.keys(ts.json[0]), shape.get('transcripts') ?? []),
    `row keys: ${ts.json && ts.json[0] ? Object.keys(ts.json[0]).sort().join(', ') : '<none>'}`,
  );
  const tu = await req('PATCH', `/rest/v1/transcripts?id=eq.${tid1}`, {
    bearer: u1.token,
    json: { text: 'ctrl004d probe transcript (updated)' },
    headers: { prefer: 'return=representation' },
  });
  probe(
    'transcripts UPDATE own: allowed',
    tu.status === 200 &&
      Boolean(tu.json && tu.json[0]) &&
      String(tu.json[0].text).endsWith('(updated)'),
    show(tu),
  );
  const td = await req('DELETE', `/rest/v1/transcripts?id=eq.${tid2}`, {
    bearer: u1.token,
    headers: { prefer: 'return=representation' },
  });
  probe(
    'transcripts DELETE own: allowed (exactly one row returned)',
    td.status === 200 && Array.isArray(td.json) && td.json.length === 1,
    show(td),
  );

  out();
  out('## Cross-user denial — user2 (attacker session) against user1 (victim) rows.');
  out('## The full per-table, per-operation grid: SELECT/UPDATE/DELETE on every');
  out('## table against victim rows, INSERT impersonation on every table, plus the');
  out('## transcripts WITH CHECK isolation probe (distinct from the composite-FK case).');
  const xs1 = await req('GET', `/rest/v1/profiles?select=*&id=eq.${u1.uid}`, {
    bearer: u2.token,
  });
  probe(
    'cross-user SELECT profiles: RLS-invisible (200, zero rows)',
    xs1.status === 200 && Array.isArray(xs1.json) && xs1.json.length === 0,
    show(xs1),
  );
  const xs2 = await req('GET', `/rest/v1/captures?select=*&user_id=eq.${u1.uid}`, {
    bearer: u2.token,
  });
  probe(
    'cross-user SELECT captures: RLS-invisible (200, zero rows)',
    xs2.status === 200 && Array.isArray(xs2.json) && xs2.json.length === 0,
    show(xs2),
  );
  const xs3 = await req('GET', `/rest/v1/transcripts?select=*&user_id=eq.${u1.uid}`, {
    bearer: u2.token,
  });
  probe(
    'cross-user SELECT transcripts: RLS-invisible (200, zero rows)',
    xs3.status === 200 && Array.isArray(xs3.json) && xs3.json.length === 0,
    show(xs3),
  );
  const xup = await req('PATCH', `/rest/v1/profiles?id=eq.${u1.uid}`, {
    bearer: u2.token,
    json: { display_name: 'hijacked' },
    headers: { prefer: 'return=representation' },
  });
  probe(
    'cross-user UPDATE profiles: no-op (zero rows affected)',
    xup.status === 200 && Array.isArray(xup.json) && xup.json.length === 0,
    show(xup),
  );
  const xuc = await req('PATCH', `/rest/v1/captures?id=eq.${capA}`, {
    bearer: u2.token,
    json: { status: 'failed' },
    headers: { prefer: 'return=representation' },
  });
  probe(
    'cross-user UPDATE captures: no-op (zero rows affected)',
    xuc.status === 200 && Array.isArray(xuc.json) && xuc.json.length === 0,
    show(xuc),
  );
  const xut = await req('PATCH', `/rest/v1/transcripts?id=eq.${tid1}`, {
    bearer: u2.token,
    json: { text: 'hijacked' },
    headers: { prefer: 'return=representation' },
  });
  probe(
    'cross-user UPDATE transcripts: no-op (zero rows affected)',
    xut.status === 200 && Array.isArray(xut.json) && xut.json.length === 0,
    show(xut),
  );
  const xdp = await req('DELETE', `/rest/v1/profiles?id=eq.${u1.uid}`, {
    bearer: u2.token,
    headers: { prefer: 'return=representation' },
  });
  probe(
    'cross-user DELETE profiles: no-op (zero rows affected)',
    xdp.status === 200 && Array.isArray(xdp.json) && xdp.json.length === 0,
    show(xdp),
  );
  const xdc = await req('DELETE', `/rest/v1/captures?id=eq.${capA}`, {
    bearer: u2.token,
    headers: { prefer: 'return=representation' },
  });
  probe(
    'cross-user DELETE captures: no-op (zero rows affected)',
    xdc.status === 200 && Array.isArray(xdc.json) && xdc.json.length === 0,
    show(xdc),
  );
  const xdt = await req('DELETE', `/rest/v1/transcripts?id=eq.${tid1}`, {
    bearer: u2.token,
    headers: { prefer: 'return=representation' },
  });
  probe(
    'cross-user DELETE transcripts: no-op (zero rows affected)',
    xdt.status === 200 && Array.isArray(xdt.json) && xdt.json.length === 0,
    show(xdt),
  );
  const xi1 = await req('POST', '/rest/v1/captures', {
    bearer: u2.token,
    json: { user_id: u1.uid },
    headers: { prefer: 'return=representation' },
  });
  probe(
    'cross-user INSERT captures (user_id = user1): denied by WITH CHECK, exactly HTTP 403 code 42501',
    deniedExact(xi1, 403, '42501'),
    show(xi1),
  );
  const xi2 = await req('POST', '/rest/v1/profiles', {
    bearer: u2.token,
    json: { id: u1.uid },
    headers: { prefer: 'return=representation' },
  });
  probe(
    'cross-user INSERT profiles (id = user1): denied by WITH CHECK, exactly HTTP 403 code 42501',
    deniedExact(xi2, 403, '42501'),
    show(xi2),
  );
  const xi3 = await req('POST', '/rest/v1/transcripts', {
    bearer: u2.token,
    json: { capture_id: capA, user_id: u2.uid, text: 'hijack attempt' },
    headers: { prefer: 'return=representation' },
  });
  probe(
    'cross-user INSERT transcripts onto user1 capture (own user_id — WITH CHECK satisfied): composite FK rejects, exactly HTTP 409 code 23503 — the live user_id-consistency guarantee',
    deniedExact(xi3, 409, '23503'),
    show(xi3),
  );
  // The isolation probe (REVIEW-011 finding 5): the victim's own
  // (capture_id, user_id) pair EXISTS in captures, so the composite FK
  // cannot be the rejector here — only the transcripts INSERT policy's
  // WITH CHECK ((select auth.uid()) = user_id) can deny it. A 42501,
  // distinct from the 23503 above, proves the WITH CHECK denial live.
  const xi4 = await req('POST', '/rest/v1/transcripts', {
    bearer: u2.token,
    json: { capture_id: capA, user_id: u1.uid, text: 'hijack attempt (forged owner)' },
    headers: { prefer: 'return=representation' },
  });
  probe(
    "cross-user INSERT transcripts with the victim's own valid (capture_id, user_id) pair: denied by RLS WITH CHECK, exactly HTTP 403 code 42501, distinct from the FK case",
    deniedExact(xi4, 403, '42501'),
    show(xi4),
  );
  const rc1 = await req('GET', `/rest/v1/profiles?select=id,display_name&id=eq.${u1.uid}`, {
    bearer: u1.token,
  });
  probe(
    'cross-user write attempts were true no-ops: user1 profile present, display_name unchanged',
    rc1.status === 200 &&
      Boolean(rc1.json && rc1.json[0]) &&
      rc1.json[0].display_name === 'ctrl004d user1',
    show(rc1),
  );
  const rc2 = await req('GET', `/rest/v1/captures?select=id,status&id=eq.${capA}`, {
    bearer: u1.token,
  });
  probe(
    "cross-user write attempts were true no-ops: capture A present, still status 'ready'",
    rc2.status === 200 && Boolean(rc2.json && rc2.json[0]) && rc2.json[0].status === 'ready',
    show(rc2),
  );
  const rc3 = await req('GET', `/rest/v1/transcripts?select=id,text&id=eq.${tid1}`, {
    bearer: u1.token,
  });
  probe(
    'cross-user write attempts were true no-ops: transcript 1 present, text unchanged',
    rc3.status === 200 &&
      Array.isArray(rc3.json) &&
      rc3.json.length === 1 &&
      String(rc3.json[0].text).endsWith('(updated)'),
    show(rc3),
  );

  out();
  out('## Storage — captures-audio, {user_id}/ scoping');
  const AUDIO = 'ctrl004d probe audio bytes';
  const s1 = await req('POST', `/storage/v1/object/captures-audio/${u1.uid}/probe.bin`, {
    bearer: u1.token,
    bodyRaw: AUDIO,
  });
  probe('user1 upload under own {user_id}/ prefix: allowed', s1.status === 200, show(s1));
  const s2 = await req('GET', `/storage/v1/object/captures-audio/${u1.uid}/probe.bin`, {
    bearer: u1.token,
  });
  probe(
    'user1 download own object: allowed, bytes intact',
    s2.status === 200 && s2.text === AUDIO,
    show(s2),
  );
  const s3 = await req('POST', '/storage/v1/object/list/captures-audio', {
    bearer: u1.token,
    json: { prefix: u1.uid, limit: 10 },
  });
  probe(
    'user1 list own prefix: exactly the one own object',
    s3.status === 200 &&
      Array.isArray(s3.json) &&
      s3.json.length === 1 &&
      s3.json[0].name === 'probe.bin',
    show(s3),
  );
  const s4 = await req('POST', `/storage/v1/object/captures-audio/${u2.uid}/intrusion.bin`, {
    bearer: u1.token,
    bodyRaw: 'intrusion attempt',
  });
  probe(
    "user1 upload under user2's prefix: denied, exactly HTTP 400 code AccessDenied",
    deniedExact(s4, 400, 'AccessDenied'),
    show(s4),
  );
  const s5 = await req('POST', '/storage/v1/object/captures-audio/no-folder-probe.bin', {
    bearer: u1.token,
    bodyRaw: 'no folder segment',
  });
  probe(
    'upload with no {user_id}/ folder segment: denied, exactly HTTP 400 code AccessDenied (fails closed, foldername[1] is null)',
    deniedExact(s5, 400, 'AccessDenied'),
    show(s5),
  );
  const s6 = await req('GET', `/storage/v1/object/captures-audio/${u1.uid}/probe.bin`, {
    bearer: u2.token,
  });
  probe(
    "user2 download user1's object: denied, exactly HTTP 400 code NoSuchKey (not-found obfuscation)",
    deniedExact(s6, 400, 'NoSuchKey'),
    show(s6),
  );
  const s7 = await req('POST', '/storage/v1/object/list/captures-audio', {
    bearer: u2.token,
    json: { prefix: u1.uid, limit: 10 },
  });
  probe(
    "user2 list user1's prefix: sees zero objects",
    s7.status === 200 && Array.isArray(s7.json) && s7.json.length === 0,
    show(s7),
  );
  const s8 = await req('DELETE', `/storage/v1/object/captures-audio/${u1.uid}/probe.bin`, {
    bearer: u2.token,
  });
  probe(
    "user2 delete user1's object: denied, exactly HTTP 400 code AccessDenied",
    deniedExact(s8, 400, 'AccessDenied'),
    show(s8),
  );
  const s9 = await req('POST', '/storage/v1/object/list/captures-audio', {
    json: { prefix: '', limit: 10 },
  });
  probe(
    'anon list while an own object exists: still sees zero objects (contrast with user1 list above)',
    s9.status === 200 && Array.isArray(s9.json) && s9.json.length === 0,
    show(s9),
  );
  const s10 = await req('DELETE', `/storage/v1/object/captures-audio/${u1.uid}/probe.bin`, {
    bearer: u1.token,
  });
  probe(
    'user1 delete own object: allowed (bucket left with no test objects)',
    s10.status === 200,
    show(s10),
  );

  out();
  out('## Residual test state (recorded; cleanup is owner-class — see README.md)');
  out(`   auth.users: ${USERS.map((u) => u.email).join(', ')} (disposable, namespaced)`);
  out('   profiles: user1 + user2 rows (provisioned / reinserted); captures: capture A');
  out("   (status 'ready', user1); transcripts: transcript 1 (user1); storage: none.");
  finish(failCount ? 1 : 0);
}

const run = MODE === '--anon' ? anonMode : authMode;
run().catch((e) => {
  out(`FATAL: ${String(e)}`);
  finish(1);
});
