import { Buffer } from 'node:buffer';

// The instrumented fake backend: an in-memory implementation of the adapter's
// `SecureStoreBackend` seam (its declared constructor argument — the same
// public seam the unit tests use). The SESSION persisted through it is real;
// SecureStore stays offline. Every operation is logged with byte sizes so the
// chunk behaviour of the real payload is observable. Values are held in
// memory only and are never printed by this module.
export function createInstrumentedBackend(label) {
  const store = new Map();
  const ops = []; // { op, key, bytes|null, at }

  return {
    label,
    store,
    ops,
    backend: {
      getItemAsync: async (key) => {
        const value = store.has(key) ? store.get(key) : null;
        ops.push({ op: 'get', key, bytes: value === null ? null : Buffer.byteLength(value, 'utf8'), at: Date.now() });
        return value;
      },
      setItemAsync: async (key, value) => {
        ops.push({ op: 'set', key, bytes: Buffer.byteLength(value, 'utf8'), at: Date.now() });
        store.set(key, value);
      },
      deleteItemAsync: async (key) => {
        ops.push({ op: 'delete', key, bytes: null, at: Date.now() });
        store.delete(key);
      },
    },
  };
}

/** Keys currently present, sorted — key names only, never values. */
export function presentKeys(instrumented) {
  return [...instrumented.store.keys()].sort();
}

/** Op-log slice since a given index, summarised as printable lines (no values). */
export function summariseOps(instrumented, fromIndex) {
  return instrumented.ops
    .slice(fromIndex)
    .map(({ op, key, bytes }) => `${op} ${key}${bytes === null ? '' : ` (${bytes} B)`}`);
}
