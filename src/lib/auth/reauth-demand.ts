import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * The durable re-authentication demand — ADR-009 requirement 2.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS — REVIEW-022 finding 3
 * ---------------------------------------------------------------------------
 *
 * When the keychain refuses a rotated session's write, the server has already
 * rotated the refresh token and what remains on disk is the SUPERSEDED one.
 * Unit D detected that and forced re-authentication — but every flag it kept
 * was process-local. REVIEW-022 finding 3: "Process restart resets
 * `lastPersistenceFailure`, `lastPurgeFailure`, and the effect-local
 * `purgeOutstanding`. No durable marker is stored. The residual session
 * survives and the constructor listener can immediately load and refresh it."
 *
 * This module is that durable marker. It records the demand in a store that
 * survives process restart, and `auth-provider.tsx` consults it at bootstrap
 * before it exposes any session as usable.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS STORE — not the keychain, and nothing secret
 * ---------------------------------------------------------------------------
 *
 * The demand MUST NOT live in the store whose refusal it records. A keychain
 * that refuses writes while the device is locked would refuse the demand too,
 * and the record of the failure would be lost to the same failure. It lives in
 * an app-sandbox file through `expo-file-system` instead: file storage does not
 * share SecureStore's `WHEN_UNLOCKED` lock-state failure mode, and the package
 * was already pinned in this SDK's dependency tree.
 *
 * It can live outside the keychain because it CONTAINS NO SECRET: a version, a
 * reason, a timestamp. No token, no key name, no field of any session. The
 * record's shape is asserted by test, not just described here.
 *
 * ---------------------------------------------------------------------------
 * A DEMAND IS NEVER LOST TO A REFUSING STORE — ruling 25 (owner, 2026-08-26)
 * ---------------------------------------------------------------------------
 *
 * `record()` never rejects. When the backend refuses the write, the demand is
 * HELD IN MEMORY inside this handle and its durable record is retried on every
 * later opportunity — the next foreground evaluation, the next purge retry,
 * the next write through the session observer — until a medium answers or the
 * process ends (`retryHeldRecord()` is that retry). An earlier version instead
 * rejected so the caller could rethrow the original write refusal; REVIEW-023
 * finding 1 showed what that fallback re-entered — the pinned client's
 * throw-and-reject Deferred path, two unhandled rejections per refusal — and
 * ruling 25 withdrew it: R3 admits no exception, and R2 holds whenever any
 * durable medium accepts a write.
 *
 * THE ONE SCHEDULE THIS LEAVES OPEN — the ruling-25 Known limit, recorded, not
 * a defect: every medium refuses AND the process dies before any recovers.
 * Then no durable record exists, and the next process can expose the residual
 * session. The bound is server-side and predates this module: the residual's
 * refresh token was superseded at rotation, and Supabase's refresh-token
 * rotation rejects a consumed token outside the reuse interval, so the exposed
 * session dies at its next refresh. Unit F measures that backstop live.
 *
 * The other directions still fall closed. `isOutstanding()` resolves true for
 * a held demand without consulting the backend; otherwise it rejects when the
 * store refuses to answer, because a refusal is not evidence of absence (the
 * same invariant the adapter's reads honour), and the provider treats that
 * rejection as an outstanding demand. `clear()` rejects on refusal, and the
 * demand simply remains for the next consult — clearing is retried after the
 * next observed purge of what is by then an empty key space.
 *
 * ---------------------------------------------------------------------------
 * PLATFORM BOUNDARY — native only, like the observer that feeds it
 * ---------------------------------------------------------------------------
 *
 * Per ADR-008 / binding ruling 18 the persistence-failure observer exists on
 * native only, so no demand is ever recorded on web: `record()` there can only
 * hold in memory (the web backend accepts no write, so no record is ever
 * durable), and `isOutstanding()` resolves false so the web bootstrap is
 * undisturbed. No production web path calls `record()` — the observer that
 * feeds it does not exist there. Nothing is claimed about web, deferred
 * exactly as ADR-008 defers surfacing.
 */

export type ReauthDemandReason =
  /** The store refused a session write, so a rotated token may have been lost. */
  | 'session-write-refused'
  /** A recovery purge is owed and has not yet been proven complete. */
  | 'session-purge-pending';

/**
 * The whole of what is recorded. A version for forward compatibility, a reason,
 * and a timestamp for diagnostics. Deliberately nothing else — see the header.
 */
export type ReauthDemand = {
  readonly v: 1;
  readonly reason: ReauthDemandReason;
  /** ISO-8601 instant the demand was recorded. Bookkeeping, not behaviour. */
  readonly at: string;
};

/**
 * The storage this module needs, as three operations. Declared so tests and
 * probes can substitute an in-memory double — a constructor argument with a
 * real default, not a runtime switch: nothing in the shipped path reads an
 * environment variable to decide which backend it gets (learning 10).
 */
export type DemandStoreBackend = {
  /** Resolve the stored record text, or null when PROVEN absent. */
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
};

/**
 * What `record()` achieved. `durable` means the backend accepted the write;
 * `held` means it refused and the demand now lives in this handle's memory,
 * awaiting `retryHeldRecord()` (ruling 25). Both mean the demand EXISTS.
 */
export type ReauthDemandRecordOutcome = 'durable' | 'held';

/** The operations the session layer uses, bound to one backend. */
export type ReauthDemandHandle = {
  /**
   * Record the demand. NEVER rejects (ruling 25): a refused backend write
   * holds the demand in memory instead, and the durable record is retried on
   * every later opportunity until a medium answers or the process ends.
   */
  record(reason: ReauthDemandReason): Promise<ReauthDemandRecordOutcome>;
  /**
   * Is a demand outstanding? A held in-memory demand answers yes without a
   * backend read. Otherwise ANY stored content answers yes — a half-written
   * record is still a record that a demand was being made — and a store that
   * refuses to answer rejects, because refusal is not absence.
   */
  isOutstanding(): Promise<boolean>;
  /** The held or parsed record, or null when absent or not this module's shape. */
  peek(): Promise<ReauthDemand | null>;
  /**
   * Remove the record, memory hold included. Rejects when the store refuses
   * to remove an existing durable record; the demand then remains.
   */
  clear(): Promise<void>;
  /**
   * Retry the durable record of a held demand — ruling 25's "every later
   * opportunity". Resolves true when nothing is held or the flush landed,
   * false when the backend refused again and the demand stays held. Never
   * rejects.
   */
  retryHeldRecord(): Promise<boolean>;
};

/**
 * File name inside the app's document directory. The name states what the file
 * is; the content is the three-field record above and nothing else.
 */
const DEMAND_FILE_NAME = 'zc-auth-reauth-demand.json';

/**
 * Constructed lazily inside each operation rather than at module scope, so
 * importing this module never touches the filesystem — the provider imports it
 * on every platform, and only native operations should reach the backend.
 */
function demandFile(): File {
  return new File(Paths.document, DEMAND_FILE_NAME);
}

const fileBackend: DemandStoreBackend = {
  read: async () => {
    // A THROWN READ IS OUTSTANDING; ABSENCE IS OBSERVED, NEVER CONVERTED FROM
    // A FAILURE — REVIEW-024 finding 1, tightening REVIEW-023-ADVISORY lead 2
    // (E1). The previous shape read the content first but, when that read
    // threw, still returned "no demand" on `exists === false` — the boolean
    // acting as the absence gate after the read failure, which is what
    // consequence B forbids: the documented API collapses "no read access"
    // into `exists === false`, so under a thrown read that answer can be a
    // refusal wearing absence's face, and the reviewer's schedule exposed the
    // residual session behind it. Now no read failure is ever excused by the
    // boolean alone. Absence must be POSITIVELY OBSERVED by a read that
    // succeeded and returned nothing: the parent directory's listing — the
    // one read in this API whose target exists on a fresh install — reporting
    // no entry under the record's name, with `exists` corroborating. A
    // refused listing, a listed record that cannot be read, or an `exists`
    // answer contradicting the listing all stay OUTSTANDING, by rethrow of
    // the original failure. Whether the INSTALLED expo-file-system can
    // produce any of these answers natively remains NOT RUN offline (Phase
    // B's physical-device test owns the premise); this shape stops every one
    // of them from being converted into absence.
    const file = demandFile();
    try {
      return file.textSync();
    } catch (cause) {
      let listedNames: string[];
      try {
        listedNames = Paths.document.list().map((entry) => entry.name);
      } catch {
        throw cause;
      }
      if (listedNames.includes(DEMAND_FILE_NAME) || file.exists) throw cause;
      return null;
    }
  },
  write: async (value) => {
    demandFile().write(value);
  },
  remove: async () => {
    const file = demandFile();
    // Deleting an absent file is success by this contract: the postcondition
    // "no record exists" holds. Only a refusal to delete an existing one rejects.
    if (file.exists) file.delete();
  },
};

/**
 * Web: no observer feeds a demand (ADR-008), so none is ever recorded and none
 * can be durable. The write refusing keeps "never durable on web" structurally
 * true; under ruling 25 a future web `record()` call would HOLD in memory for
 * the process rather than fail loudly — stated here so that behaviour is a
 * recorded consequence, not a surprise. No production web path calls it.
 */
const webBackend: DemandStoreBackend = {
  read: async () => null,
  write: async () => {
    throw new Error('The re-authentication demand store is native-only (ADR-008).');
  },
  remove: async () => {},
};

/** Build a handle over `backend`. Tests pass a double; the app uses the default. */
export function createReauthDemand(
  backend: DemandStoreBackend = Platform.OS === 'web' ? webBackend : fileBackend,
): ReauthDemandHandle {
  // Ruling 25's memory hold. Handle-scope on purpose: a restart constructs a
  // fresh handle, and everything a restart genuinely loses, this loses —
  // which is exactly why the retry below exists, and why the death-before-
  // recovery schedule is the module header's recorded Known limit.
  let held: ReauthDemand | null = null;

  const writeDurably = async (demand: ReauthDemand): Promise<ReauthDemandRecordOutcome> => {
    try {
      await backend.write(JSON.stringify(demand));
    } catch {
      held = demand;
      return 'held';
    }
    // One durable record satisfies every demand this process has made — the
    // file's presence, not its count, is what the next process consults — so
    // a landed write ends any earlier hold too.
    held = null;
    return 'durable';
  };

  return {
    record: (reason) => writeDurably({ v: 1, reason, at: new Date().toISOString() }),
    retryHeldRecord: async () => {
      if (held === null) return true;
      return (await writeDurably(held)) === 'durable';
    },
    isOutstanding: async () => held !== null || (await backend.read()) !== null,
    peek: async () => {
      if (held !== null) return held;
      const raw = await backend.read();
      if (raw === null) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return null;
        const candidate = parsed as Record<string, unknown>;
        if (candidate.v !== 1) return null;
        if (
          candidate.reason !== 'session-write-refused' &&
          candidate.reason !== 'session-purge-pending'
        ) {
          return null;
        }
        if (typeof candidate.at !== 'string') return null;
        return { v: 1, reason: candidate.reason, at: candidate.at };
      } catch {
        // Unparseable content still counts as OUTSTANDING through
        // `isOutstanding()`; peek only declines to interpret it.
        return null;
      }
    },
    clear: async () => {
      // The hold drops first: if the backend then refuses to remove an
      // existing durable record, the rejection propagates and the demand
      // remains outstanding through that record — the safe direction. A held
      // demand with an empty backend simply ends here, which is correct: the
      // only caller is the provider's observed purge, on read-back proof.
      held = null;
      await backend.remove();
    },
  };
}

/**
 * The one demand per runtime, like the session-storage singletons it works
 * beside and for the same reason: there is exactly one session store whose
 * refusals this records.
 */
export const reauthDemand: ReauthDemandHandle = createReauthDemand();

/** Singleton-bound conveniences, the shapes `auth-provider.tsx` consumes. */
export const recordReauthDemand = reauthDemand.record;
export const isReauthDemandOutstanding = reauthDemand.isOutstanding;
export const clearReauthDemand = reauthDemand.clear;
export const retryReauthDemandRecord = reauthDemand.retryHeldRecord;
