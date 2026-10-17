const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const controls = ['#blur-size', '#threshold-low', '#threshold-high'];
const state = { source: null, worker: null, ready: false, busy: false, loading: false, output: null, id: 0, history: [], autoPending: true, bootTimer: null, runTimer: null };
const parameters = () => ({ blur: Number($('#blur-size').value), low: Number($('#threshold-low').value), high: Number($('#threshold-high').value) });
const status = message => { $('#process-status').textContent = message; };
function error(message = '') { $('#error-message').textContent = message; $('#error-message').hidden = !message; }
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { $('#toast').hidden = true; }, 4000); }
function updateButtons() {
  $('#process-button').disabled = !state.ready || !state.source || state.busy || state.loading;
  for (const el of [...controls.map($), $('#choose-image'), $('#use-sample'), $('#reset-settings'), ...$$('[data-preset]')]) el.disabled = state.busy || state.loading;
  for (const el of [...$$('[data-download]'), $('#download-comparison'), $('#export-results')]) el.disabled = !state.output || state.busy || state.loading;
  $('#process-button span').textContent = state.busy ? 'Processing image…' : 'Run comparison';
  $('#comparison-grid').setAttribute('aria-busy', String(state.busy));
}
function clearOutput(hide = false) {
  state.output = null;
  if (hide) {
    for (const key of ['sobel', 'canny']) { $(`#${key}-canvas`).hidden = true; $(`#${key}-empty`).hidden = false; }
    for (const key of ['blurred', 'gx', 'gy']) { const c = $(`#${key}-canvas`); c.width = c.height = 1; }
    for (const key of ['pixels', 'density', 'peak', 'time']) $(`#metric-${key}`).textContent = '—';
    $('#metrics-caption').textContent = 'Measurements from the next successful live run will appear here.';
  }
  updateButtons();
}
function markDirty() {
  $('#low-value').value = $('#threshold-low').value;
  $('#high-value').value = $('#threshold-high').value;
  const { low, high } = parameters();
  for (const button of $$('[data-preset]')) {
    const selected = button.dataset.preset === `${low},${high}`;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  }
  if (state.busy) return;
  clearOutput(); error();
  if (state.source) {
    status('Settings changed. Run the comparison to update the outputs.');
    $('#output-settings').textContent = 'Settings changed · displayed outputs are from the previous run';
    $('#live-observation').textContent = 'Run the comparison again to apply these settings. Downloads are paused until the outputs are updated.';
  }
}
for (const selector of controls) $(selector).addEventListener('input', markDirty);
for (const button of $$('[data-preset]')) button.addEventListener('click', () => {
  const [low, high] = button.dataset.preset.split(',');
  $('#threshold-low').value = low; $('#threshold-high').value = high; markDirty();
});
$('#reset-settings').addEventListener('click', () => {
  $('#blur-size').value = 3; $('#threshold-low').value = 100; $('#threshold-high').value = 200; markDirty();
});

function initializeWorker() {
  state.worker?.terminate(); state.ready = false;
  clearTimeout(state.bootTimer); clearTimeout(state.runTimer);
  $('#retry-engine').hidden = true;
  $('#engine-status').textContent = 'Loading vision engine…';
  try {
    const worker = new Worker(new URL('./worker.js', import.meta.url)); state.worker = worker;
    state.bootTimer = setTimeout(() => engineFailure('The vision engine took too long to load. Check the local runtime files and retry.'), 60000);
    worker.onmessage = ({ data }) => {
      if (worker !== state.worker) return;
      if (data.type === 'ready') {
        clearTimeout(state.bootTimer); state.ready = true;
        $('#engine-status').textContent = '● OpenCV.js ready · local processing';
        $('#engine-status').title = data.version;
        status(state.source ? 'Ready to compare Sobel and Canny.' : 'Choose an image to begin.');
        updateButtons();
        if (state.source && state.autoPending && !state.loading) runComparison();
      } else if (data.type === 'engine-error') engineFailure(data.message);
      else if (data.id === state.id) {
        clearTimeout(state.runTimer); state.busy = false;
        if (data.type === 'result') completeRun(data.result);
        else { error(data.message); status('Processing failed. Try another image or retry.'); }
        updateButtons();
      }
    };
    worker.onerror = event => { event.preventDefault(); engineFailure('The vision engine could not start. Use an HTTP server and include assets/vendor/opencv.js.'); };
  } catch { engineFailure('This browser could not start the processing worker. Use a current browser with WebAssembly enabled.'); }
  updateButtons();
}
function engineFailure(message) {
  clearTimeout(state.bootTimer); clearTimeout(state.runTimer); state.worker?.terminate(); state.ready = false; state.busy = false;
  error(message); status('Vision engine unavailable.');
  $('#engine-status').textContent = 'Vision engine unavailable'; $('#retry-engine').hidden = false; updateButtons();
}
$('#retry-engine').addEventListener('click', () => { error(); initializeWorker(); });

