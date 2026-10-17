/* Shared by the browser worker and the algorithm tests. No DOM dependencies. */
(function (scope) {
  function validateParameters(parameters) {
    const { blur, low, high } = parameters;
    if (![0, 3, 5, 7].includes(blur)) throw new Error('Choose no blur, 3 × 3, 5 × 5, or 7 × 7.');
    if (![low, high].every(v => Number.isInteger(v) && v >= 0 && v <= 1020)) {
      throw new Error('Canny thresholds must be whole numbers from 0 to 1020.');
    }
    if (low > high) throw new Error('The lower Canny threshold must not exceed the upper threshold.');
  }

  function normalized(values, signed = false) {
    let min = Infinity, max = -Infinity;
    for (const v of values) { min = Math.min(min, v); max = Math.max(max, v); }
    const output = new Uint8ClampedArray(values.length);
    if (signed) {
      const limit = Math.max(Math.abs(min), Math.abs(max));
      for (let i = 0; i < values.length; i++) output[i] = limit ? (values[i] / limit + 1) * 127.5 : 128;
    } else if (max > min) {
      for (let i = 0; i < values.length; i++) output[i] = (values[i] - min) * 255 / (max - min);
    }
    return { pixels: output, min, max };
  }

  function processImage(cv, rgba, width, height, parameters) {
    validateParameters(parameters);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 6000000) {
      throw new Error('The image must contain between 1 and 6 million pixels.');
    }
    if (rgba.length !== width * height * 4) throw new Error('Invalid image buffer.');
    const mats = [];
    const mat = () => { const m = new cv.Mat(); mats.push(m); return m; };
    const start = performance.now();
    try {
      const source = new cv.Mat(height, width, cv.CV_8UC4); mats.push(source);
      source.data.set(rgba);
      const gray = mat(), blurred = mat(), gx = mat(), gy = mat(), magnitude = mat(), edges = mat();
      cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
      if (parameters.blur) cv.GaussianBlur(gray, blurred, new cv.Size(parameters.blur, parameters.blur), 0, 0, cv.BORDER_DEFAULT);
      else gray.copyTo(blurred);
      // Float derivatives preserve negative values. Python source uses CV_64F.
      cv.Sobel(blurred, gx, cv.CV_32F, 1, 0, 3, 1, 0, cv.BORDER_DEFAULT);
      cv.Sobel(blurred, gy, cv.CV_32F, 0, 1, 3, 1, 0, cv.BORDER_DEFAULT);
      cv.magnitude(gx, gy, magnitude);
      // Handout defaults: apertureSize=3, L2gradient=false (L1 inside Canny).
      cv.Canny(blurred, edges, parameters.low, parameters.high, 3, false);
      const sobel = normalized(magnitude.data32F);
      let edgePixels = 0, sum = 0;
      for (let i = 0; i < width * height; i++) {
        if (edges.data[i]) edgePixels++;
        sum += magnitude.data32F[i];
      }
      return {
        width, height, parameters: { ...parameters },
        gray: new Uint8ClampedArray(gray.data),
        blurred: new Uint8ClampedArray(blurred.data),
        gx: normalized(gx.data32F, true).pixels,
        gy: normalized(gy.data32F, true).pixels,
        sobel: sobel.pixels,
        canny: new Uint8ClampedArray(edges.data),
        metrics: {
          edgePixels, edgeDensity: edgePixels * 100 / (width * height),
          sobelMinimum: sobel.min, sobelPeak: sobel.max,
          sobelMean: sum / (width * height), processingMs: performance.now() - start,
        },
      };
    } finally {
      for (const m of mats.reverse()) m.delete();
    }
  }
  scope.LabProcessing = { validateParameters, normalized, processImage };
})(globalThis);
