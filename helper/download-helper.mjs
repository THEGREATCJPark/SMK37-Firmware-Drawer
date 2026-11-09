import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const VA = Object.freeze({url:'https://baudgirl.com/fm1/firmware/SMK-37+VA-102.fwsc',size:859716,sha256:'01f7283b951d7a00ad54d00da6099b247085c87668d2be72519dc395ab9f83e4'});
export const VA_FACTORY=Object.freeze({url:'https://baudgirl.com/fm1/presets/fm1-factory-presets.syx',size:29568,sha256:'8e67df1ceda3ae814cc4bb982413ef88cc8435263869afc2f29327b7954e2a41'});
const origins=new Set(['https://thegreatcjpark.github.io','http://127.0.0.1:4173','http://localhost:4173']);

// Only this public, hash-pinned file. No arbitrary URLs, files, MIDI, USB or shell commands.
export function createDownloadHelper(fetchFile=fetch) {
  return createServer(async(req,res)=>{
    const port=res.socket.localPort;
    if(req.headers.host!==`127.0.0.1:${port}`||!origins.has(req.headers.origin)) {res.writeHead(403);res.end('Origin or host refused');return;}
    res.setHeader('Access-Control-Allow-Origin',req.headers.origin);
    res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store');
    if(req.method==='OPTIONS'){
      res.setHeader('Access-Control-Allow-Methods','GET');
      res.setHeader('Access-Control-Allow-Private-Network','true');res.writeHead(204);res.end();return;
    }
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    if(req.url==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({app:'SMK37 personal download helper',protocol:1}));return;}
    const pin=req.url==='/packages/va-102'?VA:req.url==='/packages/va-factory'?VA_FACTORY:null;
    if(!pin){res.writeHead(404);res.end();return;}
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),45000);
    const disconnected=()=>{if(!res.writableEnded)abort.abort();};res.on('close',disconnected);
    try{
      const upstream=await fetchFile(pin.url,{signal:abort.signal,redirect:'error'});
      if(!upstream.ok||!upstream.body)throw Error('Original download unavailable');
      const reader=upstream.body.getReader(),chunks=[];let size=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>pin.size)throw Error('Package exceeds pinned size');chunks.push(value);}}
      catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
      const bytes=Buffer.concat(chunks);
      if(size!==pin.size||createHash('sha256').update(bytes).digest('hex')!==pin.sha256)throw Error('Package hash mismatch');
      res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':bytes.length});res.end(bytes);
    }catch(error){if(!res.destroyed){res.writeHead(502,{'Content-Type':'text/plain; charset=utf-8'});res.end('Download refused: '+error.message);}}
    finally{clearTimeout(timer);res.off('close',disconnected);}
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const server=createDownloadHelper();
  server.listen(19437,'127.0.0.1',()=>console.log('SMK37 download helper ready. Keep this window open.\nOpen https://thegreatcjpark.github.io/SMK37-Firmware-Drawer/\nThis helper downloads two pinned files only. It never accesses your keyboard.\nClose this window to stop.'));
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port 19437 is already in use. Close the older helper window.':error.message);process.exitCode=1;});
}
