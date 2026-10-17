import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const fixtures=JSON.parse(await readFile(new URL('./opencv-fixtures.json',import.meta.url),'utf8'));
const sample=fileURLToPath(new URL('../assets/cat.jpg',import.meta.url));
const upload=fileURLToPath(new URL('./upload-fixture.png',import.meta.url));
async function ready(page,url='./'){
  await page.goto(url);
  await expect(page.locator('#process-status')).toContainText('Complete',{timeout:60000});
  await expect(page.locator('#error-message')).toBeHidden();
}
async function run(page){await page.locator('#process-button').click();await expect(page.locator('#process-status')).toContainText('Complete');await expect(page.locator('#error-message')).toBeHidden();}

test('Sobel and Canny agree with actual Python OpenCV fixtures',async({page})=>{
  await ready(page);
  const actual=await page.evaluate(async cases=>{
    const worker=new Worker(new URL('./worker.js',location.href));
    try {
      await new Promise((resolve,reject)=>{worker.onmessage=({data})=>data.type==='ready'?resolve():data.type==='engine-error'?reject(Error(data.message)):null;worker.onerror=reject;});
      const outputs=[];
      for(let id=0;id<cases.length;id++){
        const fixture=cases[id];
        const rgba=new Uint8ClampedArray(fixture.input.length*4);
        fixture.input.forEach((v,i)=>{rgba[4*i]=rgba[4*i+1]=rgba[4*i+2]=v;rgba[4*i+3]=255;});
        const result=await new Promise((resolve,reject)=>{
          worker.onmessage=({data})=>data.type==='result'?resolve(data.result):reject(Error(data.message));
          worker.postMessage({type:'process',id,rgba:rgba.buffer,width:fixture.width,height:fixture.height,parameters:{blur:3,low:100,high:200}},[rgba.buffer]);
        });
        outputs.push({name:fixture.name,gray:[...result.gray],blurred:[...result.blurred],canny:[...result.canny],metrics:result.metrics});
      }
      return outputs;
    }finally{worker.terminate();}
  },fixtures.cases);
  for(let i=0;i<actual.length;i++){
    expect(actual[i].gray,actual[i].name).toEqual(fixtures.cases[i].input);
    expect(actual[i].blurred,actual[i].name).toEqual(fixtures.cases[i].blurred);
    expect(actual[i].canny,actual[i].name).toEqual(fixtures.cases[i].canny);
    expect(actual[i].metrics.edgePixels).toBe(fixtures.cases[i].edgePixels);
    expect(actual[i].metrics.sobelPeak).toBeCloseTo(fixtures.cases[i].sobelPeak,3);
  }
});

test('real outputs, reruns, presets, blur and stale output protection',async({page})=>{
  const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4174')&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});
  await ready(page);
  await expect(page.locator('#image-dimensions')).toHaveText('736 × 736');
  const count=Number((await page.locator('#metric-pixels').innerText()).replaceAll(',',''));
  expect(count).toBeGreaterThan(10000);expect(count).toBeLessThan(16000);
  const shades=await page.locator('#canny-canvas').evaluate(c=>[...new Set(c.getContext('2d').getImageData(0,0,c.width,c.height).data)]);
  expect(shades.sort((a,b)=>a-b)).toEqual([0,255]);
  await page.locator('[data-preset="50,100"]').click();
  await expect(page.locator('#download-comparison')).toBeDisabled();
  await expect(page.locator('#output-settings')).toContainText('previous run');
  await run(page);
  expect(Number((await page.locator('#metric-pixels').innerText()).replaceAll(',',''))).toBeGreaterThanOrEqual(count);
  await page.locator('#blur-size').selectOption('7');await run(page);
  await expect(page.locator('#output-settings')).toContainText('Gaussian 7 × 7');
  await page.locator('.pipeline-details summary').click();await expect(page.locator('#gx-canvas')).toBeVisible();
  await page.locator('#reset-settings').click();await run(page);
  await expect(page.locator('#output-settings')).toContainText('Canny 100 / 200');
  await expect(page.locator('#run-count')).toHaveText('4');
  expect(errors).toEqual([]);expect(external).toEqual([]);
});

