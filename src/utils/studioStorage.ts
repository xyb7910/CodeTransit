import { IDBPDatabase, openDB } from 'idb';
import {
  AlgoAssetItem,
  SceneSchema,
  StudioLayoutPrefs,
} from '../types/algorithmStudio';
import { CustomAlgorithmRecord } from '../types/algorithmDsl';
import { CUSTOM_DSL_2D_PREFIX_SUM, CUSTOM_DSL_KADANE } from './dslSchema';

const STUDIO_DB_NAME = 'yanpb-algo-studio-db';
const STUDIO_DB_VERSION = 2;

export interface SceneSnapshotRecord {
  id: string;
  name: string;
  createdAt: number;
  scene: SceneSchema;
}

const DEFAULT_STUDIO_PREFS: StudioLayoutPrefs = {
  leftOpen: true,
  rightOpen: true,
  bottomOpen: true,
  leftWidth: 270,
  rightWidth: 320,
  bottomHeight: 196,
  showGrid: true,
  snapToGrid: true,
  gridSize: 16,
};

let studioDbPromise: Promise<IDBPDatabase> | null = null;

function getStudioDB() {
  if (!studioDbPromise) {
    studioDbPromise = openDB(STUDIO_DB_NAME, STUDIO_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('scenes')) {
          db.createObjectStore('scenes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('prefs')) {
          db.createObjectStore('prefs', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('customAlgorithms')) {
          db.createObjectStore('customAlgorithms', { keyPath: 'id' });
        }
      },
    });
  }
  return studioDbPromise;
}

export async function loadActiveStudioScene(): Promise<SceneSchema | null> {
  try {
    const db = await getStudioDB();
    const rec = await db.get('scenes', 'active-scene');
    return rec?.scene ?? null;
  } catch {
    return null;
  }
}

export async function saveActiveStudioScene(scene: SceneSchema): Promise<void> {
  try {
    const db = await getStudioDB();
    await db.put('scenes', { id: 'active-scene', scene: { ...scene, updatedAt: Date.now() } });
  } catch {
    // non-fatal
  }
}

export async function loadStudioPrefs(): Promise<StudioLayoutPrefs> {
  try {
    const db = await getStudioDB();
    const rec = await db.get('prefs', 'layout-prefs');
    return { ...DEFAULT_STUDIO_PREFS, ...(rec?.value || {}) };
  } catch {
    return DEFAULT_STUDIO_PREFS;
  }
}

export async function saveStudioPrefs(prefs: StudioLayoutPrefs): Promise<void> {
  try {
    const db = await getStudioDB();
    await db.put('prefs', { key: 'layout-prefs', value: prefs });
  } catch {
    // non-fatal
  }
}

export async function loadAlgoAssets(): Promise<AlgoAssetItem[]> {
  try {
    const db = await getStudioDB();
    const items = (await db.getAll('assets')) as AlgoAssetItem[];
    return items.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveAlgoAsset(asset: AlgoAssetItem): Promise<void> {
  const db = await getStudioDB();
  await db.put('assets', asset);
}

export async function deleteAlgoAsset(id: string): Promise<void> {
  const db = await getStudioDB();
  await db.delete('assets', id);
}

export async function saveSceneSnapshot(scene: SceneSchema, label?: string): Promise<SceneSnapshotRecord> {
  const rec: SceneSnapshotRecord = {
    id: `scene-snap-${Date.now()}`,
    name: label || `${scene.name} (${new Date().toLocaleTimeString()})`,
    createdAt: Date.now(),
    scene: structuredClone(scene),
  };
  const db = await getStudioDB();
  await db.put('snapshots', rec);
  return rec;
}

export async function loadSceneSnapshots(): Promise<SceneSnapshotRecord[]> {
  try {
    const db = await getStudioDB();
    const all = (await db.getAll('snapshots')) as SceneSnapshotRecord[];
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function getSeedCustomAlgorithms(): CustomAlgorithmRecord[] {
  const now = Date.now();
  return [
    {
      id: 'seed-custom-2d-prefix',
      name: CUSTOM_DSL_2D_PREFIX_SUM.scene.name,
      description: CUSTOM_DSL_2D_PREFIX_SUM.scene.description || '',
      tier: 'CSP-J',
      dsl: CUSTOM_DSL_2D_PREFIX_SUM,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-custom-kadane',
      name: CUSTOM_DSL_KADANE.scene.name,
      description: CUSTOM_DSL_KADANE.scene.description || '',
      tier: 'CSP-J',
      dsl: CUSTOM_DSL_KADANE,
      createdAt: now - 1000,
      updatedAt: now - 1000,
    },
  ];
}

export async function loadCustomAlgorithms(): Promise<CustomAlgorithmRecord[]> {
  try {
    const db = await getStudioDB();
    const list = (await db.getAll('customAlgorithms')) as CustomAlgorithmRecord[];
    if (list.length === 0) {
      const seeds = getSeedCustomAlgorithms();
      for (const s of seeds) await db.put('customAlgorithms', s);
      return seeds;
    }
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return getSeedCustomAlgorithms();
  }
}

export async function saveCustomAlgorithm(record: CustomAlgorithmRecord): Promise<void> {
  const db = await getStudioDB();
  await db.put('customAlgorithms', { ...record, updatedAt: Date.now() });
}

export async function deleteCustomAlgorithm(id: string): Promise<void> {
  const db = await getStudioDB();
  await db.delete('customAlgorithms', id);
}
