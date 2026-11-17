export type Status = 'queued' | 'listened';
export type Rating = 'loved' | 'liked' | 'not-for-me';
export type Enrichment = 'pending' | 'done' | 'failed';
export type MusicApp = 'spotify' | 'apple' | 'youtube' | 'tidal' | 'deezer' | 'bandcamp';

export interface Album {
  id: string;
  identityKey: string;
  normKey: string;
  title: string;
  artist: string;
  year: number | null;
  trackCount: number | null;
  lengthMinutes: number | null;
  coverUrl: string | null;
  musicBrainzId: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  recommendedBy: string | null;
  recommenderNote: string | null;
  listeningNote: string | null;
  status: Status;
  rating: Rating | null;
  addedAt: string;
  updatedAt: string;
  listenedAt: string | null;
  enrichment: Enrichment;
  enrichedAt: string | null;
  enrichAttempts: number;
  lastAttemptAt: string | null;
  sample: boolean;
  deletedAt: string | null;
  /** Track list from the chosen edition (added by enrichment; optional for older records). */
  tracks?: Track[] | null;
  /** Starred albums form the "Up next" shelf. Optional for older records. */
  starred?: boolean;
  /** Free-form labels like "road trip" or "jazz" (normalised, at most 8). */
  tags?: string[];
  /** Genres from MusicBrainz (top few), filled by enrichment. */
  genres?: string[];
  /** Main artist's MusicBrainz ID, for suggestions. */
  artistMbid?: string | null;
  /** Wikidata item for the album, used to find a Wikipedia description. */
  wikidataId?: string | null;
  /** Cached Wikipedia summary; undefined = not fetched yet, null = none found. */
  about?: { text: string; url: string } | null;
}

export interface Track {
  title: string;
  lengthMs: number | null;
}

export interface Settings {
  id: 'settings';
  musicApp: MusicApp | null;
  samplesSeeded: boolean;
  installCardDismissed: boolean;
  persistRequested: boolean;
  addedSinceExport: number;
  lastExportAt: string | null;
  previousPickId: string | null;
  /** Preferences */
  defaultView: 'grid' | 'list';
  defaultSort: 'newest' | 'oldest' | 'shortest' | 'person';
  pickWeighting: 'even' | 'older';
  pickPreferStarred: boolean;
  showShelves: boolean;
  showDailyPick: boolean;
  /** Suggestions send artist IDs (not your list) to ListenBrainz, so the home shelf is opt-in. */
  suggestionsOnHome: boolean;
  suggestFrom: 'loved' | 'all';
  /** Fetch short album descriptions from Wikipedia. */
  wikiDescriptions: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  musicApp: null,
  samplesSeeded: false,
  installCardDismissed: false,
  persistRequested: false,
  addedSinceExport: 0,
  lastExportAt: null,
  previousPickId: null,
  defaultView: 'grid',
  defaultSort: 'newest',
  pickWeighting: 'even',
  pickPreferStarred: false,
  showShelves: true,
  showDailyPick: true,
  suggestionsOnHome: false,
  suggestFrom: 'all',
  wikiDescriptions: true,
};

export const LIMITS = {
  title: 300,
  artist: 300,
  recommender: 100,
  note: 500,
  maxAlbums: 10_000,
  maxFileBytes: 64 * 1024 * 1024,
  minYear: 1900,
  maxLength: 600,
  maxTracks: 500,
  tag: 24,
  maxTags: 8,
} as const;
