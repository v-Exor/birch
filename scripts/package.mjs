import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const stage=resolve(root,'artifacts/github-pages');
if(!stage.startsWith(root+sep)||stage!==resolve(root,'artifacts','github-pages'))throw new Error('Refusing an unsafe staging path');
// Only the explicitly verified generated staging directory is replaced.
await rm(stage,{recursive:true,force:true});await mkdir(stage,{recursive:true});
const files=['index.html','styles.css','app.js','processing.js','worker.js','site-config.js','.nojekyll','assets','python','downloads'];
for(const file of files){await stat(resolve(root,file));await cp(resolve(root,file),resolve(stage,file),{recursive:true,filter:path=>!path.includes('__pycache__')&&!path.startsWith(resolve(root,'python/results'))});}
console.log(`Production files staged at ${stage}. No build or runtime package installation is required.`);
