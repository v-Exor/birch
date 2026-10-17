import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const html=await readFile(resolve(root,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate HTML IDs');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)(?:#[^"]*)?"/g)){
  const ref=match[1];if(/^(https?:|data:)/.test(ref))continue;
  const path=resolve(root,ref);assert.ok(path.startsWith(root+sep),'An asset escaped the project root');await stat(path);
}
for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(match[1]),`Missing anchor ${match[1]}`);
for(const file of ['app.js','processing.js','worker.js','site-config.js','scripts/serve.mjs','scripts/package.mjs'])execFileSync(process.execPath,['--check',resolve(root,file)],{stdio:'inherit'});
const runtime=await readFile(resolve(root,'assets/vendor/opencv.js'));
assert.equal(createHash('sha256').update(runtime).digest('hex'),'bd0c3e6448043de04f6a64a12cb7b759f78c3ab8f7c35c9f2e0f71c88bb17103','Vendored runtime hash changed');
assert.ok(html.includes('Laboratory Activity 2'));
console.log(`Checked HTML IDs, anchors, relative assets, script syntax, and the pinned OpenCV runtime (${runtime.length.toLocaleString()} bytes).`);
