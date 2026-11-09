import { readdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const assets=(await readdir('dist/assets')).filter(x=>/\.(js|css|woff2)$/.test(x)).map(x=>'/assets/'+x);
const shell=['/','/index.html','/manifest.webmanifest','/icon.svg','/icon-192.png','/icon-512.png',...assets];
const hash=createHash('sha256').update(await readFile('dist/index.html')).update(JSON.stringify(shell)).digest('hex').slice(0,16);
const script=`// Generated for this exact production build. Firmware is never fetched/cached here.
const CACHE='smk37-shell-${hash}';
const SHELL=${JSON.stringify(shell)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
// Waiting workers activate only when old clients have closed. No skipWaiting or automatic page reload.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('smk37-shell-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);
  if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){event.respondWith(caches.open(CACHE).then(c=>c.match('/index.html')).then(r=>r||fetch(event.request)));return;}
  if(SHELL.includes(u.pathname))event.respondWith(caches.open(CACHE).then(c=>c.match(u.pathname)).then(r=>r||fetch(event.request)));
});
`;
await writeFile('dist/sw.js',script);
console.log(`PWA: ${shell.length} pinned app assets; smk37-shell-${hash}`);
