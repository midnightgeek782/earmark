import { useLiveQuery } from 'dexie-react-hooks';
import { db, withDefaults } from '../db/db';
import type { Settings } from '../domain/types';

/** Live settings with defaults filled in (undefined while loading). */
export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => withDefaults(await db.settings.get('settings')), []);
}
