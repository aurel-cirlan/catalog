"""Merge the register (names, pages) with the OCR result (images, positions).

Reads `ocr.json` produced by build_index.py and writes the `index.json` the
web app consumes.
"""

import argparse
import json
from pathlib import Path

import pymupdf
import register

GLOSSARY = json.loads(
    (Path(__file__).with_name("glossary_ro.json")).read_text(encoding="utf-8")
)


def hits_for(ocr_by_page: dict[int, list[dict]], code: str, page: int) -> list[dict]:
    """Best position of a code on a page, article headings first."""
    found = [entry for entry in ocr_by_page.get(page, []) if entry["code"] == code]
    found.sort(key=lambda entry: (not entry["heading"], entry["y"], entry["x"]))
    del found[1:]
    return [
        {
            "page": page,
            "x": entry["x"],
            "y": entry["y"],
            "w": entry["w"],
            "h": entry["h"],
            "heading": entry["heading"],
            **({"thumb": entry["thumb"]} if entry.get("thumb") else {}),
        }
        for entry in found
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--data", type=Path, required=True)
    args = parser.parse_args()

    ocr = json.loads((args.data / "ocr.json").read_text(encoding="utf-8"))
    ocr_by_page: dict[int, list[dict]] = {}
    for entry in ocr["entries"]:
        ocr_by_page.setdefault(entry["page"], []).append(entry)
    titles = {page["page"]: page["title"] for page in ocr["pages"]}

    doc = pymupdf.open(args.pdf)
    articles: dict[str, dict] = {}

    for item in register.parse(doc):
        article = articles.setdefault(
            item["code"],
            {
                "code": item["code"],
                "name": item["name"],
                "ro": GLOSSARY.get(item["name"], ""),
                "hits": [],
            },
        )
        for page in item["pages"]:
            hits = hits_for(ocr_by_page, item["code"], page) or [
                {"page": page, "heading": False}
            ]
            for hit in hits:
                hit["title"] = titles.get(page, "")
                if hit not in article["hits"]:
                    article["hits"].append(hit)

    # codes drawn on a page but missing from the printed register
    for page, entries in ocr_by_page.items():
        for entry in entries:
            if not entry["heading"] or entry["code"] in articles:
                continue
            articles[entry["code"]] = {
                "code": entry["code"],
                "name": "",
                "ro": "",
                "hits": hits_for(ocr_by_page, entry["code"], page),
            }

    index = {
        "pageCount": ocr["pageCount"],
        "articles": sorted(articles.values(), key=lambda a: a["code"]),
    }
    (args.data / "index.json").write_text(json.dumps(index), encoding="utf-8")

    used = {
        hit["thumb"]
        for article in index["articles"]
        for hit in article["hits"]
        if hit.get("thumb")
    }
    for thumb in (args.data / "thumbs").iterdir():
        if thumb.name not in used:
            thumb.unlink()

    with_thumb = sum(
        1
        for a in index["articles"]
        if any(hit.get("thumb") for hit in a["hits"])
    )
    print(
        f"{len(index['articles'])} articles, {with_thumb} with a drawing"
    )


if __name__ == "__main__":
    main()
