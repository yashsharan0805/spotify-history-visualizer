import test from 'node:test';
import assert from 'node:assert/strict';
import { SpotifyApi, executeBulk, uniqueTracks } from '../src/spotify';
const uri=(n:number)=>'spotify:track:'+String(n).padStart(22,'0');
const playlist='p'.repeat(22);
function fixture(options:{failAdd?:boolean;invisibleAdd?:boolean;account?:string;existing?:string[]}={}){
  const liked=new Set(Array.from({length:120},(_,i)=>uri(i))),items=new Set(options.existing||[]),writes:{path:string;method:string;uris:string[]}[]=[];
  const transport=async(input:RequestInfo|URL,init?:RequestInit)=>{
    const u=new URL(String(input)),path=u.pathname.replace('/v1',''),method=init?.method||'GET',body=init?.body?JSON.parse(String(init.body)):{};
    let value:unknown;
    if(path==='/me')value={id:options.account||'owner',display_name:'Test account'};
    else if(path===`/playlists/${playlist}`)value={id:playlist,name:'Test playlist',owner:{id:'owner'}};
    else if(path===`/playlists/${playlist}/items`&&method==='GET')value={items:[...items].map(uri=>({item:{uri}})),next:null};
    else if(path==='/me/library/contains')value=u.searchParams.get('uris')!.split(',').map(uri=>liked.has(uri));
    else if(path==='/me/library'){
      const uris=u.searchParams.get('uris')!.split(',');writes.push({path,method,uris});assert.ok(uris.length<=40);uris.forEach(uri=>method==='DELETE'?liked.delete(uri):liked.add(uri));
    }else if(path===`/playlists/${playlist}/items`&&method==='POST'){
      writes.push({path,method,uris:body.uris});assert.ok(body.uris.length<=100);
      if(options.failAdd)return new Response(JSON.stringify({error:{message:'uncertain failure'}}),{status:503});
      if(!options.invisibleAdd)body.uris.forEach((u:string)=>items.add(u));
    }else throw new Error('Unexpected fixture request: '+method+' '+path);
    return new Response(value===undefined?'':JSON.stringify(value),{status:200});
  };
  return {api:new SpotifyApi(async()=>'test-token',transport as typeof fetch),liked,items,writes};
}
test('move adds and verifies before unliking, using valid batch sizes',async()=>{
  const f=fixture(),uris=Array.from({length:90},(_,i)=>uri(i));const r=await executeBulk(f.api,{action:'move',account:'owner',uris,playlist},()=>{});
  assert.equal(r.added.length,90);assert.equal(r.unliked.length,90);assert.equal(r.failed.length,0);assert.equal(f.writes[0].method,'POST');assert.equal(f.writes[1].method,'DELETE');assert.equal(f.liked.has(uri(0)),false);
});
test('failed playlist addition never unlikes or automatically replays an ambiguous write',async()=>{
  const f=fixture({failAdd:true}),uris=Array.from({length:80},(_,i)=>uri(i));const r=await executeBulk(f.api,{action:'move',account:'owner',uris,playlist},()=>{});
  assert.equal(r.unliked.length,0);assert.equal(r.failed.length,80);assert.equal(f.writes.length,1);assert.equal(f.liked.size,120);
});
test('unverified successful response is insufficient to unlike songs',async()=>{
  const f=fixture({invisibleAdd:true});const r=await executeBulk(f.api,{action:'move',account:'owner',uris:[uri(1)],playlist},()=>{});assert.equal(r.unliked.length,0);assert.equal(f.liked.has(uri(1)),true);assert.equal(r.failed.length,1);
});
test('existing destination tracks are not duplicated and can be moved after verification',async()=>{
  const f=fixture({existing:[uri(1)]});const r=await executeBulk(f.api,{action:'move',account:'owner',uris:[uri(1),uri(1)],playlist},()=>{});assert.equal(r.requested.length,1);assert.equal(r.added.length,0);assert.equal(r.unliked.length,1);assert.equal(f.writes[0].method,'DELETE');
});
test('account mismatch fails before any mutation',async()=>{
  const f=fixture({account:'other'});await assert.rejects(()=>executeBulk(f.api,{action:'unlike',account:'owner',uris:[uri(1)]},()=>{}),/account changed/);assert.equal(f.writes.length,0);
});
test('unsafe identifiers, albums, demo and non-track content are never accepted',()=>{
  for(const u of ['demo:track:1','spotify:album:'+'a'.repeat(22),'spotify:episode:'+'a'.repeat(22),'spotify:track:bad','https://example.com'])assert.throws(()=>uniqueTracks([u]),/real Spotify music/);
});
test('pagination cannot send OAuth credentials to another origin',async()=>{
  const f=fixture();await assert.rejects(()=>f.api.request('https://evil.example/me'),/unexpected Spotify pagination/);assert.equal(f.writes.length,0);
});
