const FAVOURITES_KEY = "catalog.favourites";
const HISTORY_KEY = "catalog.history";
const THEME_KEY = "catalog.theme";
const MAX_RESULTS = 60;
const MAX_SECTION_RESULTS = 400;
const MAX_HISTORY = 8;
const NEIGHBOUR_LIMIT = 20;
const CODE_RE = /\d{4}/g;

const els = {
  query: document.getElementById("query"),
  clear: document.getElementById("clear"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  favourites: document.getElementById("favourites"),
  favouriteList: document.getElementById("favouriteList"),
  history: document.getElementById("history"),
  historyList: document.getElementById("historyList"),
  historyClear: document.getElementById("historyClear"),
  sections: document.getElementById("sections"),
  sectionList: document.getElementById("sectionList"),
  neighbours: document.getElementById("neighbours"),
  theme: document.getElementById("theme"),
  share: document.getElementById("share"),
  scan: document.getElementById("scan"),
  scanner: document.getElementById("scanner"),
  scanVideo: document.getElementById("scanVideo"),
  scanShot: document.getElementById("scanShot"),
  scanClose: document.getElementById("scanClose"),
  scanTorch: document.getElementById("scanTorch"),
  scanStatus: document.getElementById("scanStatus"),
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
let sections = [];
let activeSection = null;
let current = null;
let zoom = 1;
let naturalWidth = 0;

const favourites = new Set(
  JSON.parse(localStorage.getItem(FAVOURITES_KEY) || "[]"),
);
let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

function saveFavourites() {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify([...favourites]));
}

function remember(term) {
  const clean = term.trim();
  if (!clean) return;
  history = [clean, ...history.filter((item) => item !== clean)].slice(
    0,
    MAX_HISTORY,
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.theme.textContent = theme === "light" ? "\u263e" : "\u2600";
  localStorage.setItem(THEME_KEY, theme);
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
  button.addEventListener("click", () => {
    remember(els.query.value);
    open(hit);
  });
  item.append(button);
  return item;
}

// every article drawn in a catalog section, one card per code
function sectionHits(section) {
  const pages = new Set(section.pages);
  const seen = new Set();
  return hits
    .filter((hit) => pages.has(hit.page) && hit.heading)
    .filter((hit) => !seen.has(hit.code) && seen.add(hit.code))
    .sort((a, b) => a.page - b.page || a.code.localeCompare(b.code))
    .slice(0, MAX_SECTION_RESULTS);
}

function renderSections() {
  els.sections.hidden = sections.length === 0;
  els.sectionList.replaceChildren();
  for (const section of sections) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = section.ro || section.name;
    chip.className = section === activeSection ? "on" : "";
    chip.addEventListener("click", () => {
      activeSection = section === activeSection ? null : section;
      els.query.value = "";
      render("");
    });
    els.sectionList.append(chip);
  }
}

function render(term) {
  els.results.replaceChildren();
  if (!term.trim()) {
    renderSections();
    if (activeSection) {
      const matches = sectionHits(activeSection);
      els.favourites.hidden = true;
      els.history.hidden = true;
      els.status.textContent = `${activeSection.ro || activeSection.name} · ${matches.length} articole`;
      els.results.append(...matches.map(resultCard));
      return;
    }
    els.status.textContent = `${hits.length} poziții indexate · caută cod sau denumire`;
    renderFavourites();
    renderHistory();
    return;
  }
  activeSection = null;
  renderSections();
  els.favourites.hidden = true;
  els.history.hidden = true;
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

function renderHistory() {
  els.history.hidden = history.length === 0;
  els.historyList.replaceChildren();
  for (const term of history) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = term;
    chip.addEventListener("click", () => {
      els.query.value = term;
      render(term);
    });
    els.historyList.append(chip);
  }
}

// the other articles printed on the same catalog page, usually parts that fit together
function renderNeighbours(hit) {
  const seen = new Set([hit.code]);
  const others = hits.filter(
    (item) =>
      item.page === hit.page && !seen.has(item.code) && seen.add(item.code),
  );
  els.neighbours.hidden = others.length === 0;
  els.neighbours.replaceChildren();
  for (const other of others.slice(0, NEIGHBOUR_LIMIT)) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = other.code;
    chip.title = label(other);
    chip.addEventListener("click", () => open(other));
    els.neighbours.append(chip);
  }
}

async function shareCurrent() {
  if (!current) return;
  const link = `${location.origin}${location.pathname}#${current.code}`;
  const name = label(current);
  const text = `Articol ${current.code}${name ? ` · ${name}` : ""} · pagina ${
    current.page
  }\n${link}`;
  try {
    let files = [];
    if (current.thumb) {
      const blob = await (await fetch(`data/thumbs/${current.thumb}`)).blob();
      files = [new File([blob], `${current.code}.webp`, { type: blob.type })];
    }
    if (files.length && navigator.canShare?.({ files })) {
      await navigator.share({ files, text });
      return;
    }
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
  } catch (error) {
    if (error.name === "AbortError") return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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
  renderNeighbours(hit);
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

let recogniser = null;
let stream = null;
let scanning = false;
let torchOn = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = src;
    tag.onload = resolve;
    tag.onerror = () => reject(new Error("script indisponibil"));
    document.head.append(tag);
  });
}

