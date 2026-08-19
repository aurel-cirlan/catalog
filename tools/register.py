"""Parse the article register ("Inhalt · Content") at the end of the catalog.

The register is real text in the PDF, so it is the authoritative source for
article number, name and the catalog pages the article appears on.
"""

import re

import pymupdf

HEADER = {"Art.-Nr.:", "Benennung:", "Seitenzahl:", "Inhalt · Content"}
CODE_RE = re.compile(r"^\d{4}$")
PAGES_RE = re.compile(r"^\d{1,3}(?:\s*,\s*\d{1,3})*$")
ROW_TOLERANCE = 3.0


def _rows(page: pymupdf.Page) -> list[list[tuple[float, str]]]:
    """Group the spans of a register page into printed table rows."""
    middle = page.rect.width / 2
    buckets: dict[tuple[int, int], list[tuple[float, str]]] = {}
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                text = span["text"].strip()
                if not text or text in HEADER:
                    continue
                x0, y0 = span["bbox"][0], span["bbox"][1]
                key = (0 if x0 < middle else 1, round(y0 / ROW_TOLERANCE))
                buckets.setdefault(key, []).append((x0, text))
    return [sorted(cells) for _, cells in sorted(buckets.items())]


def parse(doc: pymupdf.Document) -> list[dict]:
    """Return the register entries of the whole document."""
    articles: list[dict] = []
    for page in doc:
        if "Art.-Nr.:" not in page.get_text():
            continue
        for cells in _rows(page):
            texts = [text for _, text in cells]
            if len(texts) < 3 or not CODE_RE.match(texts[0]):
                continue
            pages_text = texts[-1]
            if not PAGES_RE.match(pages_text):
                continue
            articles.append(
                {
                    "code": texts[0],
                    "name": " ".join(texts[1:-1]).strip(),
                    "pages": [int(p) for p in pages_text.split(",")],
                }
            )
    return articles
