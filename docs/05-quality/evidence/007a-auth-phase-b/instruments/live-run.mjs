// Unit F live-run orchestrator. Run through live-run.sh (which creates the
// 0600 redaction ledger and registers the module loader):
//
//   bash docs/05-quality/evidence/007a-auth-phase-b/instruments/live-run.sh
//
// OWNER-EXECUTED (the 004b pattern, plus ruling 24): the owner runs this in
// their own terminal, relays each one-time code at the prompt, and the
// producer redacts every secret at source. The run consumes THREE captured
// messages (stated before the first send; a fourth only by the explicit
// RESEND action at the terminal). Owner attention is needed for the first
// ~5 minutes (three code relays); the remainder — including the 600-second
// JWT-expiry wait — is unattended, ~13–17 minutes total.
//
// Phase order: L1, L2, L5, L3, L6, L4 — interaction clustered at the front;
// L4 last because reuse detection may revoke the token family.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

import {
  createChunkedSecureStore,
  CHUNK_BUDGET_BYTES,
  MAX_CHUNKS,
  splitByUtf8Budget,
} from '../../../../../src/lib/auth/secure-store-adapter.ts';
import { loadStagingEnv } from './env.mjs';
import { Redactor, TranscriptWriter, finalScan } from './redaction.mjs';
import { createInstrumentedBackend, presentKeys, summariseOps } from './fake-secure-store.mjs';
import { promptForCode, ownerAuthorisesResend } from './otp-prompt.mjs';
import { runL1, runL2, runL3, runL4, runL5, runL6 } from './live-claims.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..', '..');
const outDir = join(here, '..');

function extractStorageKey() {
  const source = readFileSync(join(repoRoot, 'src/lib/auth/session-storage.ts'), 'utf8');
  const match = source.match(/export const AUTH_SESSION_STORAGE_KEY = '([^']+)';/);
  if (!match) {
    throw new Error('AUTH_SESSION_STORAGE_KEY not found in session-storage.ts; the pin drifted');
  }
  return match[1];
}

function installedVersion(pkg) {
  try {
    return JSON.parse(readFileSync(join(repoRoot, 'node_modules', pkg, 'package.json'), 'utf8'))
      .version;
  } catch {
    return 'unresolved';
  }
}

function makeFetch(log) {
  return async (input, init) => {
    const rawUrl = typeof input === 'string' ? input : input.url;
    const u = new URL(rawUrl);
    const method = init?.method ?? 'GET';
    const started = performance.now();
    const response = await fetch(input, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(30_000),
    });
    const ms = Math.round(performance.now() - started);
    log.push(`${method} ${u.pathname}${u.search} → ${response.status} (${ms} ms)`);
    return response;
  };
}

