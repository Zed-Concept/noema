// Module-resolution hook: maps the bare specifier `expo-secure-store` to an
// inert stub so `src/lib/auth/secure-store-adapter.ts` — which imports it at
// module top level — can load in plain Node.
//
// WHY THIS IS NOT A TEST HOOK IN THE LEARNING-10 SENSE. Nothing in the shipped
// product reads an environment variable or any ambient switch to select a
// backend: `createChunkedSecureStore(backend)` takes the backend as an
// explicit constructor argument with the real keychain as its default. This
// hook exists only so the module can be LOADED outside Expo; the instruments
// then pass their instrumented fake backend explicitly, through the same
// public seam the unit tests use. The stub's own methods THROW on any call,
// so if the adapter's default backend were ever reached in an instrument run,
// the run fails loudly instead of silently measuring a fake.
const STUB_URL = 'noema-unitf-stub:expo-secure-store';

export function resolve(specifier, context, nextResolve) {
  if (specifier === 'expo-secure-store') {
    return { shortCircuit: true, url: STUB_URL };
  }
  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  if (url === STUB_URL) {
    return {
      shortCircuit: true,
      format: 'module',
      source: [
        "const refuse = (name) => {",
        "  throw new Error(",
        "    'expo-secure-store stub: ' + name + ' was called. The instruments must ' +",
        "    'pass their own backend explicitly; reaching the default backend is a ' +",
        "    'defect in the instrument, not a measurement.',",
        "  );",
        "};",
        "export function getItemAsync() { refuse('getItemAsync'); }",
        "export function setItemAsync() { refuse('setItemAsync'); }",
        "export function deleteItemAsync() { refuse('deleteItemAsync'); }",
        "export const WHEN_UNLOCKED = 'stub-when-unlocked-never-used';",
      ].join('\n'),
    };
  }
  return nextLoad(url, context);
}
