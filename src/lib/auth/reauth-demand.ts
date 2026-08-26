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
 * FAIL CLOSED, IN BOTH DIRECTIONS
 * ---------------------------------------------------------------------------
 *
 * `record()` rejects when the demand cannot be written — the caller must not
 * proceed as though durability was achieved (see `session-storage.ts` for what
 * the write path does with that rejection). `isOutstanding()` rejects when the
 * store refuses to answer, because a refusal is not evidence of absence
 * (the same invariant the adapter's reads honour); the provider treats that
 * rejection as an outstanding demand. `clear()` rejects on refusal, and the
 * demand simply remains for the next consult — clearing is retried after the
 * next observed purge of what is by then an empty key space.
 *
 * ---------------------------------------------------------------------------
 * PLATFORM BOUNDARY — native only, like the observer that feeds it
 * ---------------------------------------------------------------------------
 *
 * Per ADR-008 / binding ruling 18 the persistence-failure observer exists on
 * native only, so no demand is ever recorded on web: `record()` there rejects,
 * and `isOutstanding()` resolves false so the web bootstrap is undisturbed.
 * Nothing is claimed about web, deferred exactly as ADR-008 defers surfacing.
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

/** The operations the session layer uses, bound to one backend. */
export type ReauthDemandHandle = {
  /** Durably record the demand. Rejects when the store refuses — fail closed. */
  record(reason: ReauthDemandReason): Promise<void>;
  /**
   * Is a demand outstanding? ANY stored content answers yes — a half-written
   * record is still a record that a demand was being made. Rejects when the
   * store refuses to answer, because refusal is not absence.
   */
  isOutstanding(): Promise<boolean>;
  /** The parsed record, or null when absent or not this module's shape. */
  peek(): Promise<ReauthDemand | null>;
  /** Remove the record. Rejects when the store refuses; the demand remains. */
  clear(): Promise<void>;
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
    const file = demandFile();
    // `exists` is the observation that makes null mean "proven absent" rather
    // than "could not look" — a backend refusal escapes as a rejection instead.
    if (!file.exists) return null;
    return file.textSync();
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
 * can be outstanding. `record()` rejecting keeps that true structurally — a
 * future web caller would fail loudly rather than silently record nothing.
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
  return {
    record: async (reason) => {
      const demand: ReauthDemand = { v: 1, reason, at: new Date().toISOString() };
      await backend.write(JSON.stringify(demand));
    },
    isOutstanding: async () => (await backend.read()) !== null,
    peek: async () => {
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
    clear: () => backend.remove(),
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
