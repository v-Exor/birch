# CSST106 Laboratory Activity 2 Edge Detection

A complete, independent **GitHub Pages-ready** website for **Laboratory Activity 2:
Edge Detection**. It includes genuine Sobel and Canny processing, the original
Python program, source-based explanations, real cat-image reference results,
and configurable links to the student's existing laboratory compilation.

Only Lab 2 is included. The Word handout's body is the source of truth. Its
header/footer numbering is inconsistent; the body title and student instruction
identify Lab 2. See [SOURCE_MAP.md](SOURCE_MAP.md) for the source-to-feature map.

Repository: https://github.com/v-Exor/LabAct2_CSST106

GitHub Pages address: https://v-exor.github.io/LabAct2_CSST106/

Use the Pages address for the Lab 2 button in `Website_LaboratoryAct_Compilation`.
The repository button is configured. Set `compilationUrl` in `site-config.js`
when your compilation website has its final published address.

The design follows the existing VisionLab identity: white, warm off-white,
orange `#FF6B00`, light orange, peach gradients, restrained motion, rounded cards,
and the same brand mark. No external fonts or runtime CDNs are used. Primary
button backgrounds use darker orange to preserve readable white text.

## Open locally

With Node.js 22 or later, from this `lab-02` folder:

```powershell
npm run dev
```

Open **http://127.0.0.1:4174/**. The server also exposes
**http://127.0.0.1:4174/lab-02/** to verify GitHub repository-subpath hosting.
No npm installation is required to serve or use the website.

Alternatively, use VS Code Live Server or, if Python is installed:

```powershell
python -m http.server 4174 --bind 127.0.0.1
```

Do not open `index.html` by double-clicking. Browsers restrict ES modules,
workers, and local-file fetches on `file://` URLs. Stop the server with Ctrl+C.
To choose another Node server port, set `$env:PORT = '4182'` before `npm run dev`.

## Functionality

- Sticky navigation: Home, Overview, Objectives, Experiments, Results, Conclusion.
- Responsive mobile navigation, keyboard controls, focus styles, skip link,
  labelled controls, accessible dialogs, and reduced-motion support.
- Default student-supplied `cat.jpg`, file selection, and drag-and-drop input.
- One required combined experiment: grayscale → Gaussian blur → Sobel and Canny.
- Defaults match the handout: 3 × 3 blur, sigma 0, 3 × 3 Sobel, Canny 100 / 200.
- Optional exploration: no blur, 5 × 5 or 7 × 7 blur, thresholds 0–1020, and presets.
- Original grayscale, Sobel magnitude, and Canny edges displayed together.
- Expandable actual blurred, signed Gx, and signed Gy previews.
- Actual edge count, density, peak Sobel magnitude, calculation time, latest-five
  comparison history, and JSON export.
- Full processed-resolution grayscale/Sobel/Canny PNG downloads, plus a labelled
  1980 × 820 comparison preview download.
- Original Python code preview, copy button, original source download, runnable
  Python ZIP with the cat sample, and optional `--save-only` execution.
- All handout questions answered, with supplementary explanation separated from
  the required program and edge-map comparison.
- Genuine Python reference images, measurements, original session comparison,
  and a conclusion specific to this activity.
- Configurable compilation and GitHub links with no fabricated destinations.

The first cat comparison runs automatically when the engine and sample are
ready. Later input/parameter changes require **Run comparison**. Previous
outputs are explicitly marked stale and their downloads are disabled until
rerun. New image inputs clear the old processed outputs.

## How processing works

`worker.js` loads the locally vendored OpenCV.js 4.12.0 UMD/WebAssembly runtime.
`processing.js` performs actual `cv.cvtColor`, `cv.GaussianBlur`, `cv.Sobel`,
`cv.magnitude`, and `cv.Canny` operations. Matrices are deleted after each run.
This is real computation, not a simulated edge effect or a static output swap.

