import type { LibraryTrack, Playlist, Receipt } from './types';
import { musicTrack, savedItem, type RawItem, type SavedItem, type SavedKind, type TimeRange, type TopItems, type RecentPlay, type PlaylistEntry, type Playback } from './spotify-data';
const API='https://api.spotify.com/v1';
const TOKEN_KEY='rewind.spotify.session';
export const SPOTIFY_SCOPES='user-library-read user-library-modify playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-top-read user-read-recently-played user-read-playback-state user-follow-read';
const SCOPE=SPOTIFY_SCOPES;
export function grantedScopes():Set<string>{try{return new Set((JSON.parse(sessionStorage.getItem(TOKEN_KEY)||'null')?.scope||'').split(' ').filter(Boolean));}catch{return new Set();}}
export function clientId(){const id=import.meta.env?.VITE_SPOTIFY_CLIENT_ID?.trim()||'';return /^[a-f0-9]{32}$/i.test(id)?id:'';}
export function callbackUrl(){return `${location.origin}/auth/spotify/callback`;}
export function hasToken(){return !!sessionStorage.getItem(TOKEN_KEY);}
export function disconnect(){sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem('rewind.oauth');}
const base64url=(array:Uint8Array)=>btoa(String.fromCharCode(...array)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function connect(){
  const id=clientId();if(!id)throw new Error('Spotify connection is not available yet. You can still explore your listening history.');
  const verifier=base64url(crypto.getRandomValues(new Uint8Array(64))),state=base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  sessionStorage.setItem('rewind.oauth',JSON.stringify({verifier,state,id,redirect:callbackUrl(),at:Date.now()}));
  const params=new URLSearchParams({client_id:id,response_type:'code',redirect_uri:callbackUrl(),scope:SCOPE,state,code_challenge_method:'S256',code_challenge:challenge});
  location.assign(`https://accounts.spotify.com/authorize?${params}`);
}
interface Token { access_token:string; refresh_token:string; expires_at:number; client_id:string; scope?:string; }
async function exchange(params:URLSearchParams):Promise<Record<string,unknown>>{
  const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params});
  const body=await r.json();if(!r.ok)throw new Error('Spotify could not complete the connection. Please try again later.');return body;
}
export async function finishLogin():Promise<boolean>{
  const query=new URLSearchParams(location.search);if(!query.has('code')&&!query.has('error'))return false;
  const pending=JSON.parse(sessionStorage.getItem('rewind.oauth')||'null');
  history.replaceState({},'', '/');
  sessionStorage.removeItem('rewind.oauth');
  if(!pending||query.get('state')!==pending.state||Date.now()-pending.at>600000)throw new Error('The Spotify login session expired or could not be verified. Connect again.');
  if(query.has('error'))throw new Error('Spotify connection was cancelled. Your imported history is still available.');
  const body=await exchange(new URLSearchParams({grant_type:'authorization_code',code:query.get('code')!,redirect_uri:pending.redirect,client_id:pending.id,code_verifier:pending.verifier}));
  if(typeof body.access_token!=='string'||typeof body.refresh_token!=='string')throw new Error('Spotify did not return a usable session. Connect again.');
  sessionStorage.setItem(TOKEN_KEY,JSON.stringify({...body,client_id:pending.id,expires_at:Date.now()+Number(body.expires_in)*1000}));return true;
}
let refreshing:Promise<Token>|null=null;
async function token(force=false):Promise<Token>{
  const current:Token|null=JSON.parse(sessionStorage.getItem(TOKEN_KEY)||'null');if(!current)throw new Error('Connect Spotify to use library actions.');
  if(!force&&Date.now()<current.expires_at-30000)return current;
  if(!refreshing)refreshing=(async()=>{try{
    const body=await exchange(new URLSearchParams({grant_type:'refresh_token',refresh_token:current.refresh_token,client_id:current.client_id}));
    const next={access_token:String(body.access_token),refresh_token:String(body.refresh_token||current.refresh_token),client_id:current.client_id,scope:typeof body.scope==='string'?body.scope:current.scope,expires_at:Date.now()+Number(body.expires_in)*1000};sessionStorage.setItem(TOKEN_KEY,JSON.stringify(next));return next;
  }catch(e){disconnect();throw e;}finally{refreshing=null;}})();return refreshing;
}
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export class SpotifyApiError extends Error {constructor(public status:number,message:string){super(message);this.name='SpotifyApiError';}}
export class SpotifyApi {
  constructor(private access:()=>Promise<string>=async()=> (await token()).access_token,private transport:typeof fetch=globalThis.fetch.bind(globalThis)){}
  async request<T=unknown>(path:string,method='GET',body?:unknown,attempt=0):Promise<T>{
    if(path.startsWith('https://')){if(!path.startsWith(API+'/'))throw new Error('Refused an unexpected Spotify pagination URL.');path=path.slice(API.length);}
    if(!path.startsWith('/'))throw new Error('Invalid Spotify request.');
    const access=await this.access();
    let r:Response;try{r=await this.transport(API+path,{method,headers:{Authorization:`Bearer ${access}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
    catch{throw new Error(method==='GET'?'Could not reach Spotify. Check your connection.':'Spotify did not confirm this change. Refresh the library before trying again.');}
    if(r.status===401&&attempt===0){await token(true);return this.request(path,method,body,1);}
    if(r.status===429&&attempt<2){const json=await r.clone().json().catch(()=>null);if(json?.error?.reason==='QUOTA_EXCEEDED')throw new SpotifyApiError(429,'Spotify’s account API quota was reached. Try again later.');const seconds=Math.max(1,Number(r.headers.get('Retry-After')||'3'));if(seconds>60)throw new SpotifyApiError(429,`Spotify’s request limit was reached. Try again in ${Math.ceil(seconds)} seconds.`);await pause(seconds*1000);return this.request(path,method,body,attempt+1);}
    if(!r.ok){let message='';try{const json=await r.json();message=json.error?.message||json.error_description||'';}catch{/* no body */}
      if(r.status===403)throw new SpotifyApiError(403,'Spotify denied this request. Reconnect to grant the required permissions, or check this account’s app access.');
      throw new SpotifyApiError(r.status,`Spotify ${r.status}: ${message||'Request failed. Refresh before retrying a change.'}`);}
    const text=await r.text();return (text?JSON.parse(text):undefined) as T;
  }
  async pages<T>(path:string):Promise<T[]>{const all:T[]=[],visited=new Set<string>();let next:string|null=path;while(next){if(visited.has(next)||visited.size>1000)throw new Error('Spotify returned unexpected pagination.');visited.add(next);const page:{items:T[];next:string|null}=await this.request(next);if(!page||!Array.isArray(page.items))throw new Error('Spotify returned an incomplete collection. Refresh before using it.');all.push(...page.items);next=page.next;}return all;}
  me(){return this.request<{id:string;display_name:string}>('/me');}
  async library():Promise<LibraryTrack[]>{
    const rows=await this.pages<{added_at:string;track:RawItem|null}>('/me/tracks?limit=50');
    return rows.flatMap(r=>{const t=musicTrack(r.track,r.added_at);return t?[t]:[];});
  }
  async playlists(account:string){const items=await this.pages<Playlist>('/me/playlists?limit=50');return items.filter(p=>p.owner.id===account);}
  allPlaylists(){return this.pages<Playlist>('/me/playlists?limit=50');}
  async top(range:TimeRange):Promise<TopItems>{
    const [tracks,artists]=await Promise.all([this.request<{items:RawItem[]}>(`/me/top/tracks?time_range=${range}&limit=50`),this.request<{items:RawItem[]}>(`/me/top/artists?time_range=${range}&limit=50`)]);
    return {tracks:tracks.items.flatMap(t=>{const track=musicTrack(t);return track?[track]:[];}),artists:artists.items.map(a=>savedItem(a,'artists'))};
  }
  async recent():Promise<RecentPlay[]>{const page=await this.request<{items:{track:RawItem;played_at:string;context?:{uri:string}|null}[]}>('/me/player/recently-played?limit=50');return page.items.flatMap(p=>{const track=musicTrack(p.track);return track&&p.played_at?[{track,playedAt:p.played_at,contextUri:p.context?.uri||''}]:[];});}
  playback(){return this.request<Playback|undefined>('/me/player?additional_types=track,episode');}
  async playlistEntries(id:string):Promise<PlaylistEntry[]>{validatePlaylist(id);const rows=await this.pages<{item?:RawItem|null;track?:RawItem|null;added_at?:string}>(`/playlists/${id}/items?limit=50`);return rows.flatMap(r=>{const track=musicTrack(r.item||r.track);return track?[{track,addedAt:r.added_at||''}]:[];});}
  async saved(kind:SavedKind):Promise<SavedItem[]>{
    if(kind==='artists'){
      const result:SavedItem[]=[],visited=new Set<string>();let next:string|null='/me/following?type=artist&limit=50';
      while(next){if(visited.has(next)||visited.size>1000)throw new Error('Spotify returned unexpected artist pagination.');visited.add(next);const page:{artists:{items:RawItem[];next:string|null}}=await this.request(next);if(!Array.isArray(page?.artists?.items))throw new Error('Spotify returned incomplete followed artists.');result.push(...page.artists.items.map(a=>savedItem(a,kind)));next=page.artists.next;}return result;
    }
    const rows=await this.pages<{added_at?:string;album?:RawItem;show?:RawItem;episode?:RawItem}&RawItem>(`/me/${kind}?limit=50`);
    return rows.map(r=>savedItem(r.album||r.show||r.episode||r,kind,r.added_at||''));
  }
  async playlistItems(id:string){validatePlaylist(id);const items=await this.pages<{item?:{uri:string};track?:{uri:string}}> (`/playlists/${id}/items?limit=50`);return new Set(items.map(i=>(i.item||i.track)?.uri).filter((u):u is string=>!!u));}
  async contains(uris:string[]){const result=new Map<string,boolean>();for(const group of chunks(uniqueTracks(uris),40)){const flags=await this.request<boolean[]>(`/me/library/contains?${new URLSearchParams({uris:group.join(',')})}`);if(!Array.isArray(flags)||flags.length!==group.length||flags.some(x=>typeof x!=='boolean'))throw new Error('Spotify returned an invalid saved-status response.');group.forEach((u,i)=>result.set(u,flags[i]));}return result;}
  async remove(uris:string[]){for(const group of chunks(uniqueTracks(uris),40))await this.request(`/me/library?${new URLSearchParams({uris:group.join(',')})}`,'DELETE');}
  async save(uris:string[]){for(const group of chunks(uniqueTracks(uris),40))await this.request(`/me/library?${new URLSearchParams({uris:group.join(',')})}`,'PUT');}
  async createPlaylist(name:string){if(!name.trim())throw new Error('Give the playlist a name.');return this.request<Playlist>('/me/playlists','POST',{name:name.trim(),public:false,description:'Curated from my listening history with Rewind.'});}
  async add(id:string,uris:string[]){validatePlaylist(id);for(const group of chunks(uniqueTracks(uris),100))await this.request(`/playlists/${id}/items`,'POST',{uris:group});}
}
export const validTrack=(uri:string)=>/^spotify:track:[A-Za-z0-9]{22}$/.test(uri);
export function uniqueTracks(uris:string[]){if(uris.some(u=>!validTrack(u)))throw new Error('Only real Spotify music tracks can be changed. Demo, local and podcast items cannot be used.');return [...new Set(uris)];}
function validatePlaylist(id:string){if(!/^[A-Za-z0-9]{22}$/.test(id))throw new Error('Invalid destination playlist.');}
export function chunks<T>(values:T[],size:number){const out:T[][]=[];for(let i=0;i<values.length;i+=size)out.push(values.slice(i,i+size));return out;}
export async function executeBulk(api:SpotifyApi,options:{action:'unlike'|'add'|'move';account:string;uris:string[];playlist?:string},progress:(done:number,total:number)=>void):Promise<Receipt>{
  const {action,account,playlist}=options,uris=uniqueTracks(options.uris);
  if((await api.me()).id!==account)throw new Error('The connected Spotify account changed. Refresh before continuing.');
  const receipt:Receipt={id:crypto.randomUUID(),account,at:new Date().toISOString(),action,playlist,requested:uris,added:[],unliked:[],restored:[],failed:[]};
  let destination=new Set<string>();
  if(action!=='unlike'){
    if(!playlist)throw new Error('Choose a destination playlist.');validatePlaylist(playlist);
    const info=await api.request<Playlist>(`/playlists/${playlist}`);if(info.owner.id!==account)throw new Error('Choose a playlist owned by your connected account.');
    destination=await api.playlistItems(playlist);
  }
  let done=0;
  for(const group of chunks(uris,action==='add'?100:40)){
    try{
      if(action!=='unlike'){
        const missing=group.filter(u=>!destination.has(u));if(missing.length)await api.add(playlist!,missing);
        const verified=await api.playlistItems(playlist!);receipt.added.push(...missing.filter(u=>verified.has(u)));destination=verified;
        if(group.some(u=>!verified.has(u)))throw new Error('Playlist addition could not be verified. These songs were not unliked.');
      }
      if(action!=='add'){
        const before=await api.contains(group),liked=group.filter(u=>before.get(u));
        if(liked.length){await api.remove(liked);const after=await api.contains(liked);const removed=liked.filter(u=>after.get(u)===false);receipt.unliked.push(...removed);
          for(const uri of liked.filter(u=>after.get(u)!==false))receipt.failed.push({uri,error:'Removal could not be verified. Refresh before trying again.'});}
      }
    }catch(e){const error=e instanceof Error?e.message:'Change failed.';for(const uri of group.filter(u=>!receipt.unliked.includes(u)))receipt.failed.push({uri,error});
      // Stop after a failed or ambiguous write. A fresh user action is required to retry.
      for(const uri of uris.slice(done+group.length))receipt.failed.push({uri,error:'Not attempted after an earlier failure.'});done+=group.length;progress(done,uris.length);break;
    }
    done+=group.length;progress(done,uris.length);
  }
  return receipt;
}
