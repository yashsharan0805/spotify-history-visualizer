import type { LibraryTrack, TrackStats } from './types';

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';
export type SavedKind = 'albums' | 'artists' | 'shows' | 'episodes' | 'audiobooks';
export interface RawItem {
  uri?: string; name?: string; type?: string; is_local?: boolean; duration_ms?: number; explicit?: boolean;
  release_date?: string; images?: {url:string}[]; artists?: {name:string}[]; authors?: {name:string}[];
  genres?: string[]; album?: {name?:string; images?:{url:string}[]; release_date?:string};
  show?: {name?:string}; publisher?: string;
}
export interface SavedItem { uri:string; name:string; creator:string; kind:SavedKind; savedAt:string; image?:string; release:string; explicit?:boolean; genres:string[]; }
export interface RecentPlay { track:LibraryTrack; playedAt:string; contextUri:string; }
export interface TopItems { tracks:LibraryTrack[]; artists:SavedItem[]; }
export interface PlaylistEntry { track:LibraryTrack; addedAt:string; }
export interface Playback { item?:RawItem|null; progress_ms?:number|null; is_playing:boolean; shuffle_state?:boolean; repeat_state?:string; timestamp?:number; device?:{name?:string;type?:string}; context?:{uri?:string}; }
export function musicTrack(t:RawItem|null|undefined,added=''):LibraryTrack|null {
  if(!t?.uri||!/^spotify:track:[A-Za-z0-9]{22}$/.test(t.uri)||t.is_local)return null;
  return {uri:t.uri,name:t.name||'Untitled track',artist:t.artists?.map(a=>a.name).join(', ')||'Unknown artist',album:t.album?.name||'',added,
    image:t.album?.images?.at(-1)?.url||t.images?.at(-1)?.url,durationMs:t.duration_ms,release:t.album?.release_date,explicit:t.explicit};
}
export function savedItem(t:RawItem,kind:SavedKind,savedAt=''):SavedItem {
  return {uri:t.uri||'',name:t.name||'Untitled item',creator:t.artists?.map(a=>a.name).join(', ')||t.authors?.map(a=>a.name).join(', ')||t.show?.name||t.publisher||'',kind,savedAt,
    image:t.images?.at(-1)?.url,release:t.release_date||'',explicit:t.explicit,genres:t.genres||[]};
}
export function recentEvidence(plays:RecentPlay[]) {
  const result=new Map<string,{count:number;last:string}>();
  // A repeated page/event is not a new play. Only the returned sample is counted.
  const seen=new Set<string>();
  for(const p of plays){const key=p.track.uri+'\0'+p.playedAt;if(seen.has(key))continue;seen.add(key);const old=result.get(p.track.uri);result.set(p.track.uri,{count:(old?.count||0)+1,last:old&&old.last>p.playedAt?old.last:p.playedAt});}
  return result;
}
export function playlistCounts(entries:PlaylistEntry[]){const counts=new Map<string,number>();for(const e of entries)counts.set(e.track.uri,(counts.get(e.track.uri)||0)+1);return counts;}
export interface LiveFilters {
  search:string; artist:string; savedFrom:string; savedTo:string; releaseFrom:string; releaseTo:string;
  explicit:'any'|'yes'|'no'; minMinutes:string; maxMinutes:string; recent:'any'|'seen'|'missing'; top:'any'|'seen'|'missing';
  recentFrom:string; recentTo:string; minSamplePlays:string; maxSamplePlays:string;
  playlist:'any'|'inside'|'outside'|'duplicates'; sort:'saved'|'oldest'|'name'|'duration'|'recent'|'rank';
}
export const liveDefaults:LiveFilters={search:'',artist:'',savedFrom:'',savedTo:'',releaseFrom:'',releaseTo:'',explicit:'any',minMinutes:'',maxMinutes:'',recent:'any',recentFrom:'',recentTo:'',minSamplePlays:'',maxSamplePlays:'',top:'any',playlist:'any',sort:'saved'};
export function filterLiveTracks(tracks:LibraryTrack[],f:LiveFilters,evidence:{recent?:Map<string,{count:number;last:string}>;ranks?:Map<string,number>;playlist?:Map<string,number>}={}) {
  if((f.recent!=='any'||f.recentFrom||f.recentTo||f.minSamplePlays||f.maxSamplePlays)&&!evidence.recent||f.top!=='any'&&!evidence.ranks||f.playlist!=='any'&&!evidence.playlist)return [];
  return tracks.filter(t=>{
    const q=f.search.toLocaleLowerCase(),saved=t.added.slice(0,10),year=t.release?.slice(0,4),minutes=t.durationMs===undefined?undefined:t.durationMs/60000;
    const recent=evidence.recent?.get(t.uri),last=recent?.last.slice(0,10),samplePlays=recent?.count||0;
    const inPlaylist=evidence.playlist?.has(t.uri)||false;
    const playlistMatches=f.playlist==='any'||(f.playlist==='duplicates'?(evidence.playlist?.get(t.uri)||0)>1:inPlaylist===(f.playlist==='inside'));
    return (!q||`${t.name} ${t.artist} ${t.album}`.toLocaleLowerCase().includes(q))&&(!f.artist||t.artist===f.artist)
      &&(!f.savedFrom||!!saved&&saved>=f.savedFrom)&&(!f.savedTo||!!saved&&saved<=f.savedTo)
      &&(!f.releaseFrom||!!year&&Number(year)>=Number(f.releaseFrom))&&(!f.releaseTo||!!year&&Number(year)<=Number(f.releaseTo))
      &&(f.explicit==='any'||t.explicit===(f.explicit==='yes'))
      &&(!f.minMinutes||minutes!==undefined&&minutes>=Number(f.minMinutes))&&(!f.maxMinutes||minutes!==undefined&&minutes<=Number(f.maxMinutes))
      &&(f.recent==='any'||evidence.recent!.has(t.uri)===(f.recent==='seen'))
      &&(!f.recentFrom||!!last&&last>=f.recentFrom)&&(!f.recentTo||!!last&&last<=f.recentTo)
      &&(!f.minSamplePlays||samplePlays>=Number(f.minSamplePlays))&&(!f.maxSamplePlays||samplePlays<=Number(f.maxSamplePlays))
      &&(f.top==='any'||evidence.ranks!.has(t.uri)===(f.top==='seen'))
      &&playlistMatches;
  }).sort((a,b)=>f.sort==='name'?a.name.localeCompare(b.name):f.sort==='oldest'?a.added.localeCompare(b.added):f.sort==='duration'?(b.durationMs??-1)-(a.durationMs??-1):f.sort==='recent'?(evidence.recent?.get(b.uri)?.count??-1)-(evidence.recent?.get(a.uri)?.count??-1):f.sort==='rank'?(evidence.ranks?.get(a.uri)??Infinity)-(evidence.ranks?.get(b.uri)??Infinity):b.added.localeCompare(a.added));
}
export function actionTrack(t:LibraryTrack):TrackStats{return {uri:t.uri,name:t.name,artist:t.artist,album:t.album,media:'music',attempts:0,listens:0,completed:0,ms:0,skips:0,eligible:0,flags:0,early:0,last:'',first:'',skipRate:null};}
