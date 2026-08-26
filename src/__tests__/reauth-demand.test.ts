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

describe('reauth demand — a refused record is held, not lost (ruling 25)', () => {
  /** A backend whose write refuses until told otherwise. */
  function refusingBackend() {
    const backend = memoryBackend();
    const acceptingWrite = backend.write;
    let refuse = true;
    backend.write = async (value: string) => {
      if (refuse) throw new Error('disk full');
      await acceptingWrite(value);
    };
    return { backend, recover: () => (refuse = false) };
  }

  it('holds the demand in memory when the store refuses the write', async () => {
    // REVIEW-023 finding 1 withdrew the rejecting version: record() now NEVER
    // rejects. A refused write reports `held`, nothing is durable yet, and
    // the demand still exists — outstanding to this process, visible to peek.
    const { backend } = refusingBackend();
    const demand = createReauthDemand(backend);

    await expect(demand.record('session-write-refused')).resolves.toBe('held');

    expect(backend.content).toBeNull();
    await expect(demand.isOutstanding()).resolves.toBe(true);
    await expect(demand.peek()).resolves.toMatchObject({ reason: 'session-write-refused' });
  });

  it('reports `durable` and holds nothing when the write lands', async () => {
    const backend = memoryBackend();
    const demand = createReauthDemand(backend);

    await expect(demand.record('session-write-refused')).resolves.toBe('durable');

    expect(backend.content).not.toBeNull();
    await expect(demand.retryHeldRecord()).resolves.toBe(true);
  });

  it('retryHeldRecord flushes a held demand once the store recovers — and a fresh handle sees it', async () => {
    // Ruling 25's retry, proven to the restart boundary: the flush is what
    // makes the demand durable, so the record must be visible to a fresh
    // handle over the same backend — everything held in memory gone.
    const { backend, recover } = refusingBackend();
    const demand = createReauthDemand(backend);
    await demand.record('session-purge-pending');
    await expect(demand.retryHeldRecord()).resolves.toBe(false);
    expect(backend.content).toBeNull();

    recover();
    await expect(demand.retryHeldRecord()).resolves.toBe(true);

    expect(backend.content).not.toBeNull();
    const afterRestart = createReauthDemand(backend);
    await expect(afterRestart.isOutstanding()).resolves.toBe(true);
    await expect(afterRestart.peek()).resolves.toMatchObject({ reason: 'session-purge-pending' });
  });

  it('a held demand does not survive what a restart resets — the ruling-25 Known limit, stated', async () => {
    // The one schedule ruling 25 leaves open: every medium refuses and the
    // process dies before any recovers. A fresh handle over the same backend
    // is that death at this module's granularity, and it finds nothing —
    // recorded here as the limit's exact shape, bounded server-side by
    // Supabase's refresh-token rotation (the residual's token is already
    // consumed). Unit F measures that backstop live.
    const { backend } = refusingBackend();
    await createReauthDemand(backend).record('session-write-refused');

    const afterRestart = createReauthDemand(backend);

    await expect(afterRestart.isOutstanding()).resolves.toBe(false);
  });

  it('reports a held demand outstanding without needing the backend to answer', async () => {
    // Held short-circuits the read: a store refusing BOTH directions still
    // cannot make this process forget the demand it is holding.
    const backend = memoryBackend();
    backend.write = async () => {
      throw new Error('disk full');
    };
    backend.read = async () => {
      throw new Error('io error');
    };
    const demand = createReauthDemand(backend);
    await demand.record('session-write-refused');

    await expect(demand.isOutstanding()).resolves.toBe(true);
  });

  it('clear ends a held demand — read-back proof is the one thing that may', async () => {
    const { backend } = refusingBackend();
    const demand = createReauthDemand(backend);
    await demand.record('session-purge-pending');
    await expect(demand.isOutstanding()).resolves.toBe(true);

    await demand.clear();

    await expect(demand.isOutstanding()).resolves.toBe(false);
    await expect(demand.retryHeldRecord()).resolves.toBe(true);
    expect(backend.content).toBeNull();
  });

  it('retryHeldRecord is a no-op resolving true when nothing is held', async () => {
    const backend = memoryBackend();
    const writes: string[] = [];
    const originalWrite = backend.write;
    backend.write = async (value: string) => {
      writes.push(value);
      await originalWrite(value);
    };

    await expect(createReauthDemand(backend).retryHeldRecord()).resolves.toBe(true);

    expect(writes).toHaveLength(0);
  });
});

describe('reauth demand — every other failure falls closed', () => {
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

/**
 * REVIEW-023-ADVISORY lead 2 (E1) — the SHIPPED file backend consults by
 * READ. The previous backend gated on `File.exists` alone, so a native layer
 * reporting `exists === false` under an I/O refusal would have read a
 * refusal as "no demand"; the advisory's E1 probe demonstrated the residual
 * session being loaded, rotated, and exposed under exactly that lie. These
 * cases drive the DEFAULT (file) backend through a mocked `expo-file-system`
 * — whether the INSTALLED package can actually produce the lying answer
 * remains NOT RUN offline (Known limit; Phase B's physical device owns it).
 */
describe('reauth demand — the shipped file backend consults by READ (advisory E1)', () => {
  function loadFileBackedDemand(impl: { existsImpl: () => boolean; textImpl: () => string }) {
    let handle: import('@/lib/auth/reauth-demand').ReauthDemandHandle | undefined;
    jest.isolateModules(() => {
      jest.doMock('expo-file-system', () => ({
        File: class {
          get exists(): boolean {
            return impl.existsImpl();
          }
          textSync(): string {
            return impl.textImpl();
          }
          write(_value: string): void {}
          delete(): void {}
        },
        Paths: { document: {} },
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      handle = (require('@/lib/auth/reauth-demand') as typeof import('@/lib/auth/reauth-demand'))
        .reauthDemand;
    });
    return handle as import('@/lib/auth/reauth-demand').ReauthDemandHandle;
  }

  it('reads the record even when `exists` denies it — the boolean is never the sole gate', async () => {
    // The advisory's lying-exists shape: the record is there and readable,
    // `exists` says false. The read leads, so the demand is OUTSTANDING.
    const demand = loadFileBackedDemand({
      existsImpl: () => false,
      textImpl: () => JSON.stringify({ v: 1, reason: 'session-write-refused', at: 'sometime' }),
    });

    await expect(demand.isOutstanding()).resolves.toBe(true);
  });

  it('treats an unreadable existing record as outstanding', async () => {
    const demand = loadFileBackedDemand({
      existsImpl: () => true,
      textImpl: () => {
        throw new Error('io refusal');
      },
    });

    await expect(demand.isOutstanding()).rejects.toThrow('io refusal');
  });

  it('treats a record whose existence cannot be determined as outstanding', async () => {
    const demand = loadFileBackedDemand({
      existsImpl: () => {
        throw new Error('exists refused');
      },
      textImpl: () => {
        throw new Error('io refusal');
      },
    });

    await expect(demand.isOutstanding()).rejects.toThrow();
  });

  it('reads a provably absent record as no demand', async () => {
    // The fresh-install case, which must stay a clean no: the read fails AND
    // `exists` corroborates that there is nothing to read.
    const demand = loadFileBackedDemand({
      existsImpl: () => false,
      textImpl: () => {
        throw new Error('file does not exist');
      },
    });

    await expect(demand.isOutstanding()).resolves.toBe(false);
  });
});