async function getRecogniser() {
  if (recogniser) return recogniser;
  if (!window.Tesseract) await loadScript("vendor/tesseract/tesseract.min.js");
  recogniser = await window.Tesseract.createWorker("eng", 1, {
    workerPath: new URL("vendor/tesseract/worker.min.js", location.href).href,
    corePath: new URL("vendor/tesseract/", location.href).href,
    langPath: new URL("vendor/tessdata", location.href).href,
    gzip: true,
  });
  await recogniser.setParameters({ tessedit_char_whitelist: "0123456789" });
  return recogniser;
}

// crop of the video behind the on-screen frame, enlarged and hardened for OCR
function shot(part) {
  const video = els.scanVideo;
  const width = Math.round(video.videoWidth * part);
  const height = Math.round(video.videoHeight * part * 0.6);
  const scale = Math.min(1400 / width, 4);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  context.filter = "grayscale(1) contrast(2) brightness(1.15)";
  context.drawImage(
    video,
    Math.round((video.videoWidth - width) / 2),
    Math.round((video.videoHeight - height) / 2),
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

// the code the user aimed at: the known one that is big and near the middle
function centredCode(words, canvas) {
  const middle = { x: canvas.width / 2, y: canvas.height / 2 };
  const found = words
    .map((word) => ({
      code: (word.text.replace(/\s+/g, "").match(CODE_RE) || [])[0],
      distance: Math.hypot(
        (word.bbox.x0 + word.bbox.x1) / 2 - middle.x,
        (word.bbox.y0 + word.bbox.y1) / 2 - middle.y,
      ),
      height: word.bbox.y1 - word.bbox.y0,
    }))
    .filter((word) => word.code && hits.some((hit) => hit.code === word.code))
    .sort((a, b) => a.distance / a.height - b.distance / b.height);
  return found.length ? found[0].code : null;
}

async function openScanner() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
  } catch {
    els.status.textContent = "Camera nu este disponibilă";
    return;
  }
  torchOn = false;
  els.scanTorch.hidden = !track()?.getCapabilities?.().torch;
  els.scanStatus.textContent = "Se pregătește…";
  els.scanVideo.srcObject = stream;
  await els.scanVideo.play();
  els.scanner.showModal();
  scanLoop();
}

function track() {
  return stream?.getVideoTracks()[0];
}

async function toggleTorch() {
  torchOn = !torchOn;
  try {
    await track()?.applyConstraints({ advanced: [{ torch: torchOn }] });
  } catch {
    els.scanTorch.hidden = true;
  }
}

function closeScanner() {
  scanning = false;
  if (stream) stream.getTracks().forEach((item) => item.stop());
  stream = null;
  els.scanVideo.srcObject = null;
  if (els.scanner.open) els.scanner.close();
}

function useCode(code) {
  closeScanner();
  els.query.value = code;
  remember(code);
  render(code);
}

// one pass over the current frame; alternates crop and layout mode each round
async function readFrame(round) {
  const worker = await getRecogniser();
  const canvas = shot(round % 2 ? 0.95 : 0.65);
  await worker.setParameters({
    tessedit_pageseg_mode: round % 4 < 2 ? "11" : "6",
  });
  const result = await worker.recognize(canvas);
  const words = result.data.words || [];
  return {
    code: centredCode(words, canvas),
    seen: words.flatMap((word) => word.text.match(CODE_RE) || [])[0],
  };
}

// keeps reading frames until a catalog code shows up, so nothing has to be timed
async function scanLoop() {
  if (scanning) return;
  scanning = true;
  for (let round = 0; scanning; round += 1) {
    if (!els.scanVideo.videoWidth) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }
    try {
      const { code, seen } = await readFrame(round);
      if (!scanning) return;
      if (code) {
        useCode(code);
        return;
      }
      els.scanStatus.textContent = seen
        ? `Am citit ${seen}, dar nu e în catalog`
        : "Caut codul… ține telefonul nemișcat";
    } catch {
      els.scanStatus.textContent = "Scanarea nu a putut porni";
      return;
    }
  }
}

els.query.addEventListener("input", () => render(els.query.value));
els.clear.addEventListener("click", () => {
  els.query.value = "";
  activeSection = null;
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
els.share.addEventListener("click", shareCurrent);
els.theme.addEventListener("click", () =>
  applyTheme(
    document.documentElement.dataset.theme === "light" ? "dark" : "light",
  ),
);
els.scan.addEventListener("click", openScanner);
els.scanShot.addEventListener("click", scanLoop);
els.scanTorch.addEventListener("click", toggleTorch);
els.scanClose.addEventListener("click", closeScanner);
els.scanner.addEventListener("close", closeScanner);
els.historyClear.addEventListener("click", () => {
  history = [];
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});
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
    const index = await response.json();
    hits = flatten(index);
    sections = index.sections || [];
    const shared = location.hash.replace("#", "").trim();
    els.query.value = shared;
    render(shared);
    if (!shared) els.query.focus();
  } catch (error) {
    els.status.textContent = `Catalogul nu a putut fi încărcat: ${error.message}`;
  }
}

applyTheme(localStorage.getItem(THEME_KEY) || "dark");

// a new release takes over on its own, so the phone never shows a stale version
if ("serviceWorker" in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register("sw.js").then((registration) => {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) registration.update();
    });
  }, () => {});
}

boot();
