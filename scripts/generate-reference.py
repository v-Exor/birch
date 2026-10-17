"""Regenerate genuine Python/OpenCV reference outputs and test fixtures."""
from pathlib import Path
import json
import zipfile
import xml.etree.ElementTree as ET
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def reference():
    img = cv2.imread(str(ROOT / "assets/cat.jpg"), cv2.IMREAD_GRAYSCALE)
    assert img is not None
    blurred = cv2.GaussianBlur(img, (3, 3), 0)
    gx = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)
    magnitude = cv2.magnitude(gx, gy)
    edges = cv2.Canny(blurred, 100, 200)
    normalized = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
    for key, array in [("gray", img), ("sobel", normalized), ("canny", edges)]:
        assert cv2.imwrite(str(ROOT / f"assets/results/{key}.webp"), array, [cv2.IMWRITE_WEBP_QUALITY, 101])
    metrics = {
        "source": "Student-provided cat.jpg from the completed Lab 2 activity; not embedded in the handout",
        "engine": f"Python OpenCV {cv2.__version__}",
        "input_shape": list(img.shape), "gaussian_kernel": [3, 3], "sigma": 0,
        "sobel": {"depth": "CV_64F", "kernel": 3, "combination": "sqrt(Gx^2+Gy^2)", "peak": float(magnitude.max()), "mean": float(magnitude.mean()), "display": "min-max normalized to 8-bit"},
        "canny": {"thresholds": [100, 200], "aperture": 3, "L2gradient": False, "edge_pixels": int(cv2.countNonZero(edges)), "edge_density_percent": float(cv2.countNonZero(edges)*100/img.size)},
        "note": "Browser JPEG decoding, RGBA-to-gray conversion, CV_32F derivatives, and OpenCV versions may differ slightly. Reference outputs are genuine precomputed Python outputs, not live browser results."
    }
    (ROOT / "assets/results/reference-metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")


def fixtures():
    cases = []
    for name in ["constant", "vertical-step", "horizontal-step", "rectangle", "diagonal"]:
        gray = np.zeros((23, 31), dtype=np.uint8)
        if name == "constant": gray[:] = 73
        elif name == "vertical-step": gray[:, 15:] = 255
        elif name == "horizontal-step": gray[11:, :] = 220
        elif name == "rectangle": gray[5:18, 7:24] = 255
        else:
            yy, xx = np.indices(gray.shape)
            gray[xx > yy] = 255
        blur = cv2.GaussianBlur(gray, (3, 3), 0)
        gx = cv2.Sobel(blur, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(blur, cv2.CV_32F, 0, 1, ksize=3)
        magnitude = cv2.magnitude(gx, gy)
        edges = cv2.Canny(blur, 100, 200)
        cases.append({"name": name, "width": 31, "height": 23, "input": gray.flatten().tolist(), "blurred": blur.flatten().tolist(), "canny": edges.flatten().tolist(), "sobelPeak": float(magnitude.max()), "edgePixels": int(cv2.countNonZero(edges))})
    (ROOT / "tests/opencv-fixtures.json").write_text(json.dumps({"engine": cv2.__version__, "cases": cases}), encoding="utf-8")


def extract_handout(document):
    with zipfile.ZipFile(document) as archive:
        tree = ET.fromstring(archive.read("word/document.xml"))
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs = ["".join(t.text or "" for t in p.findall(".//w:t", ns)) for p in tree.findall(".//w:body//w:p", ns)]
    start = paragraphs.index("import cv2")
    end = next(i for i in range(start, len(paragraphs)) if paragraphs[i] == "Question:")
    source = "\n".join(paragraphs[start:end]).strip() + "\n"
    compile(source, "handout_edge_detection.py", "exec")
    (ROOT / "python/handout_edge_detection.py").write_text(source, encoding="utf-8")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--handout", type=Path)
    args = parser.parse_args()
    reference()
    fixtures()
    if args.handout: extract_handout(args.handout)
    print("Generated actual OpenCV reference outputs and fixtures.")
