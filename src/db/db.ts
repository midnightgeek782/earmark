import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_SETTINGS, type Album, type Settings } from '../domain/types';

// Schema versions only add fields or indexes.
export class EarmarkDb extends Dexie {
  albums!: EntityTable<Album, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'earmark') {
    super(name);
    this.version(1).stores({
      albums: 'id, identityKey, normKey, status, addedAt, listenedAt, enrichment, sample, deletedAt',
      settings: 'id',
    });
  }
}

export const db = new EarmarkDb();

/** Older saved settings lack newer preference fields; fill them from defaults. */
export function withDefaults(s: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(s ?? {}), id: 'settings' };
}

export async function getSettings(d: EarmarkDb = db): Promise<Settings> {
  return withDefaults(await d.settings.get('settings'));
}

export async function updateSettings(patch: Partial<Settings>, d: EarmarkDb = db): Promise<void> {
  await d.transaction('rw', d.settings, async () => {
    const cur = await getSettings(d);
    await d.settings.put({ ...cur, ...patch, id: 'settings' });
  });
}

/** Startup check: can this browser store data? */
export async function storageWorks(d: EarmarkDb = db): Promise<boolean> {
  try {
    await d.open();
    await d.settings.get('settings');
    return true;
  } catch {
    return false;
  }
}
