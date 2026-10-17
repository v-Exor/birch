# Laboratory Activity 2 verification

Original local verification: 16 October 2026, Asia/Manila. Publication was
authorized on 17 October 2026 for `v-Exor/birch`. The Pages address is
`https://v-exor.github.io/birch/`; its deployment status is maintained
by GitHub in the repository's Pages settings.

## Source coverage

- Re-read the original Word body and exact Python program.
- Verified the single combined Sobel/Canny question, the comparison request,
  preprocessing parameters, and conclusion requirement.
- Followed the body title Laboratory Activity 2 and the student's explicit scope.
- Confirmed that `input.jpg` was not embedded; used the later student-provided
  `cat.jpg` and identified its provenance in the site and source map.
- Preserved the original code by extracting it directly from the DOCX and
  successfully compiling the extracted Python source.
- Kept Lab 1 files and the existing Lab 1 ZIP unchanged.

## Algorithm verification

Three Node unit tests pass: signed/magnitude display scaling, permitted settings,
and invalid thresholds/image buffers rejected before OpenCV allocation.

Five independent synthetic images were generated using Python/OpenCV 5.0.0:
constant intensity, vertical step, horizontal step, rectangle, and diagonal.
The actual OpenCV.js 4.12.0 worker was compared against each fixture:

- Grayscale pixels: exact match.
- Gaussian blur pixels: exact match.
- Canny binary pixels and edge counts: exact match.
- Peak Sobel magnitude: agreement to three decimal places.

The constant fixture also verifies that a uniform image has no Canny edges and
no Sobel gradient. Different step directions exercise both derivative axes.
Inputs are passed directly as RGBA pixel arrays, avoiding decoder differences
in the numerical equivalence checks.

The real sample comparison also ran in Chrome: 736 × 736 pixels, default blur
3 × 3, Canny 100 / 200. The observed browser count was 13,282 edge pixels; the
Python reference count was 13,286. This small difference is consistent with the
documented native grayscale decoding versus browser decode/color conversion.
Reference counts are not hardcoded as live measurements.

## Browser and interaction verification

Seven browser test cases pass across the completed runs:

1. Genuine worker output against the five Python fixtures.
2. Live outputs, binary Canny values, parameter changes, presets, blur, reset,
   run history, and stale-output download protection.
3. Image uploads, a different 80 × 60 input, unsupported and corrupt files,
   invalid threshold ordering, and restoring the cat sample.
4. Actual PNG file signatures, JSON measurements, Python source preview,
   configuration download, settings persistence, and Escape-to-close dialog.
5. Root and repository-subpath hosting, mobile navigation, keyboard slider
   adjustment, and no horizontal page overflow at 320, 375, 390, 768, 1024,
   and 1440 CSS pixels.
6. Axe checks for WCAG 2 A/AA and WCAG 2.1 AA on the desktop result page,
   expanded pipeline/code/answers, mobile layout, and configuration dialog:
   zero detected violations in each checked state.
7. Intentionally blocked runtime load, useful error state, disabled processing,
   and successful Retry engine recovery once the local runtime is available.

The upload/precomputed-reference and live-processing paths are distinct. Tests
confirm no external runtime requests and no uncaught page errors in the default
and repeated processing flow. The browser tests use installed Google Chrome;
Firefox, Safari, iOS hardware, and physical low-memory devices were not tested.
Automated accessibility checks do not replace a full manual assistive-technology
audit, but keyboard operation and responsive layouts were also checked.

## Visual review

Inspected desktop home and working comparison screenshots at 1440 × 1000 and
the mobile home at 390 × 844. Reviewed the full page for section continuity.
The composition matches the existing white/orange VisionLab identity, preserves
legible image comparisons, and uses actual reference outputs in the hero.
The three live comparisons stack on narrow screens to preserve readability.
Reduced-motion mode disables reveal transitions and smooth scrolling.

## Python and packaging

- Executed the runnable Python script with `--save-only`; it saved grayscale,
  Sobel, Canny, the labelled comparison, and measurements successfully.
- Regenerated genuine Python reference images and metrics from the supplied cat.
- Checked duplicate HTML IDs, anchors, relative files, script syntax, and the
  SHA-256 checksum of the bundled runtime.
- Built the Python ZIP, complete source ZIP, and static production staging folder.
- Verified ZIP contents and relative staging paths before delivery.
- No backend, build server, runtime CDN, or other laboratory repository is needed.

## Limits that remain

- The repository URL is configured as `https://github.com/v-Exor/birch`.
  The compilation URL remains configurable until the hub has a published address.
  An unconfigured compilation button opens functional link settings.
- The first runtime load is about 10.9 MB before HTTP compression. Browser resource
  limits can affect very large inputs; the site enforces explicit input limits.
- Browser and Python outputs can differ slightly due to image decoding, grayscale
  rounding, derivative precision, and runtime version.
- Source/reference-image rights were not provided; no new ownership is asserted.