function grayscalePreview(rgba) {
  const gray = new Uint8ClampedArray(rgba.length / 4);
  for (let i = 0; i < gray.length; i++) gray[i] = Math.round(.299 * rgba[4 * i] + .587 * rgba[4 * i + 1] + .114 * rgba[4 * i + 2]);
  return gray;
}
function drawPixels(canvas, values, width, height) {
  canvas.width = width; canvas.height = height;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < values.length; i++) { rgba[4 * i] = rgba[4 * i + 1] = rgba[4 * i + 2] = values[i]; rgba[4 * i + 3] = 255; }
  canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0);
}
async function loadImage(url, name) {
  if (state.busy || state.loading) return;
  state.loading = true; error(); updateButtons(); status('Decoding image…');
  try {
    const image = new Image(); image.src = url; await image.decode();
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height || width * height > 6000000 || width > 6000 || height > 6000) {
      throw new Error('Choose an image with at most 6 million pixels and no side longer than 6000 pixels. Images are never silently resized.');
    }
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); ctx.drawImage(image, 0, 0);
    state.source = { name, width, height, rgba: ctx.getImageData(0, 0, width, height).data };
    clearOutput(true);
    $('#source-name').textContent = name;
    $('#source-info').textContent = `${width} × ${height} px · ${(width * height).toLocaleString()} pixels`;
    $('#image-dimensions').textContent = `${width} × ${height}`;
    drawPixels($('#gray-canvas'), grayscalePreview(state.source.rgba), width, height);
    $('#gray-empty').hidden = true;
    $('#output-settings').textContent = 'New input · run the comparison';
    $('#live-observation').textContent = 'Both detectors will use this image, converted to grayscale and smoothed with the selected Gaussian kernel.';
    status(state.ready ? 'Image ready. Run the comparison.' : 'Image ready. Waiting for the vision engine…');
  } catch (e) { error(e.message || 'This image could not be decoded. Try a JPEG, PNG, or WebP.'); status('Image not loaded.'); }
  finally { state.loading = false; updateButtons(); }
  if (state.source && state.ready && state.autoPending) runComparison();
}
async function useFile(file) {
  if (!file || state.busy || state.loading) return;
  if (file.size > 15 * 1024 * 1024) { error('The file is too large. Choose an image of 15 MiB or less.'); return; }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && !(file.type === '' && /\.(jpe?g|png|webp)$/i.test(file.name))) {
    error('Choose a JPEG, PNG, or WebP still image. SVG, GIF, and video are not supported.'); return;
  }
  const url = URL.createObjectURL(file);
  try { await loadImage(url, file.name); } finally { URL.revokeObjectURL(url); }
}
$('#choose-image').addEventListener('click', () => $('#image-upload').click());
$('#image-upload').addEventListener('change', async event => { await useFile(event.target.files[0]); event.target.value = ''; });
$('#use-sample').addEventListener('click', () => loadImage(new URL('./assets/cat.jpg', import.meta.url).href, 'cat.jpg'));
for (const name of ['dragenter', 'dragover']) $('#drop-zone').addEventListener(name, e => { e.preventDefault(); if (!state.busy) $('#drop-zone').classList.add('dragging'); });
$('#drop-zone').addEventListener('dragleave', e => { if (!$('#drop-zone').contains(e.relatedTarget)) $('#drop-zone').classList.remove('dragging'); });
$('#drop-zone').addEventListener('drop', e => { e.preventDefault(); $('#drop-zone').classList.remove('dragging'); useFile(e.dataTransfer.files[0]); });

