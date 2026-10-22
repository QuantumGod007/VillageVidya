import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
const dist = new URL("../dist/", import.meta.url);
async function walk(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory())
      files.push(...(await walk(join(directory, entry.name), `${path}/`)));
    else if (entry.name !== "sw.js") files.push(path);
  }
  return files;
}
const paths = (await walk(dist.pathname)).filter((p) =>
  /\.(?:html|js|css|woff2?|svg)$/.test(p),
);
const buffers = await Promise.all(
  paths.map((p) => readFile(join(dist.pathname, p))),
);
const size = buffers.reduce((total, b) => total + b.length, 0);
if (size > 50 * 1024 * 1024)
  throw new Error("Offline cache would exceed the SRS 50 MB budget");
const version = createHash("sha256")
  .update(Buffer.concat(buffers))
  .digest("hex")
  .slice(0, 12);
const source = `const CACHE='vv-public-reading-${version}';
const FILES=${JSON.stringify(paths.map((p) => `/${p}`))};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('vv-public-reading-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html')));return;
 }
 if(FILES.includes(url.pathname))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});`;
await writeFile(join(dist.pathname, "sw.js"), source);
console.log(
  `Offline app and reading cache: ${(size / 1024).toFixed(0)} KB; ${paths.length} static files; ${version}`,
);
