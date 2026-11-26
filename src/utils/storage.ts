import { openDB, IDBPDatabase } from 'idb';
import { SEED_REPOSITORY } from '../constants/seedRepository';
import { Locale, RepositoryEntry, UIThemeMode, WorkspaceDocument, WorkspaceSnapshot } from '../types/workspace';

const DB_NAME = 'yanpb-codetransit-db';
const DB_VERSION = 1;

export interface UserPreferences {
  locale: Locale;
  themeMode: UIThemeMode;
  syncKey: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('workspaces')) {
          db.createObjectStore('workspaces', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('repository')) {
          db.createObjectStore('repository', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences');
        }
      },
    });
  }
  return dbPromise;
}

export async function loadActiveWorkspace(): Promise<WorkspaceDocument | null> {
  try {
    const db = await getDb();
    const doc = await db.get('workspaces', 'active-draft');
    return (doc as WorkspaceDocument) || null;
  } catch {
    return null;
  }
}

export async function saveActiveWorkspace(workspace: WorkspaceDocument): Promise<void> {
  try {
    const db = await getDb();
    await db.put('workspaces', { ...workspace, id: 'active-draft', updatedAt: Date.now() });
  } catch {
    // Ignore quota errors gracefully
  }
}

export async function loadPreferences(): Promise<UserPreferences> {
  try {
    const db = await getDb();
    const prefs = await db.get('preferences', 'user-prefs');
    if (prefs && typeof prefs === 'object') {
      return {
        locale: prefs.locale === 'en-US' ? 'en-US' : 'zh-CN',
        themeMode: prefs.themeMode === 'light' ? 'light' : 'dark',
        syncKey: typeof prefs.syncKey === 'string' ? prefs.syncKey : '',
      };
    }
  } catch {
    // fallback
  }
  return { locale: 'zh-CN', themeMode: 'dark', syncKey: '' };
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  try {
    const db = await getDb();
    await db.put('preferences', prefs, 'user-prefs');
  } catch {
    // ignore
  }
}

export async function loadRepositoryEntries(): Promise<RepositoryEntry[]> {
  try {
    const db = await getDb();
    const existing = (await db.getAll('repository')) as RepositoryEntry[];
    if (existing.length === 0) {
      const tx = db.transaction('repository', 'readwrite');
      for (const item of SEED_REPOSITORY) {
        await tx.store.put(item);
      }
      await tx.done;
      return [...SEED_REPOSITORY];
    }
    return existing.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [...SEED_REPOSITORY];
  }
}

export async function saveRepositoryEntry(entry: RepositoryEntry): Promise<void> {
  const db = await getDb();
  await db.put('repository', { ...entry, updatedAt: Date.now() });
}

export async function deleteRepositoryEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('repository', id);
}

export async function loadSnapshots(): Promise<WorkspaceSnapshot[]> {
  try {
    const db = await getDb();
    const all = (await db.getAll('snapshots')) as WorkspaceSnapshot[];
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveSnapshot(snapshot: WorkspaceSnapshot): Promise<void> {
  const db = await getDb();
  await db.put('snapshots', snapshot);
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('snapshots', id);
}