function runComparison() {
  if (!state.ready || !state.source || state.busy || state.loading) return;
  const settings = parameters();
  if (settings.low > settings.high) { error('The lower Canny threshold must not exceed the upper threshold.'); return; }
  error(); state.autoPending = false; state.busy = true; state.output = null; state.id++;
  updateButtons(); status('Calculating grayscale, Sobel, and Canny…');
  const { width, height, rgba } = state.source;
  // Transfer a copy; the original remains available for subsequent comparisons.
  const copy = rgba.slice();
  state.runTimer = setTimeout(() => engineFailure('Processing exceeded 45 seconds. Try a smaller image, then retry the engine.'), 45000);
  state.worker.postMessage({ type: 'process', id: state.id, rgba: copy.buffer, width, height, parameters: settings }, [copy.buffer]);
}
$('#experiment-form').addEventListener('submit', e => { e.preventDefault(); runComparison(); });
function completeRun(result) {
  state.output = result;
  for (const key of ['gray', 'sobel', 'canny', 'blurred', 'gx', 'gy']) drawPixels($(`#${key}-canvas`), result[key], result.width, result.height);
  for (const key of ['sobel', 'canny']) { $(`#${key}-canvas`).hidden = false; $(`#${key}-empty`).hidden = true; }
  const { low, high, blur } = result.parameters;
  const blurLabel = blur ? `${blur} × ${blur}` : 'off';
  $('#output-settings').textContent = `Gaussian ${blurLabel} · Sobel 3 × 3 · Canny ${low} / ${high}`;
  $('#metric-pixels').textContent = result.metrics.edgePixels.toLocaleString();
  $('#metric-density').textContent = `${result.metrics.edgeDensity.toFixed(2)}%`;
  $('#metric-peak').textContent = result.metrics.sobelPeak.toFixed(1);
  $('#metric-time').textContent = `${result.metrics.processingMs.toFixed(0)} ms`;
  $('#metrics-caption').textContent = `${state.source.name} · ${result.width} × ${result.height} · Gaussian ${blurLabel} · Canny ${low} / ${high} · latest completed live run`;
  $('#live-observation').textContent = `Canny retained ${result.metrics.edgePixels.toLocaleString()} edge pixels (${result.metrics.edgeDensity.toFixed(2)}% of the image). Sobel shows relative gradient strength; its brightness is scaled independently and is not an edge count.`;
  state.history.unshift({ input: state.source.name, width: result.width, height: result.height, parameters: result.parameters, metrics: result.metrics, time: new Date().toISOString() });
  state.history = state.history.slice(0, 5); renderHistory();
  status('Complete · both edge maps are ready.');
}
function renderHistory() {
  const body = $('#run-history'); body.replaceChildren();
  if (!state.history.length) { const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 5; cell.textContent = 'Run the experiment to record your observations.'; }
  state.history.forEach((record, index) => {
    const row = body.insertRow();
    for (const value of [`${index === 0 ? 'Latest' : `Previous ${index}`} · ${record.input}`, record.parameters.blur ? `${record.parameters.blur} × ${record.parameters.blur}` : 'Off', `${record.parameters.low} / ${record.parameters.high}`, `${record.metrics.edgeDensity.toFixed(2)}%`, `${record.metrics.processingMs.toFixed(0)} ms`]) {
      row.insertCell().textContent = value;
    }
  });
  $('#run-count').textContent = state.history.length; $('#clear-history').disabled = !state.history.length;
}
$('#clear-history').addEventListener('click', () => { state.history = []; renderHistory(); toast('Comparison history cleared.'); });
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function downloadCanvas(canvas, name) { canvas.toBlob(blob => { if (blob) downloadBlob(blob, name); else error('The image could not be encoded. Try a smaller input.'); }, 'image/png'); }
const safeName = () => state.source.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]/gi, '_').slice(0, 60) || 'image';
for (const button of $$('[data-download]')) button.addEventListener('click', () => {
  if (!state.output) return;
  downloadCanvas($(`#${button.dataset.download}-canvas`), `${safeName()}-${button.dataset.download}.png`);
});
$('#download-comparison').addEventListener('click', () => {
  if (!state.output) return;
  const canvas = document.createElement('canvas'); canvas.width = 1980; canvas.height = 820;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#252922'; ctx.font = '600 26px sans-serif'; ctx.fillText('CSST106 · Laboratory Activity 2 · Edge Detection', 30, 42);
  ctx.fillStyle = '#595d55'; ctx.font = '18px sans-serif'; ctx.fillText(`${state.source.name.slice(0, 65)} · ${$('#output-settings').textContent} · comparison preview`, 30, 76);
  ['gray', 'sobel', 'canny'].forEach((key, i) => {
    const input = $(`#${key}-canvas`), scale = Math.min(620 / input.width, 620 / input.height), x = 30 + 660 * i;
    ctx.fillStyle = '#222'; ctx.font = '600 22px sans-serif'; ctx.fillText(['Original grayscale', 'Sobel magnitude', 'Canny edges'][i], x, 120);
    ctx.fillStyle = '#f5f4ef'; ctx.fillRect(x, 140, 620, 620);
    ctx.drawImage(input, x + (620 - input.width * scale) / 2, 140 + (620 - input.height * scale) / 2, input.width * scale, input.height * scale);
  });
  ctx.fillStyle = '#595d55'; ctx.font = '17px sans-serif'; ctx.fillText('Actual OpenCV.js outputs · Sobel display scaled min–max · Individual PNG downloads preserve the processed dimensions.', 30, 800);
  downloadCanvas(canvas, `${safeName()}-comparison.png`);
});
$('#export-results').addEventListener('click', () => {
  if (!state.output) return;
  const payload = { laboratory: 'CSST106 Laboratory Activity 2 — Edge Detection', engine: $('#engine-status').title, latest: state.history[0] || { input: state.source.name, parameters: state.output.parameters, metrics: state.output.metrics }, recentRuns: state.history, notes: 'Images processed locally. Timing excludes decoding, worker startup, and display. Sobel display is min–max normalized; Canny uses L1 gradient and aperture 3.' };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'lab-02-measurements.json');
});

