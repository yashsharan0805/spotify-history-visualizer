export type Media = 'music' | 'podcast' | 'audiobook';
export interface Event {
  ts: string; ms: number; uri: string; name: string; artist: string; album: string; media: Media;
  source: 'audio' | 'video'; platform: string; country: string; start: string; end: string;
  skipped: boolean | null; shuffle: boolean; offline: boolean | null; private: boolean | null;
}
export interface Dataset { events: Event[]; files: string[]; raw: number; duplicates: number; invalid: number; errors: string[]; demo: boolean; }
export interface Filters { from: string; to: string; timezone: string; media: 'all' | Media; source: 'all' | 'audio' | 'video'; artist: string; platform: string; shuffle: 'all' | 'yes' | 'no'; }
export interface TrackStats { uri: string; name: string; artist: string; album: string; media: Media; attempts: number; listens: number; completed: number; ms: number; skips: number; eligible: number; flags: number; early: number; last: string; first: string; skipRate: number | null; }
export interface Analysis {
  tracks: TrackStats[]; artists: {name: string; ms: number; attempts: number}[];
  total: number; ms: number; completed: number; skips: number; eligible: number; flags: number;
  shuffle: number; offline: number; private: number; videos: number;
  months: {month: string; ms: number; attempts: number; skips: number; eligible: number; [artist: string]: string | number}[];
  days: {day: string; ms: number; attempts: number}[];
  hours: number[]; outcomes: {name: string; count: number}[]; skipBins: {name: string; count: number}[];
  platforms: {name: string; ms: number; attempts: number}[]; countries: {name: string; ms: number; attempts: number}[];
  min: string; max: string;
}
export interface LibraryTrack { uri: string; name: string; artist: string; album: string; added: string; image?: string; durationMs?: number; release?: string; explicit?: boolean; }
export interface Playlist { id: string; name: string; public: boolean; owner: {id: string}; collaborative?: boolean; description?: string; images?: {url:string}[]; }
export interface Receipt { id: string; account: string; at: string; action: string; playlist?: string; requested: string[]; added: string[]; unliked: string[]; restored: string[]; failed: {uri: string; error: string}[]; }
