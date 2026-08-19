const FAVOURITES_KEY = "catalog.favourites";
const MAX_RESULTS = 60;

const els = {
  query: document.getElementById("query"),
  clear: document.getElementById("clear"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  favourites: document.getElementById("favourites"),
  favouriteList: document.getElementById("favouriteList"),
  viewer: document.getElementById("viewer"),
  viewerTitle: document.getElementById("viewerTitle"),
  stage: document.getElementById("stage"),
  pageImage: document.getElementById("pageImage"),
  marker: document.getElementById("marker"),
  close: document.getElementById("close"),
  favourite: document.getElementById("favourite"),
  zoomIn: document.getElementById("zoomIn"),
  zoomOut: document.getElementById("zoomOut"),
  fit: document.getElementById("fit"),
};

let hits = [];
let current = null;
let zoom = 1;
let naturalWidth = 0;

const favourites = new Set(
  JSON.parse(localStorage.getItem(FAVOURITES_KEY) || "[]"),
);

function saveFavourites() {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify([...favourites]));
}

function normalise(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss");
}

function flatten(index) {
  const flat = [];
  for (const article of index.articles) {
    for (const hit of article.hits) {
      flat.push({
        code: article.code,
        name: article.name,
        ro: article.ro,
        haystack: normalise(`${article.name} ${article.ro}`),
        ...hit,
      });
    }
  }
  return flat;
}

function search(term) {
  const clean = normalise(term.trim());
  if (!clean) return [];
  const digits = clean.replace(/\D/g, "");
  const matches = hits.filter((hit) => {
    if (digits.length >= 2 && hit.code.includes(digits)) return true;
    return clean.length >= 2 && hit.haystack.includes(clean);
  });
  return matches
    .sort((a, b) => {
      const exact = Number(b.code === digits) - Number(a.code === digits);
      const starts =
        Number(b.code.startsWith(digits)) - Number(a.code.startsWith(digits));
      return (
        exact ||
        starts ||
        Number(b.heading) - Number(a.heading) ||
        a.code.localeCompare(b.code) ||
        a.page - b.page
      );
    })
    .slice(0, MAX_RESULTS);
}

function keyOf(hit) {
  return `${hit.code}|${hit.page}`;
}

function label(hit) {
  const parts = [hit.ro, hit.name].filter(Boolean);
  return parts.length ? parts.join(" · ") : hit.title || "";
}

function resultCard(hit) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "card";

  if (hit.thumb) {
    const img = document.createElement("img");
    img.src = `data/thumbs/${hit.thumb}`;
    img.alt = `Articol ${hit.code}`;
    img.loading = "lazy";
    button.append(img);
  }

  const text = document.createElement("div");
  const code = document.createElement("div");
  code.className = "code";
  code.textContent = hit.code;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = label(hit);
  text.append(code, meta);

  const page = document.createElement("div");
  page.className = "page";
  page.textContent = `p. ${hit.page}`;

  button.append(text, page);
  button.addEventListener("click", () => open(hit));
  item.append(button);
  return item;
}

function render(term) {
  els.results.replaceChildren();
  if (!term.trim()) {
    els.status.textContent = `${hits.length} poziții indexate · caută cod sau denumire`;
    renderFavourites();
    return;
  }
  els.favourites.hidden = true;
  const matches = search(term);
  if (!matches.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Niciun rezultat";
    els.results.append(empty);
    els.status.textContent = "0 rezultate";
    return;
  }
  els.status.textContent = `${matches.length} rezultate`;
  els.results.append(...matches.map(resultCard));
}

function renderFavourites() {
  const saved = [...favourites];
  els.favourites.hidden = saved.length === 0;
  els.favouriteList.replaceChildren();
  for (const key of saved) {
    const hit = hits.find((item) => keyOf(item) === key);
    if (!hit) continue;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = `${hit.code} · p.${hit.page}`;
    chip.addEventListener("click", () => open(hit));
    els.favouriteList.append(chip);
  }
}

function applyZoom() {
  els.pageImage.style.width = `${naturalWidth * zoom}px`;
  placeMarker();
}

function placeMarker() {
  const width = els.pageImage.clientWidth;
  const height = els.pageImage.clientHeight;
  if (!current || current.x === undefined) {
    els.marker.hidden = true;
    return;
  }
  els.marker.hidden = false;
  const padX = width * 0.02;
  const padY = height * 0.01;
  els.marker.style.left = `${current.x * width - padX}px`;
  els.marker.style.top = `${current.y * height - padY}px`;
  els.marker.style.width = `${current.w * width + padX * 2}px`;
  els.marker.style.height = `${current.h * height + padY * 2}px`;
}

function scrollToMarker() {
  if (!current || current.x === undefined) return;
  const left =
    els.pageImage.clientWidth * (current.x + current.w / 2) -
    els.stage.clientWidth / 2;
  const top =
    els.pageImage.clientHeight * (current.y + current.h / 2) -
    els.stage.clientHeight / 2;
  els.stage.scrollTo({ left: Math.max(left, 0), top: Math.max(top, 0) });
}

function open(hit) {
  current = hit;
  els.viewerTitle.textContent = `${hit.code} · pagina ${hit.page}`;
  els.favourite.textContent = favourites.has(keyOf(hit)) ? "★" : "☆";
  els.pageImage.src = `data/pages/${String(hit.page).padStart(3, "0")}.webp`;
  els.pageImage.alt = `Pagina ${hit.page}`;
  if (!els.viewer.open) els.viewer.showModal();
  els.pageImage.onload = () => {
    naturalWidth = els.pageImage.naturalWidth;
    // open zoomed in enough that the drawing is readable on a phone
    zoom = current.x === undefined ? els.stage.clientWidth / naturalWidth : 1;
    applyZoom();
    scrollToMarker();
  };
}

function fitPage() {
  zoom = els.stage.clientWidth / naturalWidth;
  applyZoom();
  els.stage.scrollTo({ left: 0, top: 0 });
}

els.query.addEventListener("input", () => render(els.query.value));
els.clear.addEventListener("click", () => {
  els.query.value = "";
  els.query.focus();
  render("");
});
els.close.addEventListener("click", () => els.viewer.close());
els.zoomIn.addEventListener("click", () => {
  zoom = Math.min(zoom * 1.4, 8);
  applyZoom();
  scrollToMarker();
});
els.zoomOut.addEventListener("click", () => {
  zoom = Math.max(zoom / 1.4, 0.2);
  applyZoom();
  scrollToMarker();
});
els.fit.addEventListener("click", fitPage);
els.favourite.addEventListener("click", () => {
  if (!current) return;
  const key = keyOf(current);
  if (favourites.has(key)) favourites.delete(key);
  else favourites.add(key);
  saveFavourites();
  els.favourite.textContent = favourites.has(key) ? "★" : "☆";
  renderFavourites();
});

async function boot() {
  try {
    const response = await fetch("data/index.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    hits = flatten(await response.json());
    render("");
    els.query.focus();
  } catch (error) {
    els.status.textContent = `Catalogul nu a putut fi încărcat: ${error.message}`;
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

boot();
