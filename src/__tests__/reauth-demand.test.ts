import type { DemandStoreBackend } from '@/lib/auth/reauth-demand';
import { createReauthDemand } from '@/lib/auth/reauth-demand';

/**
 * ADR-009 requirement 2, tested at the module that carries it: the durable
 * re-authentication demand. Every case runs the REAL record/consult/clear
 * logic over an in-memory backend double — the injection seam is a
 * constructor argument with a real default, mirroring the adapter's backend
 * pattern, so nothing here mocks the module under test.
 *
 * What a backend double cannot show, and what is therefore NOT claimed here:
 * that `expo-file-system` actually survives a process restart on a device.
 * That is Phase B's physical-device territory. What IS provable offline is
 * the module's whole contract with its store: what it writes, what it reads
 * back, and which way every failure falls.
 */

function memoryBackend(): DemandStoreBackend & { content: string | null } {
  const backend = {
    content: null as string | null,
    read: async () => backend.content,
    write: async (value: string) => {
      backend.content = value;
    },
    remove: async () => {
      backend.content = null;
    },
  };
  return backend;
}

describe('reauth demand — record, consult, clear', () => {
  it('is not outstanding before anything is recorded', async () => {
    const demand = createReauthDemand(memoryBackend());

    await expect(demand.isOutstanding()).resolves.toBe(false);
    await expect(demand.peek()).resolves.toBeNull();
  });

  it('records a demand and reports it outstanding', async () => {
    const demand = createReauthDemand(memoryBackend());

    await demand.record('session-write-refused');

    await expect(demand.isOutstanding()).resolves.toBe(true);
    await expect(demand.peek()).resolves.toMatchObject({
      v: 1,
      reason: 'session-write-refused',
    });
  });

  it('clears a demand, after which nothing is outstanding', async () => {
    const demand = createReauthDemand(memoryBackend());
    await demand.record('session-purge-pending');

    await demand.clear();

    await expect(demand.isOutstanding()).resolves.toBe(false);
    await expect(demand.peek()).resolves.toBeNull();
  });

  it('survives what a restart resets: a fresh handle over the same backend still sees it', async () => {
    // The restart shape at this module's granularity. Everything
    // process-local about the first handle is gone; the backend — the part a
    // real restart preserves — is all the second handle gets.
    const backend = memoryBackend();
    await createReauthDemand(backend).record('session-write-refused');

    const afterRestart = createReauthDemand(backend);

    await expect(afterRestart.isOutstanding()).resolves.toBe(true);
    await expect(afterRestart.peek()).resolves.toMatchObject({
      v: 1,
      reason: 'session-write-refused',
    });
  });
});

describe('reauth demand — the record contains no secret', () => {
  it('writes exactly a version, a reason, and a timestamp — nothing else', async () => {
    // The dispatch's bar, asserted structurally rather than described: "a
    // flag, a reason, a timestamp, nothing from the session". The exact key
    // set is the claim — a future field carrying a token, a key name, or any
    // session material would fail this before a reviewer had to find it.
    const backend = memoryBackend();
    await createReauthDemand(backend).record('session-write-refused');

    const written = JSON.parse(backend.content as string) as Record<string, unknown>;
    expect(Object.keys(written).sort()).toEqual(['at', 'reason', 'v']);
    expect(written.v).toBe(1);
    expect(written.reason).toBe('session-write-refused');
    // A parseable ISO-8601 instant, and only an instant.
    expect(typeof written.at).toBe('string');
    expect(Number.isNaN(Date.parse(written.at as string))).toBe(false);
  });
});

describe('reauth demand — every failure falls closed', () => {
  it('record rejects when the store refuses the write', async () => {
    const backend = memoryBackend();
    backend.write = async () => {
      throw new Error('disk full');
    };
    const demand = createReauthDemand(backend);

    // The caller must not proceed as though durability was achieved —
    // `session-storage.ts` turns this rejection into its recorded fallback.
    await expect(demand.record('session-write-refused')).rejects.toThrow('disk full');
  });

  it('isOutstanding rejects when the store refuses to answer', async () => {
    const backend = memoryBackend();
    backend.read = async () => {
      throw new Error('io error');
    };
    const demand = createReauthDemand(backend);

    // Refusal is not absence — the same invariant the adapter's reads hold.
    // The provider maps this rejection to "outstanding".
    await expect(demand.isOutstanding()).rejects.toThrow('io error');
  });

  it('clear rejects when the store refuses the removal, and the demand remains', async () => {
    const backend = memoryBackend();
    await createReauthDemand(backend).record('session-purge-pending');
    backend.remove = async () => {
      throw new Error('busy');
    };
    const demand = createReauthDemand(backend);

    await expect(demand.clear()).rejects.toThrow('busy');
    await expect(demand.isOutstanding()).resolves.toBe(true);
  });

  it('treats unparseable stored content as outstanding, not as absent', async () => {
    // A half-written record is still a record that a demand was being made.
    // `peek` declines to interpret it; `isOutstanding` does not excuse it.
    const backend = memoryBackend();
    backend.content = '{"v":1,"reas';
    const demand = createReauthDemand(backend);

    await expect(demand.isOutstanding()).resolves.toBe(true);
    await expect(demand.peek()).resolves.toBeNull();
  });

  it('treats content of the wrong shape as outstanding through isOutstanding', async () => {
    const backend = memoryBackend();
    backend.content = JSON.stringify({ v: 2, reason: 'something-else' });
    const demand = createReauthDemand(backend);

    await expect(demand.isOutstanding()).resolves.toBe(true);
    await expect(demand.peek()).resolves.toBeNull();
  });
});
