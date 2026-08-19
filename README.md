# Căutare catalog profile

Aplicație web (PWA) pentru telefon: cauți codul unui articol din catalogul PDF
și primești imediat imaginea articolului și pagina din catalog, cu codul
evidențiat.

## Cum funcționează

Codurile articolelor din catalog sunt desenate ca imagini, nu ca text, deci
`tools/build_index.py`:

1. randează fiecare pagină în WebP (`public/data/pages`);
2. rulează OCR (tesseract) și extrage codurile de 4 cifre cu poziția lor;
3. decupează desenul fiecărui articol prin segmentarea petelor de cerneală
   (`tools/segment.py`) și îl salvează în `public/data/thumbs`;
4. scrie `public/data/index.json` cu toate codurile, paginile și pozițiile.

## Regenerarea indexului

Necesar: `tesseract-ocr`, `poppler-utils`, Python cu `pymupdf`, `pillow`,
`scipy`.

```bash
python3 tools/build_index.py catalog.pdf --out public/data
```

## Rulare locală

```bash
python3 -m http.server 8000 --directory public
```

Deschide `http://localhost:8000` pe telefon și adaugă pagina pe ecranul
principal — service workerul ține catalogul offline.
