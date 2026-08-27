// Extracts exactly the two owner-held staging values from the repo-root .env
// (gitignored — the OPERATIONS.md hand-off pattern, ruling 10 / ruling 24),
// falling back to the process environment. The file is parsed line-by-line
// for the two named variables only; it is never sourced, and no other
// variable is read. Values are returned to the caller for immediate
// redaction registration and are never printed by this module.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const URL_NAME = 'EXPO_PUBLIC_SUPABASE_URL';
const KEY_NAME = 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY';

function parseDotenvLine(line, name) {
  if (!line.startsWith(`${name}=`)) return null;
  let value = line.slice(name.length + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value.length > 0 ? value : null;
}

export function loadStagingEnv(repoRoot) {
  let url = null;
  let key = null;

  try {
    const raw = readFileSync(join(repoRoot, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      url = url ?? parseDotenvLine(line.trim(), URL_NAME);
      key = key ?? parseDotenvLine(line.trim(), KEY_NAME);
    }
  } catch {
    // No .env — fall through to the process environment.
  }

  url = url ?? process.env[URL_NAME] ?? null;
  key = key ?? process.env[KEY_NAME] ?? null;

  if (!url || !key) {
    throw new Error(
      `Staging env is not available: ${URL_NAME} and ${KEY_NAME} must both be ` +
        `present in the repo-root .env (owner-filled, gitignored) or the ` +
        `environment. Neither value was found.`,
    );
  }
  if (!url.startsWith('https://')) {
    throw new Error(`${URL_NAME} does not look like an https URL; refusing to run.`);
  }

  const host = new URL(url).host;
  const projectRef = host.split('.')[0];
  return { url, key, host, projectRef };
}