The runtime is a single 10,872,779-byte file with embedded WebAssembly. The
first load includes this download and compilation. It uses no external CDN,
server backend, model files, or cross-origin isolation headers. Its provenance,
SHA-256 hash, and license are in `assets/vendor/`.

Browser Sobel uses CV_32F; original Python uses CV_64F. Both preserve signed
derivatives. Sobel magnitude is min–max normalized to 8-bit for display rather
than clipped. Canny uses aperture 3 and `L2gradient=false`, matching Python's
defaults. Therefore Sobel uses Euclidean magnitude while Canny internally uses
L1 gradient, as in the handout. Signed derivative previews have individual
symmetric display scales.

Browser JPEG decoding, color-to-gray rounding, runtime version, and floating
point precision may give slightly different results from Python. On the
precomputed Python/OpenCV 5.0.0 reference, the 736 × 736 cat produced **13,286**
Canny edge pixels (about **2.45%**) at 100 / 200. Live measurements are computed
independently; the reference count is never inserted into the live results.

## Input limits and behavior

- JPEG, PNG, and WebP only; 15 MiB maximum compressed file size.
- Maximum 6,000,000 pixels and 6000 pixels on either side. Images are rejected
  instead of silently resized. Transparent images are composited on white.
- Animated WebP is not an animation/video workflow; the browser's decoded frame
  is treated as a still. Use a still photo for repeatable comparisons.
- Current browsers with JavaScript, Canvas, workers, and WebAssembly are required.
- Worker initialization timeout: 60 seconds. Calculation timeout: 45 seconds.
  A visible error and Retry engine action handle runtime failure.
- Large images can consume considerable memory, especially on mobile. Smaller
  images are appropriate when a device cannot complete the run.
- Timing measures the worker calculation, including output-array preparation;
  it excludes runtime startup, input decoding, UI drawing, and PNG encoding.
- No image pixels are sent to a server. No accounts or analytics are included.
  Images and run history remain in memory until the tab closes. Only optional
  link settings are saved to localStorage. Export results to preserve them.

## Configure your compilation and repository links

Edit `site-config.js` before publishing:

```javascript
window.LAB_CONFIG = {
  compilationUrl: "", // Your actual Laboratory Compilation website address
  repositoryUrl: "",  // Your actual Lab 2 GitHub repository address
};
```

Use complete HTTP or HTTPS URLs. When an address is empty, its button opens a
working link-settings dialog. It does not navigate to a placeholder or broken
link. The footer's **Configure site links** opens the same dialog.

**Save links** stores settings only for that browser. **Download configuration**
produces a `site-config.js` file; replace the repository's file with it to make
your URLs available to every visitor. Browser settings override the file until
changed or site data is cleared. This page works independently of the hub.

## Deploy this activity on GitHub Pages

The repository is prepared for branch-based publication. The instructions below
also apply when redeploying this project or creating a new fork. Check the
repository's Pages settings for the latest deployment status.

1. Create a new **public GitHub repository** for Lab 2. GitHub Free supports
   Pages for public repositories.
2. Upload the **contents of `lab-02`**, so `index.html` is at the repository root.
   Do not upload `node_modules`, test output, or the containing laboratory folder.
   For the smallest production upload, use the staging option below.
3. Keep all relative paths and capitalization intact. Include `assets/vendor/`,
   `assets/results/`, `assets/cat.jpg`, `python/`, `downloads/`, `.nojekyll`, HTML,
   CSS, the three application JavaScript files, and `site-config.js`.
4. Open **Settings → Pages → Build and deployment**.
5. Select **Deploy from a branch**, then **main** and **/ (root)**. Save.
6. Wait for the Pages deployment, then copy the actual URL shown in Settings.
7. Set your hub's **Laboratory Activity 2** button to that URL. Set this site's
   `compilationUrl` to your actual hub URL and `repositoryUrl` to this repository.

URL format to add to your compilation website:

```text
https://YOUR-USERNAME.github.io/YOUR-LAB2-REPOSITORY/
```