test('uploads, invalid files, corrupt images and threshold validation',async({page})=>{
  await ready(page);
  await page.locator('#image-upload').setInputFiles(upload);await expect(page.locator('#source-name')).toHaveText('upload-fixture.png');
  await expect(page.locator('#image-dimensions')).toHaveText('80 × 60');
  await expect(page.locator('#download-comparison')).toBeDisabled();await run(page);
  await page.locator('#image-upload').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')});
  await expect(page.locator('#error-message')).toContainText('Choose a JPEG');
  await page.locator('#image-upload').setInputFiles({name:'corrupt.jpg',mimeType:'image/jpeg',buffer:Buffer.from('invalid image')});
  await expect(page.locator('#error-message')).toBeVisible();
  await expect(page.locator('#source-name')).toHaveText('upload-fixture.png');
  await page.locator('#threshold-low').fill('900');await page.locator('#threshold-high').fill('100');
  await page.locator('#process-button').click();await expect(page.locator('#error-message')).toContainText('must not exceed');
  await page.locator('#reset-settings').click();await page.locator('#use-sample').click();await expect(page.locator('#source-name')).toHaveText('cat.jpg');await run(page);
});

test('PNG and JSON downloads, Python source and configurable links',async({page})=>{
  await ready(page);
  for(const selector of ['[data-download="sobel"]','[data-download="canny"]','#download-comparison']){
    const downloadPromise=page.waitForEvent('download');await page.locator(selector).click();const download=await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);const bytes=await readFile(await download.path());expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
  }
  const jsonPromise=page.waitForEvent('download');await page.locator('#export-results').click();const json=await jsonPromise;
  const measurements=JSON.parse(await readFile(await json.path(),'utf8'));expect(measurements.latest.parameters).toEqual({blur:3,low:100,high:200});
  await page.locator('.code-details summary').click();await expect(page.locator('#python-code')).toContainText('cv2.Canny(img_blur, 100, 200)');
  await page.locator('.compilation-nav').click();await expect(page.locator('#link-dialog')).toBeVisible();
  await page.locator('#compilation-url').fill('https://example.com/laboratories/');
  await page.locator('#repository-url').fill('https://github.com/example/lab2');
  const configPromise=page.waitForEvent('download');await page.locator('#download-config').click();const config=await configPromise;
  expect(await readFile(await config.path(),'utf8')).toContain('https://example.com/laboratories/');
  await page.getByRole('button',{name:'Save links',exact:true}).click();await page.reload();await page.locator('#open-settings').click();await expect(page.locator('#compilation-url')).toHaveValue('https://example.com/laboratories/');
  await page.keyboard.press('Escape');await expect(page.locator('#link-dialog')).toBeHidden();
});

test('root and GitHub repository subpaths, 320px to desktop, keyboard navigation',async({page})=>{
  await ready(page,'http://127.0.0.1:4174/');
  await ready(page,'http://127.0.0.1:4174/lab-02/');
  for(const width of [320,375,390,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth),`overflow at ${width}px`).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#menu-toggle').click();await expect(page.locator('#main-nav')).toBeVisible();
  await page.locator('#main-nav a[href="#experiments"]').click();await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded','false');
  await page.locator('#threshold-low').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#low-value')).toHaveText('101');
  await page.locator('#open-settings').click();await page.keyboard.press('Escape');await expect(page.locator('#link-dialog')).toBeHidden();
});

test('accessible desktop, expanded explanations, mobile and link dialog',async({page})=>{
  await ready(page);
  const audit=async()=>{
    const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  };
  await audit();
  await page.locator('.pipeline-details summary').click();await page.locator('.code-details summary').click();await page.locator('.qa-list details').evaluateAll(items=>items.forEach(item=>item.open=true));
  await audit();
  await page.setViewportSize({width:390,height:844});await audit();
  await page.locator('#open-settings').click();await audit();
});

test('runtime load failure is explained and can recover with retry',async({page,context})=>{
  await context.route('**/assets/vendor/opencv.js',route=>route.abort());
  await page.goto('./');
  await expect(page.locator('#engine-status')).toHaveText('Vision engine unavailable',{timeout:15000});
  await expect(page.locator('#error-message')).toBeVisible();
  await expect(page.locator('#process-button')).toBeDisabled();
  await expect(page.locator('#retry-engine')).toBeVisible();
  await context.unroute('**/assets/vendor/opencv.js');
  await page.locator('#retry-engine').click();
  await expect(page.locator('#process-status')).toContainText('Complete',{timeout:60000});
  await expect(page.locator('#error-message')).toBeHidden();
});
