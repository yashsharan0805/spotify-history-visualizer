import type { Event, Dataset, Filters, Analysis, TrackStats } from './types';
export const SKIP_START = '2022-01-01T00:00:00.000Z';
export const defaults: Filters = { from: '', to: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, media: 'music', source: 'all', artist: '', platform: '', shuffle: 'all' };
export function normalize(input: unknown, source: Event['source']): Event | null {
  if (!input || typeof input !== 'object') return null;
  const r = input as Record<string, unknown>;
  if (typeof r.ts !== 'string' || !Number.isFinite(Date.parse(r.ts)) || typeof r.ms_played !== 'number' || r.ms_played < 0 || !Number.isFinite(r.ms_played)) return null;
  const media = r.spotify_track_uri ? 'music' : r.spotify_episode_uri ? 'podcast' : r.audiobook_uri ? 'audiobook' : null;
  const uri = r.spotify_track_uri || r.spotify_episode_uri || r.audiobook_chapter_uri || r.audiobook_uri;
  if (!media || typeof uri !== 'string') return null;
  const s = (v: unknown, fallback = '') => typeof v === 'string' ? v : fallback;
  const b = (v: unknown) => typeof v === 'boolean' ? v : null;
  return {ts: new Date(r.ts).toISOString(), ms: r.ms_played, uri, media, source,
    name: s(r.master_metadata_track_name || r.episode_name || r.audiobook_chapter_title || r.audiobook_title, 'Unknown title'),
    artist: s(r.master_metadata_album_artist_name || r.episode_show_name || r.audiobook_title, 'Unknown artist'),
    album: s(r.master_metadata_album_album_name || r.episode_show_name), platform: s(r.platform, 'unknown'), country: s(r.conn_country, 'ZZ'),
    start: s(r.reason_start, 'unknown'), end: s(r.reason_end, 'unknown'), skipped: b(r.skipped),
    shuffle: r.shuffle === true, offline: b(r.offline), private: b(r.incognito_mode)};
}
export function platformGroup(p: string) {
  const s = p.toLowerCase();
  if (s.includes('web')) return 'Web player'; if (s.includes('android_tv') || s.includes('tizen') || s.includes('playstation') || s.includes('sony_tv')) return 'TV & console';
  if (s.includes('android')) return 'Android'; if (s.includes('os x') || s.includes('osx') || s.includes('mac')) return 'Mac';
  if (s.includes('windows')) return 'Windows'; if (s.includes('linux')) return 'Linux'; if (s.includes('ios')) return 'iPhone & iPad';
  if (s.includes('cast') || s.includes('echo') || s.includes('speaker')) return 'Speakers & casting'; return 'Other';
}
export function clock(timezone: string) {
  const d = new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year:'numeric', month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',weekday:'short'});
  const cache = new Map<string, {day:string;hour:number;weekday:number}>();
  return (ts: string) => {
    // UTC-hour caching is safe for the supported whole/half/quarter-hour zones only when keyed by minutes.
    const key = ts.slice(0,16); const prior = cache.get(key); if (prior) return prior;
    const parts = Object.fromEntries(d.formatToParts(new Date(ts)).map(p=>[p.type,p.value]));
    const value = {day:`${parts.year}-${parts.month}-${parts.day}`,hour:Number(parts.hour),weekday:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(parts.weekday)};
    cache.set(key,value); return value;
  };
}
export function analyze(events: Event[], f: Filters): Analysis {
  const local = clock(f.timezone), tracks = new Map<string, TrackStats>();
  const months = new Map<string, Analysis['months'][number]>(), days = new Map<string, Analysis['days'][number]>();
  const artists = new Map<string,{name:string;ms:number;attempts:number}>(), platforms = new Map<string,{name:string;ms:number;attempts:number}>(), countries = new Map<string,{name:string;ms:number;attempts:number}>();
  const hours = Array(168).fill(0) as number[]; const outcomes = [0,0,0,0]; const bins=[0,0,0,0,0];
  let total=0,ms=0,completed=0,skips=0,eligible=0,flags=0,shuffle=0,offline=0,privacy=0,videos=0,min='',max='';
  const add=(map: typeof artists,name:string,e:Event)=>{const item=map.get(name)||{name,ms:0,attempts:0};item.ms+=e.ms;item.attempts++;map.set(name,item);};
  for (const e of events) {
    if (f.media !== 'all' && e.media !== f.media || f.source !== 'all' && e.source !== f.source || f.artist && e.artist !== f.artist || f.platform && platformGroup(e.platform) !== f.platform || f.shuffle !== 'all' && e.shuffle !== (f.shuffle==='yes')) continue;
    const t=local(e.ts); if(f.from && t.day<f.from || f.to && t.day>f.to)continue;
    total++;ms+=e.ms;completed+=+(e.end==='trackdone');shuffle+=+e.shuffle;offline+=+(e.offline===true);privacy+=+(e.private===true);videos+=+(e.source==='video');
    const canSkip=e.media==='music'&&e.ts>=SKIP_START, skip=canSkip&&e.end==='fwdbtn';
    eligible+=+canSkip;skips+=+skip;flags+=+(canSkip&&e.skipped===true);
    min=!min||e.ts<min?e.ts:min; max=!max||e.ts>max?e.ts:max;
    if(e.end==='trackdone')outcomes[0]++;else if(e.end==='fwdbtn')outcomes[1]++;else if(e.end==='backbtn')outcomes[2]++;else outcomes[3]++;
    if(skip)bins[e.ms<5000?0:e.ms<10000?1:e.ms<30000?2:e.ms<60000?3:4]++;
    hours[t.weekday*24+t.hour]+=e.ms;
    const day=days.get(t.day)||{day:t.day,ms:0,attempts:0};day.ms+=e.ms;day.attempts++;days.set(t.day,day);
    const monthKey=t.day.slice(0,7), month=months.get(monthKey)||{month:monthKey,ms:0,attempts:0,skips:0,eligible:0};
    month.ms+=e.ms;month.attempts++;month.skips+=+skip;month.eligible+=+canSkip;
    const artistKey='artist:'+e.artist; month[artistKey]=Number(month[artistKey]||0)+e.ms;months.set(monthKey,month);
    add(artists,e.artist,e);add(platforms,platformGroup(e.platform),e);add(countries,e.country,e);
    const track=tracks.get(e.uri)||{uri:e.uri,name:e.name,artist:e.artist,album:e.album,media:e.media,attempts:0,listens:0,completed:0,ms:0,skips:0,eligible:0,flags:0,early:0,last:e.ts,first:e.ts,skipRate:null};
    track.attempts++;track.listens+=+(e.ms>=30000);track.completed+=+(e.end==='trackdone');track.ms+=e.ms;track.skips+=+skip;track.eligible+=+canSkip;track.flags+=+(canSkip&&e.skipped===true);track.early+=+(skip&&e.ms<10000);
    if(e.ts>track.last)track.last=e.ts;if(e.ts<track.first)track.first=e.ts;tracks.set(e.uri,track);
  }
  // Insert empty months so missing periods are visible rather than connected as continuous activity.
  if(months.size){let p=[...months.keys()].sort()[0];const last=[...months.keys()].sort().at(-1)!;while(p<=last){if(!months.has(p))months.set(p,{month:p,ms:0,attempts:0,skips:0,eligible:0});const [y,m]=p.split('-').map(Number);p=m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`;}}
  return {tracks:[...tracks.values()].map(t=>({...t,skipRate:t.eligible?t.skips/t.eligible:null})),artists:[...artists.values()].sort((a,b)=>b.ms-a.ms),total,ms,completed,skips,eligible,flags,shuffle,offline,private:privacy,videos,
    months:[...months.values()].sort((a,b)=>a.month.localeCompare(b.month)),days:[...days.values()].sort((a,b)=>a.day.localeCompare(b.day)),hours,
    outcomes:['Natural ending','Next-track action','Previous-track action','Other interruption'].map((name,i)=>({name,count:outcomes[i]})),skipBins:['<5 sec','5–10 sec','10–30 sec','30–60 sec','60+ sec'].map((name,i)=>({name,count:bins[i]})),platforms:[...platforms.values()].sort((a,b)=>b.ms-a.ms),countries:[...countries.values()].sort((a,b)=>b.ms-a.ms),min,max};
}
export function demoDataset(): Dataset {
  const catalog=[['Nights','Frank Ocean','Blonde'],['Everything In Its Right Place','Radiohead','Kid A'],['Tadow','Masego, FKJ','Tadow'],['Space Song','Beach House','Depression Cherry'],['Pink + White','Frank Ocean','Blonde'],['Kerala','Bonobo','Migration'],['Intro','The xx','xx'],['Sunset Lover','Petit Biscuit','Presence'],['Kasoor','Prateek Kuhad','Kasoor'],['Choo Lo','The Local Train','Aalas Ka Pedh'],['Breathe','Télépopmusik','Genetic World'],['Midnight City','M83','Hurry Up, We’re Dreaming'],['Instant Crush','Daft Punk','Random Access Memories'],['Alag Aasmaan','Anuv Jain','Alag Aasmaan'],['Something About Us','Daft Punk','Discovery'],['Lover Is a Day','Cuco','Lover Is a Day'],['Borderline','Tame Impala','The Slow Rush'],['Holocene','Bon Iver','Bon Iver'],['A Walk','Tycho','Dive'],['Apocalypse','Cigarettes After Sex','Cigarettes After Sex']];
  let seed=29;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const events:Event[]=[];
  for(let day=0;day<650;day++){const base=Date.UTC(2025,0,1)+day*86400000;if(rnd()<.13)continue;const count=8+Math.floor(rnd()*29);for(let j=0;j<count;j++){const idx=Math.floor(Math.pow(rnd(),1.4)*catalog.length),[name,artist,album]=catalog[idx];const skip=rnd()<(idx%5===0?.76:idx%3===0?.43:.13);const ms=skip?Math.floor(rnd()*55000):175000+Math.floor(rnd()*65000);events.push({ts:new Date(base+(7+Math.floor(rnd()*16))*3600000+j*240000).toISOString(),ms,uri:`demo:track:${idx}`,name,artist,album,media:'music',source:'audio',platform:rnd()<.55?'osx':'android',country:'IN',start:skip?'fwdbtn':rnd()<.2?'clickrow':'trackdone',end:skip?'fwdbtn':'trackdone',skipped:skip,shuffle:rnd()<.74,offline:rnd()<.06,private:false});}}
  return {events,files:['Synthetic sample · no personal data'],raw:events.length,duplicates:0,invalid:0,errors:[],demo:true};
}
