/* Classic worker: OpenCV's vendored UMD runtime is loaded from this repository. */
importScripts('./processing.js');
let engine;
const ready = new Promise((resolve, reject) => {
  try {
    importScripts('./assets/vendor/opencv.js');
    const module = self.cv;
    // Wrap the module: older Emscripten modules are themselves thenable.
    if (module && module.Mat) resolve({ cv: module });
    else if (module && typeof module.then === 'function') module.then(cv => resolve({ cv }), reject);
    else if (module) module.onRuntimeInitialized = () => resolve({ cv: module });
    else reject(new Error('The OpenCV runtime did not load.'));
  } catch (error) { reject(error); }
});
ready.then(({ cv }) => {
  engine = cv;
  self.postMessage({ type: 'ready', version: cv.getBuildInformation().split('\n').find(line => line.includes('General configuration'))?.trim() || 'OpenCV.js' });
}).catch(error => self.postMessage({ type: 'engine-error', message: String(error.message || error) }));
self.onmessage = async ({ data }) => {
  if (data.type !== 'process') return;
  try {
    await ready;
    const result = self.LabProcessing.processImage(engine, new Uint8ClampedArray(data.rgba), data.width, data.height, data.parameters);
    const transfers = ['gray', 'blurred', 'gx', 'gy', 'sobel', 'canny'].map(key => result[key].buffer);
    self.postMessage({ type: 'result', id: data.id, result }, transfers);
  } catch (error) {
    self.postMessage({ type: 'error', id: data.id, message: typeof error === 'number' ? 'OpenCV could not process this image. Try a smaller image.' : String(error.message || error) });
  }
};
