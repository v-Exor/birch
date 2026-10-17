"""CSST106 Lab 2. Run normally for a plot, or use --save-only on headless systems."""
from pathlib import Path
import argparse
import json
import cv2


def edge_detection(image_path, output_dir, blur=3, low=100, high=200, save_only=False):
    import matplotlib
    if save_only:
        matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    img = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")
    img_blur = cv2.GaussianBlur(img, (blur, blur), 0) if blur else img.copy()
    sobelx = cv2.Sobel(img_blur, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(img_blur, cv2.CV_64F, 0, 1, ksize=3)
    sobel_combined = cv2.magnitude(sobelx, sobely)
    edges_canny = cv2.Canny(img_blur, low, high)

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    sobel_display = cv2.normalize(sobel_combined, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
    for name, array in [("grayscale", img), ("sobel", sobel_display), ("canny", edges_canny)]:
        destination = output_dir / f"{name}.png"
        if not cv2.imwrite(str(destination), array):
            raise OSError(f"Could not save {destination}")

    fig, axes = plt.subplots(1, 3, figsize=(12, 6))
    for ax, image, title in zip(
        axes, [img, sobel_combined, edges_canny],
        ["Original Image", "Sobel Edge Detection", "Canny Edge Detection"]
    ):
        ax.imshow(image, cmap="gray")
        ax.set_title(title)
        ax.axis("off")
    fig.tight_layout()
    fig.savefig(output_dir / "comparison.png", dpi=150)

    metrics = {
        "input": str(image_path), "width": int(img.shape[1]), "height": int(img.shape[0]),
        "gaussian_kernel": blur, "sobel_kernel": 3, "canny_thresholds": [low, high],
        "canny_edge_pixels": int(cv2.countNonZero(edges_canny)),
        "canny_edge_density_percent": float(cv2.countNonZero(edges_canny) * 100 / img.size),
        "sobel_peak": float(sobel_combined.max()), "sobel_mean": float(sobel_combined.mean()),
    }
    (output_dir / "measurements.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Results saved to {output_dir.resolve()}")
    if not save_only:
        try:
            plt.show()
        except Exception as exc:
            print(f"The plot window could not open: {exc}\nOpen the saved comparison.png instead.")
    plt.close(fig)
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compare Sobel and Canny edge maps.")
    parser.add_argument("--image", type=Path, default=Path(__file__).resolve().parent / "cat.jpg")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent / "results")
    parser.add_argument("--blur", type=int, choices=[0, 3, 5, 7], default=3)
    parser.add_argument("--low", type=int, default=100)
    parser.add_argument("--high", type=int, default=200)
    parser.add_argument("--save-only", action="store_true", help="Save PNGs without a GUI window.")
    args = parser.parse_args()
    if not 0 <= args.low <= args.high <= 1020:
        parser.error("Thresholds must satisfy 0 <= low <= high <= 1020.")
    edge_detection(args.image, args.output, args.blur, args.low, args.high, args.save_only)
