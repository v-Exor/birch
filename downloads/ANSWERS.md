# CSST106 Laboratory Activity 2 Edge Detection

## Required program

Load the image in grayscale, reduce noise with a 3 × 3 Gaussian blur, compute
Sobel derivatives in x and y using a 3 × 3 kernel, and combine them with
`cv2.magnitude`. Apply `cv2.Canny(img_blur, 100, 200)` to the same smoothed
input. Display the original grayscale, Sobel magnitude, and Canny edge map
side by side. The original source is in `python/handout_edge_detection.py`;
the runnable cat-image version is in the downloadable Python kit.

## Differences between the maps

Sobel measures intensity changes and produces continuous gradient magnitudes.
Stronger changes appear brighter; boundaries may be thick. Fine texture and
remaining noise also create responses. Canny applies non-maximum suppression
and double thresholding with hysteresis to produce a binary edge map. It
usually selects thinner boundaries and suppresses many weak responses. Faint
boundaries may disappear, and closed outlines are not guaranteed.

## Actual reference observation

The supplied cat image is 736 × 736 pixels. With the handout defaults, the
Python/OpenCV 5.0.0 reference produced 13,286 Canny edge pixels, or about 2.45%
of the image. Sobel retains numerous faint fur responses. Canny emphasizes
the sunglasses, whiskers, and selected parts of the silhouette, with some
incomplete boundaries. Browser JPEG decoding, grayscale conversion,
floating-point precision, and OpenCV version can cause slight differences.
These reference counts are not substituted for the live browser measurements.

## Conclusion

Sobel and Canny detect intensity changes but describe them differently. Sobel
preserves gradient strength, while Canny adds thinning and threshold-based
selection. Gaussian smoothing reduces noise responses; blur and threshold
choices also affect useful detail. These methods provide foundations for
object detection, segmentation, and feature extraction.

## Source clarification

The Word handout's body identifies Laboratory Activity 2: Edge Detection.
It contains a single programming question and a conclusion space. Its
header/footer have inconsistent numbering; this website follows the body title
and the student's explicit request for Laboratory Activity 2. The referenced
`input.jpg` was not attached or embedded. The student supplied `cat.jpg` later.
