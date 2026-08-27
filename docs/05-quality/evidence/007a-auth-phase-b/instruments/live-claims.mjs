// Unit F live claims L1–L6, one phase function per claim, each writing its own
// transcript. Shared plumbing (clients, redaction, fake backends) comes in
// through `ctx`; `live-run.mjs` sequences the phases.
//
// WHAT IS REAL AND WHAT IS FAKE — say-so required by the dispatch:
// the Supabase client is the REAL PINNED `@supabase/supabase-js` from this
// repo's lockfile, talking to REAL staging over the network, and every
// SESSION it holds is real. The storage handed to it is the REAL shipped
// chunking adapter (`createChunkedSecureStore` from
// `src/lib/auth/secure-store-adapter.ts`) running over an INSTRUMENTED
// IN-MEMORY fake of the `SecureStoreBackend` seam — its declared constructor
// argument — because SecureStore itself is a native keychain API that does
// not exist in Node. The observer/demand decoration the app adds
// (`observingWrites` + `reauth-demand.ts`) is NOT in the loop: its demand
// store is expo-file-system, equally native; that layer's behaviour is Unit
// E's offline evidence, not re-measured here.
//
// EXECUTION ORDER (stated in the README): L1, L2, L5's sign-in and sign-out,
// then L3, L6, L4 — owner interaction clustered at the front, and L4 last
// because token-reuse detection may revoke the whole token family, which
// would invalidate any claim still needing user A's session.
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Assembled at runtime so this file's own bytes carry no email shape — the
// commit-time redaction scan covers instrument sources too. The domain is
// RFC-2606-reserved `example.com`: never deliverable; the sandbox captures
// the message (ruling 24).
const testAddress = (runId, tag) => `unitf-${runId}-${tag}@${['example', 'com'].join('.')}`;

function nowIso() {
  return new Date().toISOString();
}

function sortedKeys(obj) {
  return obj && typeof obj === 'object' ? Object.keys(obj).sort().join(', ') : String(obj);
}

function errorShape(error) {
  if (!error) return 'null';
  const name = error.constructor?.name ?? 'Error';
  const status = 'status' in error ? error.status : undefined;
  const code = 'code' in error ? error.code : undefined;
  return `name=${name} status=${status ?? '—'} code=${code ?? '—'} message="${error.message}"`;
}

/**
 * Send the one-time code for `email`, retrying ONCE only on an explicit
 * rate-limit answer (a rate-limited send captures no message, so the retry
 * cannot consume budget). Any other failure aborts — an automatic retry on an
 * ambiguous failure could silently burn a captured message (the budget rule).
 */
async function sendOtpOnce(ctx, client, email, writer) {
  for (let attempt = 1; ; attempt += 1) {
    const started = performance.now();
    const { data, error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    const ms = Math.round(performance.now() - started);
    if (!error) {
      ctx.sends += 1;
      ctx.lastSendByEmail.set(email, Date.now());
      writer.line(
        `signInWithOtp(shouldCreateUser: true) → error: null (${ms} ms); ` +
          `data keys: ${sortedKeys(data)}. Captured message ${ctx.sends} consumed.`,
      );
      return;
    }
    const rateLimited = error.status === 429 || /rate limit/i.test(error.message ?? '');
    if (rateLimited && attempt === 1) {
      writer.line(
        `signInWithOtp → rate-limited (${errorShape(error)}); a rate-limited send ` +
          `captures no message. Waiting 70 s and retrying once.`,
      );
      await sleep(70_000);
      continue;
    }
    writer.line(`signInWithOtp FAILED: ${errorShape(error)}`);
    throw new Error(`signInWithOtp for ${email} failed; no retry (budget rule)`);
  }
}

/**
 * Verify a relayed code, re-prompting on a rejected code. A fresh send is the
 * stated-in-advance contingency and needs an explicit owner action at the
 * terminal (`ownerAuthorisesResend`); it is never automatic.
 */
async function verifyRelayedCode(ctx, client, email, emailPlaceholder, writer) {
  const { promptForCode, ownerAuthorisesResend } = ctx.prompts;
  for (let round = 1; round <= 2; round += 1) {
    const relayStarted = performance.now();
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const code = await promptForCode(ctx.redactor, {
        emailPlaceholder,
        realEmail: email,
      });
      const relaySeconds = Math.round((performance.now() - relayStarted) / 1000);
      const started = performance.now();
      const { data, error } = await client.auth.verifyOtp({ email, token: code, type: 'email' });
      const ms = Math.round(performance.now() - started);
      if (!error && data.session) {
        ctx.redactor.registerSession(data.session);
        writer.line(
          `verifyOtp(type: 'email') → error: null (${ms} ms; owner relay took ` +
            `~${relaySeconds} s including sandbox lookup). data keys: ${sortedKeys(data)}.`,
        );
        return data.session;
      }
      writer.line(
        `verifyOtp attempt ${attempt}/3 rejected: ${errorShape(error)} — the relayed ` +
          `code is recorded only as <otp-code-N>.`,
      );
    }
    if (round === 1) {
      const approved = await ownerAuthorisesResend(
        'Three verify attempts failed (mistyped or expired code).',
      );
      if (!approved) throw new Error('owner declined the contingency resend; aborting');
      writer.line('CONTINGENCY: owner authorised one extra captured message at the terminal.');
      await sendOtpOnce(ctx, client, email, writer);
    }
  }
  throw new Error('verification failed after the contingency resend; aborting');
}

