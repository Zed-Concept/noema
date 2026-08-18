/**
 * Staging connectivity check — run manually, never in CI (CI has no Supabase
 * credentials and must not gain any).
 *
 * Usage (values are owner-held; never commit them):
 *   EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
 *     node scripts/check-supabase-connectivity.ts
 *
 * Requires Node 24+ (runs TypeScript natively). Exit 0 = all checks passed;
 * exit 1 = a check failed; exit 2 = environment not configured. All output is
 * redacted: the URL and key never appear in it, including inside error text.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.log(
    'NOT CONFIGURED: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  );
  process.exit(2);
}

// Computed once, guarded: redact() must be total — if it could throw (e.g. on
// a malformed URL value), the failure path would print the raw value instead
// of the redacted one.
let host = '';
try {
  host = new URL(url!).host;
} catch {
  host = '';
}

function redact(text: string): string {
  let out = text.split(url!).join('<staging-url>').split(key!).join('<publishable-key>');
  if (host) out = out.split(host).join('<staging-host>');
  return out;
}

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];

function record(name: string, pass: boolean, detail: string): void {
  checks.push({ name, pass, detail: redact(detail) });
}

async function main(): Promise<void> {
  // Import lazily so a missing-env failure above is reported by this script,
  // not by the module's own throw. This exercises the real shared client.
  const { supabase } = await import('../src/lib/supabase.ts');

  // 1. The shared client instantiates from env and answers auth.getSession
  //    without error. This is a local check, not a network call: with
  //    persistSession off there is no stored session, so it proves the client
  //    constructs and its auth surface answers (session null, no error).
  try {
    const { data, error } = await supabase.auth.getSession();
    record(
      'client auth.getSession (local)',
      error === null && data.session === null,
      error === null
        ? 'no error, session null (local storage read; no network)'
        : `error: ${error.message}`,
    );
  } catch (e) {
    record('client auth.getSession (local)', false, `threw: ${String(e)}`);
  }

  // 2. The shared client reaches PostgREST and the key is accepted: selecting
  //    from a table that does not exist must return a PostgREST schema-cache
  //    error (PGRST…), not an invalid-key rejection and not a network failure.
  try {
    const { error } = await supabase
      .from('_connectivity_probe_' as never)
      .select('*')
      .limit(1);
    const code = error?.code ?? '';
    record(
      'client REST round-trip',
      /^PGRST/.test(code),
      error
        ? `PostgREST answered with code ${code} (${error.message})`
        : 'unexpected success — probe table should not exist',
    );
  } catch (e) {
    record('client REST round-trip', false, `threw: ${String(e)}`);
  }

  // 3. REST health, independent of supabase-js: a raw fetch to a table route
  //    must get PostgREST's structured 404 (PGRST205) for the nonexistent
  //    probe table. Note: the OpenAPI root `/rest/v1/` is NOT probed — the
  //    gateway restricts it to secret API keys ("Secret API key required"),
  //    and builders hold publishable keys only.
  try {
    const res = await fetch(`${url}/rest/v1/_connectivity_probe_?select=*&limit=1`, {
      headers: { apikey: key! },
    });
    const body: { code?: string } = await res.json();
    record(
      'raw REST table route',
      res.status === 404 && body.code === 'PGRST205',
      `HTTP ${res.status}, code ${body.code ?? '<none>'}`,
    );
  } catch (e) {
    record('raw REST table route', false, `threw: ${String(e)}`);
  }

  // 4. Auth service health endpoint answers HTTP 200.
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key! } });
    record('auth /auth/v1/health', res.status === 200, `HTTP ${res.status}`);
  } catch (e) {
    record('auth /auth/v1/health', false, `threw: ${String(e)}`);
  }

  const passed = checks.filter((c) => c.pass).length;
  for (const c of checks) {
    console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name} — ${c.detail}`);
  }
  console.log(`${passed}/${checks.length} checks passed`);
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((e) => {
  console.log(`FATAL: ${redact(String(e))}`);
  process.exit(1);
});
