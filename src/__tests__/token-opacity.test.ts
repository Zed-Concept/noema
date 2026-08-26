import * as ts from 'typescript';

// `require` rather than `import ... from 'node:fs'`, deliberately. This
// project's `tsconfig.json` sets `types: ["jest"]`, so Node's globals are
// intentionally out of scope; pulling `@types/node` in to satisfy one test
// would widen the project's type surface and add a declared devDependency for
// no product gain. REVIEW-020's RED-lane check records that this unit's only
// dependency addition is `expo-secure-store`, and that stays true. The same
// idiom is already used in `session-storage-platform.test.ts`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readFileSync } = require('fs') as {
  readFileSync: (path: string, encoding: string) => string;
};

/**
 * ADR-004's token-opacity constraint, enforced by a SOURCE SCAN.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT A BEHAVIOURAL TEST
 * ---------------------------------------------------------------------------
 *
 * REVIEW-019 finding 7 and REVIEW-020 finding 3 are the same defect twice. The
 * adapter must "never mint, parse, validate, or refresh a token" (ADR-004), and
 * fix cycle 1 tried to prove that with black-box tests: invalid JSON in, and a
 * mutant that inserted a bare `JSON.parse(value)` so the payload threw.
 *
 * That measures whether parsing CHANGES THE RESULT, not whether parsing occurs.
 * REVIEW-020 made the point concrete by inserting
 *
 *     try { JSON.parse(value); } catch {}
 *
 * into the adapter. Three opacity tests passed, all 48 adapter tests passed,
 * and typecheck, lint, and format check passed. A behaviour-preserving parse is
 * undetectable by black-box test BY DEFINITION — the property is about what the
 * code does, not about what it returns.
 *
 * So the instrument has to read the source. This one parses the adapter with
 * the TypeScript compiler and walks its AST.
 *
 * ---------------------------------------------------------------------------
 * WHY AN AST AND NOT A GREP
 * ---------------------------------------------------------------------------
 *
 * The adapter contains one legitimate `JSON.parse`: `parseIndex` parses the
 * INDEX, which this adapter wrote and which is not token material. A textual
 * ban on `JSON.parse` would flag it, and a ban that has to be suppressed at its
 * only real hit is a ban nobody will keep. The AST is what distinguishes "parse
 * the index" from "parse the payload": the rule below is that `JSON.parse` may
 * appear only inside `parseIndex`, and that is a question about the enclosing
 * function, not about the line.
 *
 * ---------------------------------------------------------------------------
 * POSITIVE CONTROLS — learning 14
 * ---------------------------------------------------------------------------
 *
 * "Every negative-result check validates its pattern against a positive
 * control. A check that reports '0 hits' is indistinguishable from a check
 * whose pattern silently stopped matching." Each rule below is run against a
 * synthetic source that DOES contain what it looks for, and the suite fails if
 * any rule fails to fire on its own control. An instrument that cannot fail
 * cannot pass.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS DOES NOT DETECT — read this before crediting it with anything
 * ---------------------------------------------------------------------------
 *
 * This scanner is SYNTACTIC. It recognises the constructs it names, spelled the
 * way it names them, and nothing else. REVIEW-021 finding 3 proved the gap with
 * a build-valid equivalent that survived all eight opacity assertions and all
 * behavioural adapter tests:
 *
 *     const parsePayload = JSON.parse;
 *     try {
 *       parsePayload(value);
 *     } catch {}
 *
 * The visitor matches a property access whose receiver is literally the
 * identifier `JSON`. It does not follow aliases, and the same indirection
 * defeats the method-name and decoder lists. That survivor is kept as an
 * EXECUTABLE RECORD at the bottom of this file, so the boundary cannot quietly
 * be forgotten and the deleted claim cannot quietly return.
 *
 * So the claim was cut to fit the instrument. This suite does NOT establish
 * that the adapter never parses or inspects the payload — that is a
 * whole-program property and this is a syntactic scan of one file. It
 * establishes that no DIRECTLY SPELLED parse or inspection is present in the
 * adapter source. REVIEW-019 finding 7, REVIEW-020 finding 3 and REVIEW-021
 * finding 3 are the same claim outrunning the same instrument three times; per
 * the controller's stop rule the remedy is subtraction, not a fourth scanner
 * with a wider whitelist. The binding opacity property of ADR-004 rests on
 * source review, and the reviewer of record has confirmed by direct reading, in
 * each of those three reviews, that the current adapter does not parse tokens.
 */