// --------------------------------------------------------------------- L1
export async function runL1(ctx) {
  const w = ctx.openTranscript(
    'L1-otp-roundtrip.txt',
    'L1 — live one-time-code round trip (signInWithOtp → captured message → owner relay → verifyOtp → session)',
  );
  const email = testAddress(ctx.runId, 'a');
  ctx.redactor.register(email, '<user-a-email>');
  ctx.emails.a = email;

  w.line(`run: ${ctx.runId} · started ${nowIso()}`);
  w.line(
    'Client: the real pinned @supabase/supabase-js ' +
      `${ctx.versions.supabaseJs} (auth-js ${ctx.versions.authJs}) against staging; ` +
      'construction mirrors src/lib/supabase.ts — persistSession: true, ' +
      `storageKey: '${ctx.storageKey}' (extracted from session-storage.ts), ` +
      'autoRefreshToken: false, detectSessionInUrl: false. Storage: the real ' +
      'shipped chunking adapter over an instrumented in-memory backend ' +
      '(fake-secure-store.mjs) — the SESSION is real; SecureStore stays offline.',
  );
  w.line(
    `Test identity (ruling 24): a disposable run-namespaced address, mail captured by ` +
      `the Mailtrap sandbox, recorded here only as <user-a-email>.`,
  );
  w.line('');

  const opsBefore = ctx.a1.instrumented.ops.length;
  await sendOtpOnce(ctx, ctx.a1.client, email, w);
  w.line(
    'The captured message was read by the owner in the Mailtrap sandbox UI and its ' +
      'code relayed at the prompt (ruling 24) — the owner-executed event of this claim.',
  );
  const session = await verifyRelayedCode(ctx, ctx.a1.client, email, '<user-a-email>', w);
  ctx.sessions.a1 = session;

  w.line('');
  w.line(`session shape: keys [${sortedKeys(session)}]`);
  w.line(`session.user shape: keys [${sortedKeys(session.user)}]`);
  w.line(
    `token_type=${session.token_type} expires_in=${session.expires_in} s ` +
      `expires_at=${session.expires_at} (${new Date(session.expires_at * 1000).toISOString()})`,
  );
  w.line(`user.id=${session.user.id} user.email=${session.user.email ?? '—'}`);
  w.line(`user.created_at=${session.user.created_at} (a NEW user created by this OTP flow)`);
  w.line('');
  await sleep(250); // settle: the client's save is awaited in-flow, but a
  // quarter-second here makes the op-log read race-proof on the one paid run.
  w.line('Persistence through the real adapter at sign-in (op log, key names and sizes only):');
  for (const line of ctx.summariseOps(ctx.a1.instrumented, opsBefore).filter((l) => l.startsWith('set'))) {
    w.line(`  ${line}`);
  }
  w.line('');
  w.line('HTTP calls this phase (instrumented fetch; paths only, bodies never recorded):');
  for (const f of ctx.a1.fetchLog.splice(0)) w.line(`  ${f}`);
  w.close(`L1 complete ${nowIso()}`);
  return { pass: true };
}