let pythonSource = '';
fetch(new URL('./python/handout_edge_detection.py', import.meta.url)).then(r => { if (!r.ok) throw new Error(); return r.text(); }).then(text => { pythonSource = text; $('#python-code').textContent = text; }).catch(() => { $('#python-code').textContent = 'Unable to load the source preview. Use the handout code download link below.'; });
$('#copy-code').addEventListener('click', async () => {
  if (!pythonSource) { toast('Use the Python download link to get the source.'); return; }
  try { await navigator.clipboard.writeText(pythonSource); toast('Python code copied.'); }
  catch { const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents($('#python-code')); selection.removeAllRanges(); selection.addRange(range); toast('Code selected. Press Ctrl+C or Command+C to copy.'); }
});

const storageKey = 'csst106-lab02-links';
let stored = {};
try { stored = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { /* File config still works when browser storage is unavailable. */ }
let config = { compilationUrl: '', repositoryUrl: '', ...window.LAB_CONFIG, ...stored };
function validUrl(value) { if (!value) return ''; const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use full HTTP or HTTPS addresses.'); return url.href; }
function openSettings() { $('#compilation-url').value = config.compilationUrl || ''; $('#repository-url').value = config.repositoryUrl || ''; $('#link-error').hidden = true; $('#link-dialog').showModal(); }
for (const button of $$('[data-destination]')) button.addEventListener('click', () => {
  const key = button.dataset.destination === 'repository' ? 'repositoryUrl' : 'compilationUrl';
  try { const url = validUrl(config[key]); if (!url) openSettings(); else if (key === 'repositoryUrl') window.open(url, '_blank', 'noopener,noreferrer'); else window.location.assign(url); }
  catch { openSettings(); }
});
$('#open-settings').addEventListener('click', openSettings);
$('#close-dialog').addEventListener('click', () => $('#link-dialog').close());
function formConfig() { return { compilationUrl: validUrl($('#compilation-url').value.trim()), repositoryUrl: validUrl($('#repository-url').value.trim()) }; }
$('#link-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    config = formConfig();
    try { localStorage.setItem(storageKey, JSON.stringify(config)); toast('Links saved for this browser.'); } catch { toast('Links applied for this visit. Browser storage is unavailable.'); }
    $('#link-dialog').close();
  } catch (e) { $('#link-error').textContent = e.message; $('#link-error').hidden = false; }
});
$('#download-config').addEventListener('click', () => {
  try { const values = formConfig(); downloadBlob(new Blob([`// Replace the website's site-config.js with this file.\nwindow.LAB_CONFIG = ${JSON.stringify(values, null, 2)};\n`], { type: 'text/javascript' }), 'site-config.js'); }
  catch (e) { $('#link-error').textContent = e.message; $('#link-error').hidden = false; }
});
$('#menu-toggle').addEventListener('click', () => {
  const open = $('#menu-toggle').getAttribute('aria-expanded') !== 'true';
  $('#menu-toggle').setAttribute('aria-expanded', String(open)); $('#menu-toggle').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  $('#main-nav').classList.toggle('open', open);
});
function closeMenu() { $('#main-nav').classList.remove('open'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); $('#menu-toggle').setAttribute('aria-label', 'Open navigation'); }
for (const link of $$('#main-nav a')) link.addEventListener('click', closeMenu);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
if ('IntersectionObserver' in window) {
  const reveals = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('visible'); reveals.unobserve(entry.target); } }, { threshold: .08 });
  for (const el of $$('.reveal')) { el.classList.add('will-reveal'); reveals.observe(el); }
  const navigation = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) for (const link of $$('#main-nav a')) { const active = link.hash === `#${entry.target.id}`; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); }
  }, { rootMargin: '-15% 0px -65% 0px' });
  for (const id of ['home', 'overview', 'objectives', 'experiments', 'results', 'conclusion']) navigation.observe($(`#${id}`));
}
initializeWorker();
loadImage(new URL('./assets/cat.jpg', import.meta.url).href, 'cat.jpg');
