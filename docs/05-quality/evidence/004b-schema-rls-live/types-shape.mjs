#!/usr/bin/env node
/**
 * types-shape.mjs — deterministic extraction of the public-schema
 * table -> Row-column map from the committed src/lib/database.types.ts.
 *
 * Produces types-shape.txt (gated): the declared shape rls-probes.mjs
 * compares live REST row keys against. This is the "probe consistency"
 * half of the indirect verification of the owner-regenerated types file
 * (ruling 10: generation is owner-executed; builders hold no access token
 * and cannot regenerate) — the other half is the repo typecheck in
 * gates.txt.
 *
 * Deterministic by construction: the input is one committed file and the
 * output is sorted table-by-table, column-by-column. Fails closed (exit 1)
 * if the generator structure is not found or any table extracts zero
 * columns.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function extractTypesShape(source) {
  const tablesStart = source.indexOf('Tables: {');
  const viewsStart = source.indexOf('Views: {');
  if (tablesStart === -1 || viewsStart === -1 || viewsStart < tablesStart) {
    throw new Error('unexpected database.types.ts structure: Tables/Views blocks not found');
  }
  const tablesBlock = source.slice(tablesStart, viewsStart);
  const shape = new Map();
  const tableRe = /(\w+): \{\s*Row: \{([\s\S]*?)\};\s*Insert: \{/g;
  let tableMatch;
  while ((tableMatch = tableRe.exec(tablesBlock)) !== null) {
    const table = tableMatch[1];
    const columns = [];
    const colRe = /^\s*(\w+):/gm;
    let colMatch;
    while ((colMatch = colRe.exec(tableMatch[2])) !== null) {
      columns.push(colMatch[1]);
    }
    if (columns.length === 0) {
      throw new Error(`table ${table}: zero Row columns extracted`);
    }
    shape.set(table, columns.sort());
  }
  if (shape.size === 0) {
    throw new Error('zero tables extracted from the Tables block');
  }
  return shape;
}

export function repoRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  try {
    const typesPath = join(repoRoot(), 'src', 'lib', 'database.types.ts');
    const shape = extractTypesShape(readFileSync(typesPath, 'utf8'));
    console.log('# public-schema table -> Row columns declared by src/lib/database.types.ts');
    console.log('# (sorted; produced by types-shape.mjs; consumed by rls-probes.mjs)');
    for (const table of [...shape.keys()].sort()) {
      console.log(`${table}: ${shape.get(table).join(', ')}`);
    }
    console.log(`tables: ${shape.size}`);
  } catch (e) {
    console.log(`FAIL: ${String(e && e.message ? e.message : e)}`);
    process.exit(1);
  }
}