// --------------------------------------------------------------------- L2
export async function runL2(ctx) {
  const w = ctx.openTranscript(
    'L2-provisioning-rls.txt',
    'L2 — provisioning and RLS live: the OTP-created users have their Unit C profile rows; own-row passes; cross-row refused; no-session refused',
  );
  const email = testAddress(ctx.runId, 'b');
  ctx.redactor.register(email, '<user-b-email>');
  ctx.emails.b = email;

  w.line(`run: ${ctx.runId} · started ${nowIso()}`);
  w.line('User B is the second OTP-created identity (two users → two captured messages).');
  w.line('');

  await sendOtpOnce(ctx, ctx.b1.client, email, w);
  const sessionB = await verifyRelayedCode(ctx, ctx.b1.client, email, '<user-b-email>', w);
  ctx.sessions.b1 = sessionB;
  const uidA = ctx.sessions.a1.user.id;
  const uidB = sessionB.user.id;
  w.line(`user B id=${uidB}`);
  w.line('');

  const results = [];
  const expectRow = async (label, client, expectedUid) => {
    const { data, error, status } = await client.from('profiles').select('*');
    const rows = data ?? [];
    const row = rows[0];
    const ok =
      !error &&
      status === 200 &&
      rows.length === 1 &&
      row.id === expectedUid &&
      row.locale === 'en';
    results.push(ok);
    w.line(
      `${label}: HTTP ${status}, rows=${rows.length}` +
        (row
          ? `, row keys [${sortedKeys(row)}], id===own uid: ${row.id === expectedUid}, ` +
            `locale='${row.locale}'`
          : '') +
        ` → ${ok ? 'PASS' : 'FAIL'} (oracle: 200, exactly the own row, locale 'en' — the Unit C provisioning trigger ran for an OTP-created user)`,
    );
  };
  await expectRow('A selects profiles (own row only visible)', ctx.a1.client, uidA);
  await expectRow('B selects profiles (own row only visible)', ctx.b1.client, uidB);

  const expectInvisible = async (label, client, victimUid) => {
    const { data, error, status } = await client.from('profiles').select('*').eq('id', victimUid);
    const ok = !error && status === 200 && (data ?? []).length === 0;
    results.push(ok);
    w.line(
      `${label}: HTTP ${status}, rows=${(data ?? []).length} → ${ok ? 'PASS' : 'FAIL'} ` +
        `(oracle: exactly 200 with zero rows — RLS-invisible, the 004b claim-8 contract)`,
    );
  };
  await expectInvisible("A selects B's row by id", ctx.a1.client, uidB);
  await expectInvisible("B selects A's row by id", ctx.b1.client, uidA);

  w.line('');
  w.line(
    'No-session probes (the 004b anon set, live again against this schema; a fresh ' +
      'client with no session — the anon role):',
  );
  const anon = ctx.anonClient;
  const expectDenied = async (label, run) => {
    const { error, status } = await run();
    const ok = status === 401 && error?.code === '42501';
    results.push(ok);
    w.line(
      `  ${label}: HTTP ${status}, code=${error?.code ?? '—'}, message="${error?.message ?? ''}" ` +
        `→ ${ok ? 'PASS' : 'FAIL'} (oracle: exactly 401 code 42501)`,
    );
  };
  for (const table of ['profiles', 'captures', 'transcripts']) {
    await expectDenied(`SELECT ${table} with no session`, () => anon.from(table).select('*'));
  }
  await expectDenied('INSERT profiles with no session', () =>
    anon.from('profiles').insert({ id: randomUUID() }),
  );

  w.line('');
  w.line('HTTP calls this phase:');
  for (const f of ctx.b1.fetchLog.splice(0)) w.line(`  B: ${f}`);
  for (const f of ctx.a1.fetchLog.splice(0)) w.line(`  A: ${f}`);
  for (const f of ctx.anonFetchLog.splice(0)) w.line(`  anon: ${f}`);
  const pass = results.every(Boolean);
  w.close(`L2 ${pass ? 'PASS (all oracles exact)' : 'FAIL — see lines above'} · ${nowIso()}`);
  return { pass };
}