These are documentation placeholders, not invented working website addresses.
No build step, backend deployment, routing rewrite, or purchased domain is
required. Hash navigation and relative asset paths work under repository names
other than `lab-02`. Hosting on the free `github.io` domain is sufficient.

Official guide: [Create a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

### Production staging and deliverable ZIP

```powershell
python scripts/package-delivery.py
npm run package
```

The Python command uses only the standard library. It creates the downloadable
Python kit and `../CSST106-Lab02-Website.zip` (full source, excluding development
installations and generated test output). Run it again after changing source.

`npm run package` replaces only the generated `artifacts/github-pages/` folder
and copies all production files there. Upload the **contents** of that folder
to your new repository for a clean static deployment. The staging folder is
ready production output; there is nothing to compile.

## Development and verification

Development dependencies are used only for tests:

```powershell
npm ci
npm run check
npm test
npm run test:e2e
```

Browser tests use installed Google Chrome. If Chrome is not available, install
it or adapt `channel: 'chrome'` in `playwright.config.js` to your supported
Playwright browser. Tests start/reuse port 4174 and check the `/lab-02/` mount.

`npm run check` checks script syntax, local asset existence, anchors, duplicate
IDs, and the pinned runtime checksum. Unit tests cover display normalization
and parameter validation. Browser tests compare real grayscale/blur/Canny pixels
and Sobel peaks with five independently generated Python/OpenCV fixtures. They
also cover reruns, presets, uploads, corrupt files, thresholds, PNG/JSON downloads,
configuration, mobile navigation, keyboard input, subpaths, console errors,
runtime recovery, and axe accessibility checks.

`node scripts/inspect.mjs` captures desktop/mobile QA screenshots while the
preview server runs. These are development artifacts, not displayed as live
results. See [VALIDATION.md](VALIDATION.md) for completed verification.

To regenerate the Python reference outputs and test fixtures (requires OpenCV
and NumPy): `python scripts/generate-reference.py`. Optionally pass
`--handout "path/to/the-original.docx"` to re-extract the original Python code.
The runnable Python kit is documented in `python/README.md`.

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| Engine unavailable or worker blocked | Use an HTTP server; keep `worker.js`, `processing.js`, and `assets/vendor/opencv.js`; enable WebAssembly; Retry engine |
| GitHub Pages 404 | Make `index.html` the publishing root, check branch/folder selection, and use the trailing slash in your site URL |
| Images or scripts fail only on Pages | Preserve relative paths, file case, and all asset folders; do not use filesystem paths in links |
| No new result after changing settings | Click Run comparison; older maps are marked stale and downloads are paused |
| Very few Canny edges | Lower thresholds and rerun; ensure the photo has visible intensity boundaries |
| More Sobel texture than Canny | Expected: Sobel shows gradient strength; Canny selects thresholded local maxima |
| Python plot window does not open | Use `python edge_detection.py --save-only` and open the saved `results/comparison.png` |
| Link settings only work on your computer | Download configuration and replace the deployed `site-config.js`; saving in the dialog is browser-local |

## Project map

```text
lab-02/
  index.html, styles.css       Academic content and responsive interface
  app.js, site-config.js       Interaction, input validation, configurable links
  processing.js, worker.js     Genuine OpenCV browser processing
  assets/cat.jpg               Student-provided activity sample
  assets/results/              Genuine reference outputs and measurements
  assets/vendor/               Pinned runtime, license, and provenance
  python/                     Original and runnable Python implementations
  downloads/                  Answers and runnable Python ZIP
  scripts/                    Local server, reference generation, checks, packaging
  tests/                      Unit, browser, accessibility, and numerical checks
  SOURCE_MAP.md, VALIDATION.md Source coverage and completed verification
```

The shared VisionLab mark is reused for consistent branding. The sample's
original photographer/license was not supplied; no new image ownership is
asserted. No additional dataset or internet photograph was necessary.