async function main() {
  const env = loadStagingEnv(repoRoot);
  const redactor = new Redactor(process.env.REDACTION_LEDGER);
  // Credentials are registered for redaction BEFORE any other work.
  redactor.register(env.url, '<staging-url>');
  redactor.register(env.host, '<staging-host>');
  redactor.register(env.projectRef, '<staging-project-ref>');
  redactor.register(env.key, '<publishable-key>');

  const storageKey = extractStorageKey();
  const runId = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296)
    .toString(36)
    .padStart(2, '0')}`;

  const makeUserClient = (label) => {
    const instrumented = createInstrumentedBackend(label);
    const fetchLog = [];
    return {
      label,
      instrumented,
      fetchLog,
      adapter: createChunkedSecureStore(instrumented.backend),
      freshAdapter: createChunkedSecureStore(instrumented.backend),
      client: null, // built below, after the shared options exist
    };
  };
  const clientOptions = (storage, fetchLog) => ({
    auth: {
      persistSession: storage !== undefined,
      ...(storage !== undefined ? { storage, storageKey } : {}),
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { fetch: makeFetch(fetchLog) },
  });

  const a1 = makeUserClient('A1');
  const b1 = makeUserClient('B1');
  const a2 = makeUserClient('A2');
  for (const c of [a1, b1, a2]) {
    c.client = createClient(env.url, env.key, clientOptions(c.adapter, c.fetchLog));
  }
  const anonFetchLog = [];
  const anonClient = createClient(env.url, env.key, clientOptions(undefined, anonFetchLog));
  const throwawayFetchLog = [];
  const throwawayRefresh = async (refresh_token) => {
    const probe = createClient(env.url, env.key, clientOptions(undefined, throwawayFetchLog));
    return probe.auth.refreshSession({ refresh_token });
  };

  const writtenFiles = [];
  const ctx = {
    runId,
    redactor,
    storageKey,
    emails: {},
    sessions: {},
    sends: 0,
    lastSendByEmail: new Map(),
    versions: {
      supabaseJs: installedVersion('@supabase/supabase-js'),
      authJs: installedVersion('@supabase/auth-js'),
    },
    a1,
    b1,
    a2,
    anonClient,
    anonFetchLog,
    throwawayRefresh,
    throwawayFetchLog,
    adapter: { CHUNK_BUDGET_BYTES, MAX_CHUNKS, splitByUtf8Budget },
    presentKeys,
    summariseOps,
    prompts: { promptForCode, ownerAuthorisesResend },
    openTranscript(name, title) {
      const path = join(outDir, name);
      writtenFiles.push(path);
      return new TranscriptWriter(redactor, path, title, [
        `Unit F — Auth Phase B live evidence (007a). Producer: instruments/live-run.mjs.`,
        `Redaction at source (ruling 24 / 004b discipline): registered values are`,
        `replaced before buffering; a JWT-shape sweep runs on every line; the writer`,
        `refuses any line a registered value survives. This file is written by the`,
        `redacting writer only — process stdout is a progress channel and is not committed.`,
        '',
      ]);
    },
  };

  process.stdout.write(
    [
      '',
      'Unit F live run — Auth Phase B (007a)',
      '-------------------------------------',
      'Email budget, stated before the first send (dispatch rule): THREE captured',
      'messages — user A (L1), user B (L2), user A second session (L5). A fourth',
      'is consumed only by an explicit RESEND at a failure prompt. If the Mailtrap',
      'meter is near 50, press Ctrl-C now and report instead of running.',
      '',
    ].join('\n'),
  );

  // Settings preflight — BEFORE any send, failing loudly (the 004b claim-22/23
  // lesson: a failed settings read is an abort, never an undefined field).
  const settingsResponse = await fetch(`${env.url}/auth/v1/settings`, {
    headers: { apikey: env.key },
    signal: AbortSignal.timeout(30_000),
  });
  if (settingsResponse.status !== 200) {
    throw new Error(`auth settings preflight failed: HTTP ${settingsResponse.status}; aborting before any send`);
  }
  const settings = await settingsResponse.json();
  if (typeof settings.disable_signup !== 'boolean' || typeof settings.mailer_autoconfirm !== 'boolean') {
    throw new Error('auth settings preflight: flags are not booleans; aborting before any send');
  }

  const results = {};
  const phases = [
    ['L1', runL1],
    ['L2', runL2],
    ['L5', runL5],
    ['L3', runL3],
    ['L6', runL6],
    ['L4', runL4],
  ];
  let aborted = null;
  for (const [name, phase] of phases) {
    // An L1 abort leaves no session at all; an L5 abort (dead sibling session)
    // still allows L3 — a pure storage measurement — but not L6/L4, which
    // need user A's session live.
    const skip =
      (aborted === 'L1') || (aborted === 'L5' && (name === 'L6' || name === 'L4'));
    if (skip) {
      results[name] = `NOT RUN (aborted at ${aborted})`;
      continue;
    }
    process.stdout.write(`\n== ${name} ==\n`);
    try {
      const { pass } = await phase(ctx);
      results[name] = pass ? 'PASS' : 'FAIL/FINDING';
    } catch (cause) {
      results[name] = `ABORTED: ${redactor.redact(String(cause?.message ?? cause))}`;
      if (name === 'L1' || name === 'L5') aborted = name; // no session to continue with
    }
  }

  // Tidy: sign user B out locally. User A's family is left exactly as L4
  // measured it — that residue is the ruling-25 subject and is recorded.
  let tidyB = 'NOT RUN';
  try {
    const { error } = await b1.client.auth.signOut({ scope: 'local' });
    tidyB = error ? `signOut error: ${error.message}` : 'signed out (scope local)';
  } catch (cause) {
    tidyB = `signOut threw: ${String(cause?.message ?? cause)}`;
  }

  const summary = ctx.openTranscript('run-summary.txt', 'Unit F live run — summary');
  summary.line(`run: ${runId} · finished ${new Date().toISOString()}`);
  summary.line(`node ${process.version} · @supabase/supabase-js ${ctx.versions.supabaseJs} (installed) · @supabase/auth-js ${ctx.versions.authJs} (installed)`);
  summary.line(`storage key (extracted from session-storage.ts): '${storageKey}'`);
  summary.line('');
  summary.line('Staging auth posture as observed by this run:');
  summary.line(`  /auth/v1/settings → HTTP 200; disable_signup=${settings.disable_signup}, mailer_autoconfirm=${settings.mailer_autoconfirm}`);
  summary.line('  one-time code delivered as a CODE (owner relayed a 6-digit code from a');
  summary.line('  captured message — SMTP capture and the {{ .Token }} template observed as');
  summary.line('  owner-executed events; the message body itself is sandbox-side, not committed)');
  summary.line('  JWT expiry: see L6 (expires_in observed at sign-in, rotation, and expiry schedule)');
  summary.line('');
  summary.line(`Captured messages consumed by this run: ${ctx.sends} (budget stated before the first send: 3)`);
  summary.line(`Test identities: <user-a-email>, <user-b-email> — disposable, run-namespaced, sandbox-captured (ruling 24)`);
  summary.line('');
  summary.line('Phase results:');
  for (const [name, verdict] of Object.entries(results)) summary.line(`  ${name}: ${verdict}`);
  summary.line('');
  summary.line('Residual staging state (owner-class cleanup, the 004b pattern: deleting the');
  summary.line('two users in Auth → Users cascades away their rows):');
  summary.line('  - two auth users (<user-a-email>, <user-b-email>) with provisioned profiles rows');
  summary.line(`  - user A's token family as L4 left it (see L4-rotation-backstop.txt)`);
  summary.line(`  - user B: ${tidyB}`);
  summary.line('');
  summary.line('The Mailtrap meter reading is sandbox-side state: the owner reports it; the');
  summary.line('README records the report, labelled owner-reported.');
  summary.close(`exit summary written ${new Date().toISOString()}`);

  // In-run totality gate over the exact bytes of every written file.
  const scan = finalScan(process.env.REDACTION_LEDGER, writtenFiles);
  const scanLines = [
    '# In-run redaction totality scan (layer 1 — full ledger + JWT shape over exact file bytes)',
    `run: ${runId} · ${new Date().toISOString()}`,
    `ledger distinct values scanned: ${scan.ledgerDistinct ?? 0}`,
    ...scan.files.map((f) =>
      f.status === 'GREEN'
        ? `GREEN ${f.path.split('/').pop()} sha256=${f.sha256}`
        : `${f.status} ${f.path.split('/').pop()}`,
    ),
    `verdict: ${scan.verdict}`,
    scan.verdict === 'GREEN'
      ? 'Every committed transcript byte was scanned against every registered value.'
      : `RED: ${scan.reason ?? 'residue found; offending files were unlinked'}`,
  ];
  writeFileSync(join(outDir, 'in-run-scan.txt'), scanLines.join('\n') + '\n');
  process.stdout.write(`\n${scanLines.join('\n')}\n`);

  const failed =
    scan.verdict !== 'GREEN' ||
    Object.values(results).some((v) => v !== 'PASS');
  process.stdout.write(
    failed
      ? '\nRun finished with FAIL/FINDING/ABORT entries — see transcripts.\n'
      : '\nRun finished: all phases PASS, redaction GREEN.\n',
  );
  process.exitCode = failed ? 1 : 0;
}

main().catch((cause) => {
  // Redaction may not exist yet if the failure was in construction; print the
  // message only (never a stack that could embed request state).
  process.stderr.write(`live-run failed: ${String(cause?.message ?? cause)}\n`);
  process.exitCode = 1;
});