/** Relative to the jest `rootDir`, which is the project root. */
const ADAPTER_PATH = 'src/lib/auth/secure-store-adapter.ts';

type Violation = { readonly rule: string; readonly line: number; readonly snippet: string };

/** `JSON.parse` is permitted only here — the index parser. */
const INDEX_PARSER = 'parseIndex';

/** Decoders that would turn an opaque payload into inspectable structure. */
const BANNED_CALLEES = new Set(['atob', 'decodeURIComponent', 'unescape', 'escape']);

/**
 * String methods that inspect or reshape a value's CONTENT.
 *
 * `slice`, `join`, `push`, `charCodeAt` and `codePointAt` are deliberately
 * absent: those are the operations chunking and checksumming are built from,
 * and ADR-004 permits deriving exactly length and a checksum.
 */
const BANNED_METHODS = new Set([
  'split',
  'match',
  'matchAll',
  'replace',
  'replaceAll',
  'search',
  'indexOf',
  'lastIndexOf',
  'includes',
  'startsWith',
  'endsWith',
  'substring',
  'substr',
  'toLowerCase',
  'toUpperCase',
  'trim',
  'test',
  'exec',
]);

function enclosingFunctionName(node: ts.Node): string | null {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
    if (
      (ts.isFunctionExpression(current) || ts.isArrowFunction(current)) &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    ) {
      return current.parent.name.text;
    }
  }
  return null;
}

