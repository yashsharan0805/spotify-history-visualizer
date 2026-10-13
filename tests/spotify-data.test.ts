import test from 'node:test';
import assert from 'node:assert/strict';
import { SpotifyApi } from '../src/spotify';
import { filterLiveTracks, liveDefaults, musicTrack, playlistCounts, recentEvidence, savedItem } from '../src/spotify-data';
const uri=(n:number)=>'spotify:track:'+String(n).padStart(22,'0');
const raw=(n:number)=>({uri:uri(n),name:'Song '+n,artists:[{name:'Artist'}],album:{name:'Album',release_date:'2020',images:[]},duration_ms:180000,explicit:false});
const tracks=[musicTrack(raw(1),'2025-01-01T00:00:00Z')!,musicTrack({...raw(2),explicit:true,duration_ms:300000},'2026-01-01T00:00:00Z')!,musicTrack({uri:uri(3),name:'Unknown metadata'})!];

test('API filters use saved dates and exclude missing metadata from explicit numeric/date filters',()=>{
  assert.deepEqual(filterLiveTracks(tracks,{...liveDefaults,savedFrom:'2026-01-01'}).map(t=>t.uri),[uri(2)]);
  assert.deepEqual(filterLiveTracks(tracks,{...liveDefaults,explicit:'no',maxMinutes:'4',releaseFrom:'2019'}).map(t=>t.uri),[uri(1)]);
  assert.deepEqual(filterLiveTracks(tracks,{...liveDefaults,artist:'Artist',sort:'duration'}).map(t=>t.uri),[uri(2),uri(1)]);
});
test('missing evidence is unknown, not an empty listening or ranking history',()=>{
  assert.equal(filterLiveTracks(tracks,{...liveDefaults,recent:'missing'}).length,0);
  assert.equal(filterLiveTracks(tracks,{...liveDefaults,top:'missing'}).length,0);
  const ranks=new Map([[uri(1),1]]),recent=new Map([[uri(2),{count:1,last:'2026-10-13T00:00:00Z'}]]);
  assert.deepEqual(filterLiveTracks(tracks,{...liveDefaults,recent:'missing',top:'seen'},{ranks,recent}).map(t=>t.uri),[uri(1)]);
});
test('recent sample counts deduplicate exact events without implying all-time plays',()=>{
  const a={track:tracks[0],playedAt:'2026-10-12T00:00:00Z',contextUri:''};
  const result=recentEvidence([a,a,{...a,playedAt:'2026-10-13T00:00:00Z'}]);
  assert.deepEqual(result.get(uri(1)),{count:2,last:'2026-10-13T00:00:00Z'});assert.equal(result.has(uri(2)),false);
});
test('playlist membership and duplicate filters use exact track identity',()=>{
  const entries=[{track:tracks[0],addedAt:''},{track:tracks[0],addedAt:''},{track:{...tracks[1],name:tracks[0].name},addedAt:''}];
  const playlist=playlistCounts(entries);
  assert.deepEqual(filterLiveTracks(tracks,{...liveDefaults,playlist:'duplicates'},{playlist}).map(t=>t.uri),[uri(1)]);
  assert.deepEqual(filterLiveTracks(tracks,{...liveDefaults,playlist:'outside'},{playlist}).map(t=>t.uri),[uri(3)]);
});
test('unavailable saved-content dates and retired fields are not fabricated',()=>{
  const item=savedItem({uri:'spotify:audiobook:'+'a'.repeat(22),name:'Book',authors:[{name:'Author'}]},'audiobooks');
  assert.equal(item.savedAt,'');assert.equal(item.creator,'Author');assert.deepEqual(item.genres,[]);
  assert.equal(musicTrack({uri:'spotify:local:test'}),null);assert.equal(musicTrack({uri:uri(1),is_local:true}),null);
});
test('API collection reads normalize wrapped saved items, followed cursors and current playlist item shape',async()=>{
  const calls:string[]=[];const transport=async(input:RequestInfo|URL)=>{
    const u=new URL(String(input));calls.push(u.pathname+u.search);let data:unknown;
    if(u.pathname.endsWith('/following'))data={artists:{items:[{uri:'spotify:artist:'+'a'.repeat(22),name:'Artist'}],next:u.searchParams.has('after')?null:'https://api.spotify.com/v1/me/following?type=artist&after=a'}};
    else if(u.pathname.endsWith('/albums'))data={items:[{added_at:'2026-01-01',album:{uri:'spotify:album:'+'a'.repeat(22),name:'Album'}}],next:null};
    else if(u.pathname.endsWith('/audiobooks'))data={items:[{uri:'spotify:audiobook:'+'a'.repeat(22),name:'Book'}],next:null};
    else data={items:[{added_at:'2026-01-01',item:raw(1)},{item:null},{item:{uri:'spotify:episode:'+'a'.repeat(22)}}],next:null};
    return new Response(JSON.stringify(data));
  };
  const api=new SpotifyApi(async()=>'synthetic',transport as typeof fetch);
  assert.equal((await api.saved('artists')).length,2);assert.equal((await api.saved('albums'))[0].savedAt,'2026-01-01');assert.equal((await api.saved('audiobooks'))[0].savedAt,'');
  assert.equal((await api.playlistEntries('p'.repeat(22))).length,1);assert.ok(calls.some(c=>c.includes('after=a')));
});
test('quota-exceeded responses stop without replaying requests',async()=>{
  let calls=0;const api=new SpotifyApi(async()=>'synthetic',async()=>{calls++;return new Response(JSON.stringify({error:{reason:'QUOTA_EXCEEDED'}}),{status:429});});
  await assert.rejects(()=>api.recent(),/quota/);assert.equal(calls,1);
});
test('authentication failures retain their reconnect guidance and never send a network request',async()=>{
  let calls=0;const api=new SpotifyApi(async()=>{throw new Error('Reconnect Spotify');},async()=>{calls++;return new Response('{}');});
  await assert.rejects(()=>api.recent(),/Reconnect Spotify/);assert.equal(calls,0);
});
test('playback explicitly requests track and episode support',async()=>{
  let requested='';const api=new SpotifyApi(async()=>'synthetic',async(input)=>{requested=String(input);return new Response(null,{status:204});});
  assert.equal(await api.playback(),undefined);assert.equal(new URL(requested).searchParams.get('additional_types'),'track,episode');
});
test('partial collection failures do not return a misleading complete list',async()=>{
  let calls=0;const api=new SpotifyApi(async()=>'synthetic',async()=>{calls++;return calls===1?new Response(JSON.stringify({items:[{added_at:'2026-01-01',album:{name:'Album'}}],next:'https://api.spotify.com/v1/me/albums?offset=50'})):new Response('{}',{status:503});});
  await assert.rejects(()=>api.saved('albums'),/503/);assert.equal(calls,2);
});
