"""Build the searchable catalog index from the source PDF.

Renders every page to WebP, OCRs it with tesseract and extracts the article
codes together with their normalised bounding boxes.
"""

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

import pymupdf
from PIL import Image

from segment import block_for, block_labels, ink_mask

CODE_RE = re.compile(r"^[0-9]{4}$")
OCR_DPI = 300
PAGE_DPI = 150
THUMB_DPI = 200
MIN_CONF = 40
# a code printed as an article heading is roughly twice as tall as the codes
# listed inside the moment-of-inertia tables next to each drawing
HEADING_MIN_HEIGHT = 26
# the left column of every page is a navigation sidebar, not article content
CONTENT_LEFT = 0.17
# the page header repeats the profile system name ("S 7000"), which looks
# exactly like an article code
CONTENT_TOP = 0.09
PAD = 6


def page_title(page: pymupdf.Page) -> str:
    """Read the printed heading of a page from the PDF text layer."""
    parts: list[str] = []
    width, height = page.rect.width, page.rect.height
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                x = span["bbox"][0] / width
                y = span["bbox"][1] / height
                if x < CONTENT_LEFT or not 0.01 < y < CONTENT_TOP:
                    continue
                text = span["text"].strip()
                if text:
                    parts.append(text)
    return " ".join(parts).replace(" ·", " ·").strip()


def render(page: pymupdf.Page, dpi: int) -> Image.Image:
    pix = page.get_pixmap(dpi=dpi)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def ocr_words(image: Image.Image) -> list[dict]:
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "page.png"
        image.convert("L").save(src)
        tsv = subprocess.run(
            ["tesseract", str(src), "stdout", "--psm", "11", "tsv"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
    words = []
    lines = tsv.splitlines()
    header = lines[0].split("\t")
    for line in lines[1:]:
        cells = line.split("\t")
        if len(cells) != len(header):
            continue
        row = dict(zip(header, cells))
        text = row["text"].strip()
        if not text:
            continue
        words.append(
            {
                "text": text,
                "conf": float(row["conf"]),
                "left": int(row["left"]),
                "top": int(row["top"]),
                "width": int(row["width"]),
                "height": int(row["height"]),
            }
        )
    return words


def crop_article(
    image: Image.Image, labels, count: int, box: dict, out: Path
) -> bool:
    """Crop the drawing block that the heading code belongs to."""
    w, h = image.size
    pixel_box = (
        int(box["x"] * w),
        int(box["y"] * h),
        int((box["x"] + box["w"]) * w),
        int((box["y"] + box["h"]) * h),
    )
    found = block_for(labels, count, pixel_box)
    if found is None:
        return False
    x0, y0, x1, y1 = found
    crop = image.crop(
        (
            max(x0 - PAD, 0),
            max(y0 - PAD, 0),
            min(x1 + PAD, w),
            min(y1 + PAD, h),
        )
    )
    crop.save(out, quality=80, method=4)
    return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--pages", type=str, default="")
    args = parser.parse_args()

    pages_dir = args.out / "pages"
    thumbs_dir = args.out / "thumbs"
    pages_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(args.pdf)
    wanted = (
        {int(p) for p in args.pages.split(",")}
        if args.pages
        else set(range(1, doc.page_count + 1))
    )

    entries: list[dict] = []
    page_meta: list[dict] = []

    for number, page in enumerate(doc, start=1):
        if number not in wanted:
            continue
        render(page, PAGE_DPI).save(
            pages_dir / f"{number:03d}.webp", quality=78, method=4
        )
        big = render(page, OCR_DPI)
        words = ocr_words(big)
        thumb_page = render(page, THUMB_DPI)
        labels, count = block_labels(ink_mask(thumb_page))
        title = page_title(page)
        found = 0
        for word in words:
            if word["conf"] < MIN_CONF or not CODE_RE.match(word["text"]):
                continue
            if (
                word["left"] / big.width < CONTENT_LEFT
                or word["top"] / big.height < CONTENT_TOP
            ):
                continue
            heading = word["height"] >= HEADING_MIN_HEIGHT
            box = {
                "x": word["left"] / big.width,
                "y": word["top"] / big.height,
                "w": word["width"] / big.width,
                "h": word["height"] / big.height,
            }
            entry = {
                "code": word["text"],
                "page": number,
                "title": title,
                "heading": heading,
                **box,
            }
            if heading:
                name = f"{number:03d}-{word['text']}-{found}.webp"
                if crop_article(
                    thumb_page, labels, count, box, thumbs_dir / name
                ):
                    entry["thumb"] = name
                found += 1
            entries.append(entry)
        page_meta.append(
            {"page": number, "codes": found, "title": page_title(page)}
        )
        print(f"page {number}: {found} article codes", flush=True)

    result = {
        "pageCount": doc.page_count,
        "pages": page_meta,
        "entries": entries,
    }
    (args.out / "ocr.json").write_text(json.dumps(result), encoding="utf-8")
    print(f"{len(entries)} codes indexed")


if __name__ == "__main__":
    main()