// --------------------------------------------------------------------- L5
export async function runL5(ctx) {
  const w = ctx.openTranscript(
    'L5-signout-local.txt',
    "L5 — signOut({ scope: 'local' }) on session A2 with session A1 alive for the same user: A2's refresh token dies, A1 still refreshes (ADR-005 live)",
  );
  w.line(`run: ${ctx.runId} · started ${nowIso()}`);
  w.line(
    'Two concurrent sessions for user A: A1 from L1, A2 signed in here (the third ' +
      'and final captured message of the Node run).',
  );
  w.line('');

  // Per-address send rate limit: staging enforces a minimum interval between
  // sends to one address; A's first send was in L1.
  const sinceFirstSend = Date.now() - (ctx.lastSendByEmail.get(ctx.emails.a) ?? 0);
  if (sinceFirstSend < 65_000) {
    const wait = 65_000 - sinceFirstSend;
    w.line(`Waiting ${Math.ceil(wait / 1000)} s before re-sending to <user-a-email> (per-address send interval).`);
    await sleep(wait);
  }
  await sendOtpOnce(ctx, ctx.a2.client, ctx.emails.a, w);
  const sessionA2 = await verifyRelayedCode(ctx, ctx.a2.client, ctx.emails.a, '<user-a-email>', w);
  ctx.sessions.a2 = sessionA2;
  w.line(`A2 user.id === A1 user.id: ${sessionA2.user.id === ctx.sessions.a1.user.id} (same user, second session)`);
  w.line('');

  // Concurrent-session posture check BEFORE the sign-out: if staging ran a
  // single-session-per-user posture, A2's creation would already have killed
  // A1, and this claim is not runnable as designed.
  const pre = await ctx.a1.client.auth.refreshSession();
  if (pre.error) {
    w.line(
      `POSTURE FINDING: refreshing A1 immediately after A2's creation FAILED ` +
        `(${errorShape(pre.error)}) — staging does not keep two concurrent sessions ` +
        `for one user. L5 cannot run as designed; recorded as a finding.`,
    );
    w.close(`L5 NOT RUN as designed · ${nowIso()}`);
    throw new Error('single-session posture: A1 died when A2 was created');
  }
  ctx.redactor.registerSession(pre.data.session);
  ctx.sessions.a1 = pre.data.session;
  w.line(
    'Posture check: A1 refreshed successfully AFTER A2 was created — staging keeps ' +
      'two concurrent sessions for one user (rotation recorded; tokens redacted).',
  );

  const supersededA2Refresh = sessionA2.refresh_token;
  const opsBefore = ctx.a2.instrumented.ops.length;
  const started = performance.now();
  const { error: signOutError } = await ctx.a2.client.auth.signOut({ scope: 'local' });
  const ms = Math.round(performance.now() - started);
  w.line('');
  w.line(`A2.signOut({ scope: 'local' }) → error: ${signOutError ? errorShape(signOutError) : 'null'} (${ms} ms)`);

  const purged = await ctx.a2.freshAdapter.confirmRemoved(ctx.storageKey);
  w.line(
    `A2 store read-back through a fresh real-adapter instance (ADR-009 requirement 1, ` +
      `live): confirmRemoved('${ctx.storageKey}') = ${purged}; keys present after ` +
      `sign-out: [${ctx.presentKeys(ctx.a2.instrumented).join(', ') || 'none'}]`,
  );
  w.line('A2 adapter ops during sign-out (names and sizes only):');
  for (const line of ctx.summariseOps(ctx.a2.instrumented, opsBefore)) w.line(`  ${line}`);
  w.line('');

  const dead = await ctx.throwawayRefresh(supersededA2Refresh);
  const deadOk = Boolean(dead.error);
  w.line(
    `A2's refresh token after the local sign-out → ${
      dead.error
        ? `REFUSED, verbatim: ${errorShape(dead.error)}`
        : 'ACCEPTED — FINDING: a locally signed-out session still refreshes'
    }`,
  );
  if (!dead.error && dead.data?.session) ctx.redactor.registerSession(dead.data.session);

  const post = await ctx.a1.client.auth.refreshSession();
  const aliveOk = !post.error && Boolean(post.data.session);
  if (aliveOk) {
    ctx.redactor.registerSession(post.data.session);
    ctx.sessions.a1 = post.data.session;
  }
  w.line(
    `A1 refreshSession() AFTER A2's local sign-out → ${
      aliveOk
        ? `succeeded: rotation observed (access changed: ${post.data.session.access_token !== pre.data.session.access_token}, refresh changed: ${post.data.session.refresh_token !== pre.data.session.refresh_token}); new expires_in=${post.data.session.expires_in} s`
        : `FAILED (${errorShape(post.error)}) — FINDING: a local-scope sign-out killed the sibling session`
    }`,
  );
  w.line('');
  w.line('HTTP calls this phase:');
  for (const f of ctx.a2.fetchLog.splice(0)) w.line(`  A2: ${f}`);
  for (const f of ctx.a1.fetchLog.splice(0)) w.line(`  A1: ${f}`);
  const pass = !signOutError && purged && deadOk && aliveOk;
  w.close(`L5 ${pass ? 'PASS' : 'FAIL/FINDING — see lines above'} · ${nowIso()}`);
  return { pass };
}

