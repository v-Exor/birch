# Laboratory Activity 2 Edge Detection

Run `python -m pip install -r requirements.txt`, then `python edge_detection.py`.
The included `cat.jpg` is the sample used in the completed conversation activity.

For another image: `python edge_detection.py --image "path/to/photo.jpg"`.
To save without opening a plot window: `python edge_detection.py --save-only`.
Optional exploration: `--blur 5 --low 50 --high 100`. Defaults match the handout.
Results are saved in `results/`: grayscale, normalized Sobel, binary Canny, the
side-by-side comparison, and measurements. Sobel's raw gradients use CV_64F.

`handout_edge_detection.py` preserves the original Word document's code. It
expects `input.jpg` in your current working directory. The handout did not embed
that input photo; copy an actual JPEG to that filename or change the path.

No image is uploaded to a service. Run these scripts locally; GitHub Pages
serves the JavaScript browser equivalent and cannot execute Python as a backend.
