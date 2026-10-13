import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, analyze, defaults } from '../src/analytics';
const row=(more:Record<string,unknown>={})=>normalize({ts:'2026-01-01T00:00:00Z',ms_played:45000,spotify_track_uri:'spotify:track:0000000000000000000001',master_metadata_track_name:'Song',master_metadata_album_artist_name:'Artist',reason_end:'fwdbtn',ip_addr:'private',...more},'audio')!;
test('privacy: normalized events omit IP addresses, user agents and arbitrary source properties',()=>{
  const e=row({username:'private',user_agent_decrypted:'private',untrusted:'private'});assert.equal(JSON.stringify(e).includes('private"'),true); // only the private-session field name remains
  assert.equal('ip_addr' in e,false);assert.equal('username' in e,false);assert.equal('user_agent_decrypted' in e,false);assert.equal('untrusted' in e,false);
});
test('older flags do not undercount 2022 next-track actions; denominator excludes pre-2022 events',()=>{
  const events=[row({ts:'2021-01-01T00:00:00Z',reason_end:'fwdbtn'}),row({ts:'2022-01-01T00:00:00Z',skipped:false}),row({reason_end:'trackdone',ms_played:220000}),row({reason_end:'endplay',skipped:true})];
  const a=analyze(events,{...defaults,timezone:'UTC'});assert.equal(a.total,4);assert.equal(a.eligible,3);assert.equal(a.skips,1);assert.equal(a.flags,1);assert.equal(a.tracks[0].skipRate,1/3);assert.equal(a.completed,1);assert.equal(a.tracks[0].listens,4);
});
test('date filtering applies chosen timezone at boundary, including half-hour offsets',()=>{
  const events=[row({ts:'2026-01-01T18:20:00Z'}),row({ts:'2026-01-01T18:40:00Z'})];
  const a=analyze(events,{...defaults,timezone:'Asia/Kolkata',from:'2026-01-02',to:'2026-01-02'});assert.equal(a.total,1);assert.equal(a.days[0].day,'2026-01-02');
});
test('zero-duration attempts count, but podcasts do not enter music skip-rate denominator',()=>{
  const events=[row({ms_played:0}),normalize({ts:'2026-01-01T00:00:00Z',ms_played:9000,spotify_episode_uri:'spotify:episode:0000000000000000000002',episode_name:'Episode',reason_end:'fwdbtn'},'video')!];
  const a=analyze(events,{...defaults,media:'all',timezone:'UTC'});assert.equal(a.total,2);assert.equal(a.eligible,1);assert.equal(a.skips,1);assert.equal(a.videos,1);assert.equal(a.tracks.find(t=>t.media==='podcast')?.skipRate,null);
});
test('invalid timestamps, missing identifiers and negative durations are rejected',()=>{
  assert.equal(row({ts:'bad'}),null);assert.equal(row({ms_played:-1}),null);assert.equal(row({spotify_track_uri:null}),null);
});
test('sparse timeline retains empty months instead of hiding the gap',()=>{
  const a=analyze([row({ts:'2026-01-01T00:00:00Z'}),row({ts:'2026-03-01T00:00:00Z'})],{...defaults,timezone:'UTC'});assert.equal(a.months.length,3);assert.equal(a.months[1].month,'2026-02');assert.equal(a.months[1].ms,0);
});
