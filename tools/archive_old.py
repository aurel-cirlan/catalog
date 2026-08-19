"""Keep the articles of a previous catalog edition next to the current one.

Copies from an older `data` directory only the articles missing from the new
catalog, together with their pages and drawings, into `data/old`. The web app
shows them after the current results, marked as the older edition.
"""

import argparse
import json
import shutil
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("old", type=Path, help="data directory of the old catalog")
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--label", default="catalog 2025")
    args = parser.parse_args()

    old = json.loads((args.old / "index.json").read_text(encoding="utf-8"))
    new = json.loads((args.data / "index.json").read_text(encoding="utf-8"))
    current = {article["code"] for article in new["articles"]}
    articles = [a for a in old["articles"] if a["code"] not in current]

    out = args.data / "old"
    for name in ("pages", "thumbs"):
        shutil.rmtree(out / name, ignore_errors=True)
        (out / name).mkdir(parents=True, exist_ok=True)

    pages = {hit["page"] for a in articles for hit in a["hits"]}
    thumbs = {
        hit["thumb"] for a in articles for hit in a["hits"] if hit.get("thumb")
    }
    for page in sorted(pages):
        name = f"{page:03d}.webp"
        shutil.copyfile(args.old / "pages" / name, out / "pages" / name)
    for thumb in sorted(thumbs):
        shutil.copyfile(args.old / "thumbs" / thumb, out / "thumbs" / thumb)

    index = {
        "label": args.label,
        "pageCount": old["pageCount"],
        "sections": old.get("sections", []),
        "articles": articles,
    }
    (out / "index.json").write_text(json.dumps(index), encoding="utf-8")
    print(f"{len(articles)} old articles, {len(pages)} pages, {len(thumbs)} drawings")


if __name__ == "__main__":
    main()
