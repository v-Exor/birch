"""Package the Python kit and full source using only Python's standard library."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {"node_modules", ".git", "artifacts", "test-results", "playwright-report", "__pycache__"}


def package_python():
    target = ROOT / "downloads/python-lab2.zip"
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        for path in sorted((ROOT / "python").iterdir()):
            if path.is_file():
                archive.write(path, path.name)
    print(target)


def package_source():
    target = ROOT.parent / "CSST106-Lab02-Website.zip"
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        for path in sorted(ROOT.rglob("*")):
            if path.is_file() and not EXCLUDED.intersection(path.relative_to(ROOT).parts):
                archive.write(path, Path("lab-02") / path.relative_to(ROOT))
    print(target)


if __name__ == "__main__":
    package_python()
    package_source()
