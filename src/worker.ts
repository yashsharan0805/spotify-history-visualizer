import { unzipSync, strFromU8 } from 'fflate';
import { normalize, analyze, demoDataset } from './analytics';
import type { Dataset, Filters } from './types';
let dataset: Dataset | null = null;
const MAX_FILE=250*1024*1024, MAX_TOTAL=750*1024*1024;
self.onmessage=async({data}:{data:{id:number;type:string;files?:File[];dataset?:Dataset;filters?:Filters;uri?:string}})=>{
  const {id,type}=data;const send=(payload:object)=>self.postMessage({id,...payload});
  try {
    if(type==='demo'){dataset=demoDataset();send({type:'loaded',dataset});return;}
    if(type==='restore'){dataset=data.dataset!;send({type:'loaded',dataset});return;}
    if(type==='import'){
      const files=data.files||[];if(!files.length)throw new Error('Choose a Spotify ZIP or JSON file.');
      const result:Dataset={events:[],files:[],raw:0,duplicates:0,invalid:0,errors:[],demo:false};const seen=new Set<string>();let bytes=0;
      const read=(name:string,text:string)=>{
        bytes+=text.length;if(bytes>MAX_TOTAL)throw new Error('This import is too large. Import a smaller set of history files.');
        let raw:unknown;try{raw=JSON.parse(text);}catch{result.errors.push(`${name}: invalid JSON`);return;}
        if(!Array.isArray(raw)){result.errors.push(`${name}: expected a JSON array`);return;}
        if(raw.length&&!raw.some(r=>r && typeof r==='object' && 'ts' in r && 'ms_played' in r)){result.errors.push(`${name}: not Extended Streaming History. Request the extended export from Spotify.`);return;}
        result.files.push(name);const source=name.toLowerCase().includes('video')?'video':'audio';
        for(const row of raw){result.raw++;const e=normalize(row,source);if(!e){result.invalid++;continue;}
          // Match complete source records before stripping personal fields. IP addresses never leave this worker.
          const key=source+JSON.stringify(Object.keys(row).sort().map(k=>[k,row[k]]));
          if(seen.has(key)){result.duplicates++;continue;}seen.add(key);result.events.push(e);
        }
      };
      for(let i=0;i<files.length;i++){
        const file=files[i];send({type:'progress',message:`Reading ${file.name}`,progress:(i/files.length)*100});
        if(file.size>MAX_FILE)throw new Error(`${file.name} exceeds the 250 MB file limit.`);
        if(file.name.toLowerCase().endsWith('.zip')){
          let expandedBytes=0;
          const entries=unzipSync(new Uint8Array(await file.arrayBuffer()),{filter:(entry)=>{
            const supported=/Streaming_History_(Audio|Video).*\.json$/i.test(entry.name.split('/').at(-1)||'')||/endsong.*\.json$/i.test(entry.name.split('/').at(-1)||'');
            if(!supported)return false;
            if(entry.originalSize>MAX_FILE)throw new Error('A file in this archive exceeds the safe import limit.');
            expandedBytes+=entry.originalSize;
            if(expandedBytes+bytes>MAX_TOTAL)throw new Error('This archive expands beyond the safe import limit. Import fewer history files.');
            return true;
          }});
          if(!Object.keys(entries).length)result.errors.push(`${file.name}: no extended-history JSON files found.`);
          for(const [name,entry]of Object.entries(entries))read(name,strFromU8(entry));
        }else if(file.name.toLowerCase().endsWith('.json'))read(file.name,await file.text());else result.errors.push(`${file.name}: unsupported file type`);
      }
      if(!result.events.length)throw new Error(result.errors.join('\n')||'No usable history records found.');
      result.events.sort((a,b)=>a.ts.localeCompare(b.ts));dataset=result;send({type:'loaded',dataset});return;
    }
    if(!dataset)throw new Error('Import history first.');
    if(type==='analyze')send({type:'analysis',analysis:analyze(dataset.events,data.filters!)});
    if(type==='track')send({type:'track',events:dataset.events.filter(e=>e.uri===data.uri)});
    if(type==='clear'){dataset=null;send({type:'cleared'});}
  }catch(error){send({type:'error',message:error instanceof Error?error.message:'Import failed.'});}
};