// --------------------------------------------------------------------- L3
export async function runL3(ctx) {
  const w = ctx.openTranscript(
    'L3-session-size.txt',
    "L3 — live session size against the adapter's chunk threshold (the 005d §B3 gap: no real session had ever been measured)",
  );
  w.line(`run: ${ctx.runId} · started ${nowIso()}`);
  w.line(
    'Subject: the CURRENT persisted payload of session A1 — a real session issued by ' +
      'staging, last written by the pinned client itself during the L5 rotation — read ' +
      'back through a FRESH instance of the real shipped adapter over the same ' +
      'instrumented backend (adapter path, not memory).',
  );
  w.line('');

  const value = await ctx.a1.freshAdapter.getItem(ctx.storageKey);
  if (value === null) {
    w.close('L3 FAIL: adapter read-back returned null');
    return { pass: false };
  }
  const utf8 = Buffer.byteLength(value, 'utf8');
  const rawIndex = ctx.a1.instrumented.store.get(ctx.storageKey);
  const index = JSON.parse(rawIndex);
  const chunkKeys = ctx.presentKeys(ctx.a1.instrumented).filter((k) => k !== ctx.storageKey);
  const expected = ctx.adapter.splitByUtf8Budget(value, ctx.adapter.CHUNK_BUDGET_BYTES).length;

  let parsedKeys = '(payload did not parse as JSON)';
  let sessionReal = false;
  try {
    const parsed = JSON.parse(value);
    parsedKeys = sortedKeys(parsed);
    sessionReal =
      typeof parsed.access_token === 'string' &&
      typeof parsed.refresh_token === 'string' &&
      typeof parsed.user === 'object';
  } catch {
    // recorded above
  }

  w.line(`payload length: ${value.length} UTF-16 code units · ${utf8} UTF-8 bytes`);
  w.line(
    `adapter constants (imported from the shipped module): CHUNK_BUDGET_BYTES=` +
      `${ctx.adapter.CHUNK_BUDGET_BYTES}, MAX_CHUNKS=${ctx.adapter.MAX_CHUNKS}`,
  );
  w.line(
    `index (the adapter's own committed record): generation=${index.g}, chunks n=${index.n}, ` +
      `len=${index.len}, checksum present: ${typeof index.c === 'number'}`,
  );
  w.line(`index.len === payload length: ${index.len === value.length}`);
  w.line(`chunk count the real payload produces: ${index.n} (splitByUtf8Budget predicts ${expected})`);
  w.line(`chunk keys present: [${chunkKeys.join(', ')}]`);
  w.line('per-chunk sizes (each must be ≤ CHUNK_BUDGET_BYTES):');
  let sizesOk = true;
  for (const key of chunkKeys) {
    const bytes = Buffer.byteLength(ctx.a1.instrumented.store.get(key), 'utf8');
    if (bytes > ctx.adapter.CHUNK_BUDGET_BYTES) sizesOk = false;
    w.line(`  ${key}: ${bytes} B`);
  }
  w.line(
    `payload top-level keys: [${parsedKeys}] — a real session object (access_token, ` +
      `refresh_token, user all present): ${sessionReal}; values never printed`,
  );
  w.line(`headroom: ${index.n}/${ctx.adapter.MAX_CHUNKS} chunks of the removal bound`);

  const pass =
    sessionReal && sizesOk && index.n === expected && index.len === value.length && index.n >= 1;
  w.close(`L3 ${pass ? 'PASS — first live measurement of a product session' : 'FAIL'} · ${nowIso()}`);
  return { pass };
}

