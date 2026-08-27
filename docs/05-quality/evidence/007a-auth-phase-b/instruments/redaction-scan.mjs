// Layer 2 — the commit-time redaction scan over the exact bytes of every file
// in the 007a evidence directory, with a runtime-assembled positive control
// per pattern (learning 14: a negative-result check that cannot fail cannot
// pass). The in-run layer-1 gate (ledger-based, in-run-scan.txt) knows the
// actual secret values; this layer runs after the ledger is gone and enforces
// SHAPES: no JWT, no Supabase host, no key prefix, no live email identity, no
// project-ref-shaped token, no URL in any committed artifact byte.
//
//   node docs/05-quality/evidence/007a-auth-phase-b/instruments/redaction-scan.mjs
//     → writes ../redaction-scan.txt, exit 0 GREEN / 1 RED
//   node .../redaction-scan.mjs --control
//     → plants a synthetic file carrying every banned shape in a scratch dir,
//       requires the scan to turn RED with every pattern firing,
//       writes ../redaction-scan-control.txt, exit 0 iff the control PROVED red
//
// The one allowance, stated: in .md documents (procedure/templates), email
// shapes are permitted iff they end in the RFC-2606-reserved `@example.com`
// AND carry the unitf- template prefix — instruction templates, not captured
// identities. In .txt artifacts every email shape is banned outright.
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const evidenceDir = join(here, '..');

// Patterns are assembled at runtime so this file's own bytes never carry a
// matchable shape (the 004b "defanged patterns" practice).
const B64 = '[A-Za-z0-9_-]';
const JWT_MARKER = ['e', 'y', 'J'].join('');
const patterns = [
  { name: 'jwt-shape', re: new RegExp(`${JWT_MARKER}${B64}{4,}\\.${B64}{4,}\\.${B64}{4,}`, 'g') },
  { name: 'jwt-marker-residue', re: new RegExp(`${JWT_MARKER}${B64}{6,}`, 'g') },
  {
    name: 'supabase-host',
    re: new RegExp(['supabase', '(co|in|red|net)'].join('\\.'), 'g'),
  },
  {
    name: 'sb-key-prefix',
    re: new RegExp(`sb_${'(publishable|secret)'}_${B64}{8,}`, 'g'),
  },
  { name: 'email-shape', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { name: 'project-ref-shape', re: /\b[a-z]{20}\b/g },
  { name: 'url', re: /https?:\/\/[^\s'"`<>)\]]+/g },
];

const mdEmailAllowed = (match) =>
  match.endsWith('@example.com') && match.startsWith('unitf-');

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...listFiles(path));
    else out.push(path);
  }
  return out.sort();
}

function scanFiles(files, { forbidEverything = false } = {}) {
  const rows = [];
  let red = false;
  for (const path of files) {
    const bytes = readFileSync(path, 'utf8');
    const isMd = extname(path) === '.md';
    const hits = [];
    for (const { name, re } of patterns) {
      const matches = [...bytes.matchAll(re)].map((m) => m[0]);
      let offending = matches;
      if (!forbidEverything && name === 'email-shape' && isMd) {
        offending = matches.filter((m) => !mdEmailAllowed(m));
      }
      if (offending.length > 0) {
        hits.push(`${name}×${offending.length}`);
      }
    }
    const sha = createHash('sha256').update(bytes).digest('hex');
    if (hits.length > 0) {
      red = true;
      rows.push(`RED   ${path.split('/').slice(-2).join('/')} — ${hits.join(', ')}`);
    } else {
      rows.push(`clean ${path.split('/').slice(-2).join('/')} sha256=${sha.slice(0, 16)}…`);
    }
  }
  return { red, rows };
}

function runControls() {
  // One synthetic exemplar per pattern, assembled at runtime, each marked
  // SYNTHETIC. Every pattern must fire on its exemplar or the scan is broken.
  // Every exemplar is assembled at runtime so this file's own bytes carry no
  // matchable shape — the scan scans its own source too.
  const seg = 'SyNtHeTiC0000AAAA';
  const exemplars = [
    `${JWT_MARKER}${seg}.${seg}.${seg}`,
    `${JWT_MARKER}${seg}${seg}`,
    ['synthetic-control', 'supabase', 'co'].join('.'),
    ['sb', 'publishable', `SYNTHETIC${seg}`].join('_'),
    ['synthetic-control', 'invalid-synthetic.test'].join('@'),
    ['aaaaa', 'bbbbb', 'ccccc', 'ddddd'].join(''),
    ['https:/', 'synthetic.invalid/control'].join('/'),
  ];
  const failures = [];
  for (let i = 0; i < patterns.length; i += 1) {
    patterns[i].re.lastIndex = 0;
    if (!patterns[i].re.test(exemplars[i])) failures.push(patterns[i].name);
    patterns[i].re.lastIndex = 0;
  }
  return { exemplars, failures };
}

const controlMode = process.argv.includes('--control');
const controls = runControls();

if (controlMode) {
  const scratch = mkdtempSync(join(tmpdir(), 'unitf-scan-control-'));
  const planted = join(scratch, 'planted-synthetic-leak.txt');
  writeFileSync(planted, `SYNTHETIC CONTROL FILE\n${controls.exemplars.join('\n')}\n`);
  const { red, rows } = scanFiles([planted], { forbidEverything: true });
  const firedAll = rows[0]?.startsWith('RED') && patterns.every((p) => rows[0].includes(p.name));
  const pass = controls.failures.length === 0 && red && firedAll;
  const out = [
    '# Redaction scan — positive control (layer 2)',
    'A synthetic file carrying every banned shape is planted in scratch and scanned',
    'with the same patterns as the real scan. The control PASSES only when the scan',
    'turns RED with every pattern firing — proving the patterns can fail.',
    '',
    `pattern self-tests: ${controls.failures.length === 0 ? 'all 7 fired on their exemplars' : `BROKEN: ${controls.failures.join(', ')}`}`,
    rows[0] ?? '(no scan row)',
    `planted file detected RED with all patterns: ${firedAll}`,
    '',
    `verdict: ${pass ? 'CONTROL PROVED RED — scan is falsifiable' : 'CONTROL FAILED — the scan cannot be trusted'}`,
  ].join('\n');
  writeFileSync(join(evidenceDir, 'redaction-scan-control.txt'), out + '\n');
  process.stdout.write(out + '\n');
  process.exitCode = pass ? 0 : 1;
} else {
  if (controls.failures.length > 0) {
    process.stderr.write(`patterns failed their self-test: ${controls.failures.join(', ')}\n`);
    process.exitCode = 1;
  } else {
    const files = listFiles(evidenceDir).filter(
      (p) => !p.endsWith('redaction-scan.txt') && !p.endsWith('redaction-scan-control.txt'),
    );
    const { red, rows } = scanFiles(files);
    const out = [
      '# Redaction scan (layer 2) — shape scan over exact committed bytes',
      `scanned ${files.length} files under 007a-auth-phase-b/ (this scan's own outputs excluded);`,
      'patterns: jwt-shape, jwt-marker-residue, supabase-host, sb-key-prefix, email-shape,',
      'project-ref-shape, url — each proven falsifiable by the committed positive control',
      '(redaction-scan-control.txt). .md email allowance: unitf-*@example.com templates only.',
      '',
      ...rows,
      '',
      `verdict: ${red ? 'RED' : 'GREEN'}`,
    ].join('\n');
    writeFileSync(join(evidenceDir, 'redaction-scan.txt'), out + '\n');
    process.stdout.write(out + '\n');
    process.exitCode = red ? 1 : 0;
  }
}