function scanForTokenInspection(sourceText: string, fileName: string): Violation[] {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);
  const violations: Violation[] = [];

  const record = (rule: string, node: ts.Node): void => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    violations.push({ rule, line: line + 1, snippet: node.getText(source).slice(0, 80) });
  };

  const visit = (node: ts.Node): void => {
    // A regular expression is a parsing instrument. The adapter has no use for
    // one: its only derived key is a template literal.
    if (ts.isRegularExpressionLiteral(node)) record('regex-literal', node);

    if (ts.isCallExpression(node)) {
      const callee = node.expression;

      if (ts.isIdentifier(callee) && BANNED_CALLEES.has(callee.text)) {
        record('decoder-call', node);
      }

      if (ts.isPropertyAccessExpression(callee)) {
        const method = callee.name.text;
        const receiver = callee.expression;

        // The rule finding 3 exists for. `JSON.parse` is allowed only inside
        // the index parser; anywhere else it is parsing token material.
        if (ts.isIdentifier(receiver) && receiver.text === 'JSON' && method === 'parse') {
          if (enclosingFunctionName(node) !== INDEX_PARSER) {
            record('json-parse-outside-index', node);
          }
        }

        if (BANNED_METHODS.has(method)) record('string-inspection', node);

        if (
          ts.isPropertyAccessExpression(receiver) &&
          ts.isIdentifier(receiver.expression) &&
          receiver.expression.text === 'Buffer' &&
          receiver.name.text === 'from'
        ) {
          record('decoder-call', node);
        }
        if (ts.isIdentifier(receiver) && receiver.text === 'Buffer' && method === 'from') {
          record('decoder-call', node);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return violations;
}

/** Each control is a source that MUST trip its named rule. */
const POSITIVE_CONTROLS: readonly { rule: string; source: string }[] = [
  {
    // REVIEW-020's exact disposable violation, verbatim.
    rule: 'json-parse-outside-index',
    source: `
      async function getItemBody(key: string) {
        const value = await read(key);
        try {
          JSON.parse(value);
        } catch {}
        return value;
      }
    `,
  },
  {
    rule: 'decoder-call',
    source: `function peek(value: string) { return atob(value); }`,
  },
  {
    rule: 'decoder-call',
    source: `function peek(value: string) { return Buffer.from(value, 'base64'); }`,
  },
  {
    rule: 'string-inspection',
    source: `function peek(value: string) { return value.split('.')[1]; }`,
  },
  {
    rule: 'regex-literal',
    source: `function peek(value: string) { return /^ey[A-Za-z0-9]+\\./.test(value); }`,
  },
];

describe('token opacity — no directly-spelled payload parse or inspection', () => {
  it('finds no directly-spelled token inspection in the adapter source', () => {
    const source = readFileSync(ADAPTER_PATH, 'utf8');

    const violations = scanForTokenInspection(source, ADAPTER_PATH);

    // Printed rather than counted, so a failure names the line and the rule
    // instead of reporting a number that has to be investigated.
    expect(violations).toEqual([]);
  });

  it('permits exactly one directly-spelled JSON.parse, only inside the index parser', () => {
    const source = readFileSync(ADAPTER_PATH, 'utf8');
    const parsed = ts.createSourceFile(ADAPTER_PATH, source, ts.ScriptTarget.Latest, true);

    const sites: string[] = [];
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'JSON' &&
        node.expression.name.text === 'parse'
      ) {
        sites.push(enclosingFunctionName(node) ?? '<module scope>');
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(parsed, visit);

    // The index is this adapter's own metadata, not token material. Pinning the
    // count as well as the location is what stops a second parse being added
    // beside the sanctioned one.
    expect(sites).toEqual([INDEX_PARSER]);
  });

  describe('positive controls — learning 14', () => {
    it.each(POSITIVE_CONTROLS.map((c, i) => [i, c.rule, c.source] as const))(
      'control %i trips rule "%s"',
      (_index, rule, source) => {
        const violations = scanForTokenInspection(source, 'control.ts');

        // If this is ever empty, the rule has silently stopped matching and the
        // clean scan above means nothing.
        expect(violations.map((v) => v.rule)).toContain(rule);
      },
    );

    it('does not fire on the sanctioned index parse', () => {
      // The false positive the AST exists to avoid. A textual ban on
      // `JSON.parse` would flag this, and the whole rule would be suppressed.
      const sanctioned = `
        function parseIndex(raw: string) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return null;
          }
          return parsed;
        }
      `;

      expect(scanForTokenInspection(sanctioned, 'control.ts')).toEqual([]);
    });
  });

  describe("the known survivor — an executable record of this scan's limit", () => {
    /**
     * REVIEW-021 finding 3's counterexample, kept rather than fixed.
     *
     * This is the same device 005c used for the checksum collision: the claim
     * that outran the instrument is deleted, and the thing that disproved it is
     * kept as a test so it cannot be quietly re-asserted. A future cycle that
     * widens the whitelist until this goes green will find this test turn red
     * and have to say so.
     *
     * These assertions are the SHAPE OF THE HOLE, not a passing property. Do
     * not read a green run here as evidence of opacity.
     */
    it('does NOT detect an aliased JSON.parse — the claim was narrowed, not rescued', () => {
      const aliased = `
        const parsePayload = JSON.parse;
        function setItem(key: string, value: string) {
          try {
            parsePayload(value);
          } catch {}
          return value;
        }
      `;

      // Empty. The scanner walks past it, which is exactly why this suite no
      // longer claims the adapter "never parses" anything.
      expect(scanForTokenInspection(aliased, 'survivor.ts')).toEqual([]);
    });

    it('does NOT detect an aliased content inspection either', () => {
      // The same indirection defeats the method-name list, so the limit is a
      // property of the approach and not of one missing entry in one set.
      const aliased = `
        function peek(value: string) {
          const inspect = value.split;
          return inspect.call(value, '.')[1];
        }
      `;

      expect(scanForTokenInspection(aliased, 'survivor.ts')).toEqual([]);
    });
  });
});