// --------------------------------------------------------------------- L6
export async function runL6(ctx) {
  const w = ctx.openTranscript(
    'L6-jwt-expiry.txt',
    "L6 — the 600-second JWT expiry (ruling 23) observed live: the access token expires on schedule and the client's refresh path takes over",
  );
  const before = ctx.sessions.a1;
  w.line(`run: ${ctx.runId} · started ${nowIso()}`);
  w.line(
    `Session A1 as issued by the L5 rotation: expires_in=${before.expires_in} s, ` +
      `expires_at=${before.expires_at} (${new Date(before.expires_at * 1000).toISOString()})`,
  );
  const margin = 45_000;
  const target = before.expires_at * 1000 + margin;
  const planned = Math.max(target - Date.now(), 0);
  w.line(
    `Waiting ${Math.round(planned / 1000)} s (until expiry plus a ${margin / 1000} s margin; ` +
      `no test hook shortens the schedule — the low expiry IS the ruling-23 posture).`,
  );
  const waitStarted = Date.now();
  while (Date.now() < target) {
    const remain = target - Date.now();
    process.stdout.write(`    …waiting for JWT expiry: ${Math.ceil(remain / 1000)} s remaining\n`);
    await sleep(Math.min(60_000, remain));
  }
  w.line(`Waited ${Math.round((Date.now() - waitStarted) / 1000)} s; wall clock now past expires_at.`);
  w.line('');

  const fetchesBefore = ctx.a1.fetchLog.length;
  const started = performance.now();
  const { data, error } = await ctx.a1.client.auth.getSession();
  const ms = Math.round(performance.now() - started);
  const after = data?.session ?? null;
  const newFetches = ctx.a1.fetchLog.slice(fetchesBefore);
  const refreshCall = newFetches.find((f) => f.includes('/auth/v1/token') && f.includes('grant_type=refresh_token'));

  w.line(`getSession() with the access token past expiry → error: ${error ? errorShape(error) : 'null'} (${ms} ms)`);
  w.line(
    `refresh path took over: ${refreshCall ? `yes — the pinned client issued ${refreshCall.trim()}` : 'NO refresh call observed — FINDING'}`,
  );
  if (after) {
    ctx.redactor.registerSession(after);
    w.line(
      `rotation: access token changed: ${after.access_token !== before.access_token}, ` +
        `refresh token changed: ${after.refresh_token !== before.refresh_token}`,
    );
    w.line(
      `new expires_in=${after.expires_in} s (ruling 23 observed: ${after.expires_in === 600 ? 'exactly 600' : `NOT 600 — FINDING`}); ` +
        `new expires_at=${after.expires_at} (${new Date(after.expires_at * 1000).toISOString()})`,
    );
    w.line(
      `observed lifetime of the expired token: issued in L5, expired ${before.expires_in} s later on schedule ` +
        `(the wait above ran to completion with no early refusal).`,
    );
    ctx.sessions.a1 = after;
  }
  w.line('');
  w.line('Persistence of the rotated session through the real adapter:');
  const readBack = await ctx.a1.freshAdapter.getItem(ctx.storageKey);
  let persisted = false;
  try {
    persisted = after !== null && JSON.parse(readBack).refresh_token === after.refresh_token;
  } catch {
    // recorded below
  }
  w.line(`  fresh-adapter read-back holds the NEW refresh token: ${persisted} (values never printed)`);
  w.line('');
  w.line('HTTP calls this phase:');
  for (const f of ctx.a1.fetchLog.splice(0)) w.line(`  ${f}`);
  const pass = Boolean(after && refreshCall && after.expires_in === 600 && persisted && !error);
  w.close(`L6 ${pass ? 'PASS' : 'FAIL/FINDING — see lines above'} · ${nowIso()}`);
  return { pass };
}

