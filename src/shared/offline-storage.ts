import { openDB, DBSchema, IDBPDatabase } from "idb";

// Database schema
interface SightSignalDB extends DBSchema {
  sightings: {
    key: string;
    value: {
      id: string;
      data: unknown;
      timestamp: number;
      synced: boolean;
    };
    indexes: { "by-timestamp": number };
  };
  signals: {
    key: string;
    value: {
      id: string;
      data: unknown;
      timestamp: number;
      synced: boolean;
    };
    indexes: { "by-timestamp": number };
  };
  comments: {
    key: string;
    value: {
      id: string;
      sightingId: string;
      data: unknown;
      timestamp: number;
      synced: boolean;
    };
    indexes: { "by-sighting": string; "by-timestamp": number };
  };
  user: {
    key: string;
    value: {
      key: string;
      data: unknown;
      timestamp: number;
    };
  };
  pendingActions: {
    key: number;
    value: {
      id?: number;
      type: "create" | "update" | "delete";
      endpoint: string;
      data: unknown;
      timestamp: number;
    };
    indexes: { "by-timestamp": number };
  };
}

const DB_NAME = "sightsignal-offline";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<SightSignalDB> | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initDB(): Promise<IDBPDatabase<SightSignalDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<SightSignalDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Sightings store
      if (!db.objectStoreNames.contains("sightings")) {
        const sightingsStore = db.createObjectStore("sightings", {
          keyPath: "id",
        });
        sightingsStore.createIndex("by-timestamp", "timestamp");
      }

      // Signals store
      if (!db.objectStoreNames.contains("signals")) {
        const signalsStore = db.createObjectStore("signals", {
          keyPath: "id",
        });
        signalsStore.createIndex("by-timestamp", "timestamp");
      }

      // Comments store
      if (!db.objectStoreNames.contains("comments")) {
        const commentsStore = db.createObjectStore("comments", {
          keyPath: "id",
        });
        commentsStore.createIndex("by-sighting", "sightingId");
        commentsStore.createIndex("by-timestamp", "timestamp");
      }

      // User data store
      if (!db.objectStoreNames.contains("user")) {
        db.createObjectStore("user", { keyPath: "key" });
      }

      // Pending actions queue (for background sync)
      if (!db.objectStoreNames.contains("pendingActions")) {
        const actionsStore = db.createObjectStore("pendingActions", {
          keyPath: "id",
          autoIncrement: true,
        });
        actionsStore.createIndex("by-timestamp", "timestamp");
      }
    },
  });

  return dbInstance;
}

/**
 * Cache sightings for offline access
 */
export async function cacheSightings(
  sightings: Array<Record<string, unknown>>
) {
  const db = await initDB();
  const tx = db.transaction("sightings", "readwrite");

  await Promise.all(
    sightings.map((sighting) =>
      tx.store.put({
        id: String(sighting.id),
        data: sighting,
        timestamp: Date.now(),
        synced: true,
      })
    )
  );

  await tx.done;
}

/**
 * Get cached sightings
 */
export async function getCachedSightings(): Promise<unknown[]> {
  const db = await initDB();
  const cached = await db.getAll("sightings");
  return cached.map((item) => item.data);
}

/**
 * Cache a single sighting with details
 */
export async function cacheSighting(id: string, sighting: unknown) {
  const db = await initDB();
  await db.put("sightings", {
    id,
    data: sighting,
    timestamp: Date.now(),
    synced: true,
  });
}

/**
 * Cache signals
 */
export async function cacheSignals(signals: Array<Record<string, unknown>>) {
  const db = await initDB();
  const tx = db.transaction("signals", "readwrite");

  await Promise.all(
    signals.map((signal) =>
      tx.store.put({
        id: String(signal.id),
        data: signal,
        timestamp: Date.now(),
        synced: true,
      })
    )
  );

  await tx.done;
}

/**
 * Get cached signals
 */
export async function getCachedSignals(): Promise<unknown[]> {
  const db = await initDB();
  const cached = await db.getAll("signals");
  return cached.map((item) => item.data);
}

/**
 * Cache comments for a sighting
 */
export async function cacheComments(
  sightingId: string,
  comments: Array<Record<string, unknown>>
) {
  const db = await initDB();
  const tx = db.transaction("comments", "readwrite");

  await Promise.all(
    comments.map((comment) =>
      tx.store.put({
        id: String(comment.id),
        sightingId,
        data: comment,
        timestamp: Date.now(),
        synced: true,
      })
    )
  );

  await tx.done;
}

/**
 * Get cached comments for a sighting
 */
export async function getCachedComments(
  sightingId: string
): Promise<unknown[]> {
  const db = await initDB();
  const index = db.transaction("comments").store.index("by-sighting");
  const cached = await index.getAll(sightingId);
  return cached.map((item) => item.data);
}

/**
 * Cache user data
 */
export async function cacheUserData(key: string, data: unknown) {
  const db = await initDB();
  await db.put("user", {
    key,
    data,
    timestamp: Date.now(),
  });
}

/**
 * Get cached user data
 */
export async function getCachedUserData(key: string): Promise<unknown | null> {
  const db = await initDB();
  const cached = await db.get("user", key);
  return cached?.data || null;
}

/**
 * Queue an action for when back online
 */
export async function queuePendingAction(
  type: "create" | "update" | "delete",
  endpoint: string,
  data: unknown
) {
  const db = await initDB();
  await db.add("pendingActions", {
    type,
    endpoint,
    data,
    timestamp: Date.now(),
  });
}

/**
 * Get all pending actions
 */
export async function getPendingActions() {
  const db = await initDB();
  return db.getAll("pendingActions");
}

/**
 * Remove a pending action
 */
export async function removePendingAction(id: number) {
  const db = await initDB();
  await db.delete("pendingActions", id);
}

/**
 * Clear old cached data (older than 7 days)
 */
export async function clearOldCache() {
  const db = await initDB();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Clear old sightings
  const sightingsTx = db.transaction("sightings", "readwrite");
  const sightingsIndex = sightingsTx.store.index("by-timestamp");
  let sightingsCursor = await sightingsIndex.openCursor(
    IDBKeyRange.upperBound(weekAgo)
  );
  while (sightingsCursor) {
    await sightingsCursor.delete();
    sightingsCursor = await sightingsCursor.continue();
  }

  // Clear old signals
  const signalsTx = db.transaction("signals", "readwrite");
  const signalsIndex = signalsTx.store.index("by-timestamp");
  let signalsCursor = await signalsIndex.openCursor(
    IDBKeyRange.upperBound(weekAgo)
  );
  while (signalsCursor) {
    await signalsCursor.delete();
    signalsCursor = await signalsCursor.continue();
  }

  // Clear old comments
  const commentsTx = db.transaction("comments", "readwrite");
  const commentsIndex = commentsTx.store.index("by-timestamp");
  let commentsCursor = await commentsIndex.openCursor(
    IDBKeyRange.upperBound(weekAgo)
  );
  while (commentsCursor) {
    await commentsCursor.delete();
    commentsCursor = await commentsCursor.continue();
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  const db = await initDB();
  const sightingsCount = await db.count("sightings");
  const signalsCount = await db.count("signals");
  const commentsCount = await db.count("comments");
  const pendingActionsCount = await db.count("pendingActions");

  return {
    sightings: sightingsCount,
    signals: signalsCount,
    comments: commentsCount,
    pendingActions: pendingActionsCount,
  };
}