// --------------------------------------------------------------------- L4
export async function runL4(ctx) {
  const w = ctx.openTranscript(
    'L4-rotation-backstop.txt',
    'L4 — refresh rotation persisted through the adapter, then the ruling-25 backstop: the SUPERSEDED refresh token presented outside the reuse interval',
  );
  w.line(`run: ${ctx.runId} · started ${nowIso()}`);
  w.line(
    'This phase runs LAST: reuse detection may revoke the whole token family, ' +
      'which no later claim may depend on. PROJECT-STATE names this backstop as ' +
      "Known Issues 1–2's compensating control 2.",
  );
  w.line('');

  const before = ctx.sessions.a1;
  const opsBefore = ctx.a1.instrumented.ops.length;
  const started = performance.now();
  const { data, error } = await ctx.a1.client.auth.refreshSession();
  const ms = Math.round(performance.now() - started);
  if (error || !data.session) {
    w.line(`refreshSession() FAILED: ${errorShape(error)}`);
    w.close(`L4 FAIL · ${nowIso()}`);
    return { pass: false };
  }
  const after = data.session;
  ctx.redactor.registerSession(after);
  ctx.sessions.a1 = after;
  const superseded = before.refresh_token;

  w.line(`explicit refreshSession() → error: null (${ms} ms)`);
  w.line(
    `rotation observed: access token changed: ${after.access_token !== before.access_token}, ` +
      `refresh token changed: ${after.refresh_token !== before.refresh_token}; ` +
      `new expires_in=${after.expires_in} s`,
  );
  w.line('adapter writes for this rotation (names and sizes only):');
  for (const line of ctx.summariseOps(ctx.a1.instrumented, opsBefore).filter((l) => l.startsWith('set'))) {
    w.line(`  ${line}`);
  }
  let persisted = false;
  try {
    persisted = JSON.parse(await ctx.a1.freshAdapter.getItem(ctx.storageKey)).refresh_token === after.refresh_token;
  } catch {
    // recorded below
  }
  w.line(`fresh-adapter read-back holds the rotated refresh token: ${persisted}`);
  w.line('');

  const interval = 30_000;
  w.line(
    `Waiting ${interval / 1000} s before presenting the SUPERSEDED token — past GoTrue's ` +
      `default 10 s reuse interval with margin. Staging's exact interval is dashboard ` +
      `state this run does not read; the default is assumed and stated.`,
  );
  await sleep(interval);

  const reuse = await ctx.throwawayRefresh(superseded);
  if (reuse.error) {
    w.line(
      `SUPERSEDED refresh token presented ${interval / 1000} s after rotation → REFUSED. ` +
        `Staging's rejection, verbatim: ${errorShape(reuse.error)}`,
    );
  } else {
    w.line(
      'SUPERSEDED refresh token presented after the reuse interval → ACCEPTED — ' +
        'FINDING (dispatch: this is a finding, not a note). Tokens registered and redacted.',
    );
    if (reuse.data?.session) ctx.redactor.registerSession(reuse.data.session);
  }
  w.line('');

  const family = await ctx.throwawayRefresh(after.refresh_token);
  if (family.error) {
    w.line(
      `informative: the CURRENT token presented after the reuse attempt → also refused ` +
        `(${errorShape(family.error)}) — reuse detection revoked the family; the on-disk ` +
        `residue cannot be refreshed into a usable session (the ruling-25 bound, strongest form).`,
    );
  } else {
    w.line(
      'informative: the CURRENT token still refreshes after the reuse attempt — the ' +
        'family survived the superseded-token presentation. The probe itself consumed ' +
        'the current token in a throwaway client, so the adapter-stored residue is now ' +
        'superseded and dies at ITS next presentation — the ruling-25 residue situation, ' +
        'reproduced by the probe and recorded.',
    );
    if (family.data?.session) ctx.redactor.registerSession(family.data.session);
  }
  w.line('');
  w.line('HTTP calls this phase:');
  for (const f of ctx.a1.fetchLog.splice(0)) w.line(`  A1: ${f}`);
  for (const f of ctx.throwawayFetchLog.splice(0)) w.line(`  probe: ${f}`);
  const pass = persisted && Boolean(reuse.error);
  w.close(`L4 ${pass ? 'PASS — backstop observed' : 'FAIL/FINDING — see lines above'} · ${nowIso()}`);
  return { pass };
}
