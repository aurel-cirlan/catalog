/*!
 * Catalog GEALAN - cautare rapida articole
 * Copyright (c) 2026 Aurel Cirlan - https://aurelcirlan.ro
 * Toate drepturile rezervate. Copierea, modificarea sau redistribuirea
 * acestui cod fara acordul scris al autorului este interzisa.
 */
const FAVOURITES_KEY = "catalog.favourites";
const HISTORY_KEY = "catalog.history";
const THEME_KEY = "catalog.theme";
const NOTES_KEY = "catalog.notes";
const WORKLIST_KEY = "catalog.worklist";
const GUIDE_KEY = "catalog.guide";
const LAST_KEY = "catalog.last";
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
  recent: document.getElementById("recent"),
  recentList: document.getElementById("recentList"),
  worklist: document.getElementById("worklist"),
  worklistTitle: document.getElementById("worklistTitle"),
  worklistItems: document.getElementById("worklistItems"),
  worklistSend: document.getElementById("worklistSend"),
  worklistClear: document.getElementById("worklistClear"),
  depths: document.getElementById("depths"),
  depthList: document.getElementById("depthList"),
  sections: document.getElementById("sections"),
  groupList: document.getElementById("groupList"),
  sectionList: document.getElementById("sectionList"),
  neighbours: document.getElementById("neighbours"),
  theme: document.getElementById("theme"),
  share: document.getElementById("share"),
  sharePage: document.getElementById("sharePage"),
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
  watermark: document.querySelector(".watermark"),
  close: document.getElementById("close"),
  favourite: document.getElementById("favourite"),
  note: document.getElementById("note"),
  addList: document.getElementById("addList"),
  compareAdd: document.getElementById("compareAdd"),
  printPage: document.getElementById("printPage"),
  printImage: document.getElementById("printImage"),
  compare: document.getElementById("compare"),
  compareBody: document.getElementById("compareBody"),
  compareClose: document.getElementById("compareClose"),
  compareReset: document.getElementById("compareReset"),
  guide: document.getElementById("guide"),
  guideClose: document.getElementById("guideClose"),
  help: document.getElementById("help"),
  guideTut: document.getElementById("guideTut"),
  backupSave: document.getElementById("backupSave"),
  backupLoad: document.getElementById("backupLoad"),
  backupFile: document.getElementById("backupFile"),
  tutorials: document.getElementById("tutorials"),
  tutList: document.getElementById("tutList"),
  tutImage: document.getElementById("tutImage"),
  tutText: document.getElementById("tutText"),
  tutClose: document.getElementById("tutClose"),
  zoomIn: document.getElementById("zoomIn"),
  zoomOut: document.getElementById("zoomOut"),
  fit: document.getElementById("fit"),
};

let hits = [];
let sections = [];
let activeGroup = null;
let activeDepth = null;
let activeSection = null;
let comparing = [];
let current = null;
let zoom = 1;
let naturalWidth = 0;

const favourites = new Set(
  JSON.parse(localStorage.getItem(FAVOURITES_KEY) || "[]"),
);
let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
const notes = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
let worklist = JSON.parse(localStorage.getItem(WORKLIST_KEY) || "[]");
let lastOpened = localStorage.getItem(LAST_KEY) || "";

function saveNotes() {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function saveWorklist() {
  localStorage.setItem(WORKLIST_KEY, JSON.stringify(worklist));
}

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

// the catalog section a page belongs to, so "kubus" or "s 8000" also find articles
function pageSections(index) {
  const map = new Map();
  for (const section of index.sections || []) {
    for (const page of section.pages) {
      map.set(page, `${section.name} ${section.ro || ""}`);
    }
  }
  return map;
}

function flatten(index) {
  const bySection = pageSections(index);
  const flat = [];
  for (const article of index.articles) {
    for (const hit of article.hits) {
      flat.push({
        code: article.code,
        name: article.name,
        ro: article.ro,
        haystack: normalise(
          `${article.name} ${article.ro} ${bySection.get(hit.page) || ""}`,
        ),
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
    if (clean.length < 2) return false;
    const note = notes[hit.code];
    return (
      hit.haystack.includes(clean) || (note && normalise(note).includes(clean))
    );
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
  if (notes[hit.code]) {
    const note = document.createElement("div");
    note.className = "cardNote";
    note.textContent = `\u270e ${notes[hit.code]}`;
    text.append(note);
  }

  const page = document.createElement("div");
  page.className = "page";
  page.textContent = `p. ${hit.page}`;

  button.append(text, page);
  button.addEventListener("click", () => {
    remember(els.query.value);
    open(hit);
  });
  item.append(button, listToggle(hit.code));
  return item;
}

// add or drop a code without leaving the result list
function listToggle(code) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "listToggle";
  const paint = () => {
    const inList = worklist.includes(code);
    button.textContent = inList ? "\u2212" : "\uff0b";
    button.classList.toggle("on", inList);
    button.setAttribute(
      "aria-label",
      inList
        ? `Scoate ${code} din list\u0103`
        : `Adaug\u0103 ${code} \u00een list\u0103`,
    );
  };
  paint();
  button.addEventListener("click", () => {
    worklist = worklist.includes(code)
      ? worklist.filter((item) => item !== code)
      : [...worklist, code];
    saveWorklist();
    paint();
    renderWorklist();
    updateListButton();
  });
  return button;
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

function chip(text, on, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  if (on) button.className = "on";
  button.addEventListener("click", onClick);
  return button;
}

// the building depth of a profile system, the way the workshop asks for it
function renderDepths() {
  const depths = [
    ...new Set(sections.map((section) => section.depth).filter(Boolean)),
  ];
  els.depths.hidden = depths.length === 0;
  els.depthList.replaceChildren();
  for (const depth of depths) {
    els.depthList.append(
      chip(depth, depth === activeDepth, () => {
        activeDepth = depth === activeDepth ? null : depth;
        activeGroup = null;
        activeSection = null;
        els.query.value = "";
        render("");
      }),
    );
  }
}

// two levels, so a phone screen shows a handful of buttons instead of thirty
function renderSections() {
  els.sections.hidden = sections.length === 0;
  els.groupList.replaceChildren();
  const groups = [...new Set(sections.map((section) => section.group))];
  for (const group of groups) {
    els.groupList.append(
      chip(group, group === activeGroup, () => {
        activeGroup = group === activeGroup ? null : group;
        activeDepth = null;
        activeSection = null;
        els.query.value = "";
        render("");
      }),
    );
  }
  const shown = activeDepth
    ? sections.filter((item) => item.depth === activeDepth)
    : sections.filter((item) => item.group === activeGroup);
  els.sectionList.hidden = !shown.length;
  els.sectionList.replaceChildren();
  for (const section of shown) {
    els.sectionList.append(
      chip(section.ro || section.name, section === activeSection, () => {
        activeSection = section === activeSection ? null : section;
        els.query.value = "";
        render("");
      }),
    );
  }
}

function render(term) {
  els.results.replaceChildren();
  if (!term.trim()) {
    renderDepths();
    renderSections();
    renderWorklist();
    if (activeSection) {
      const matches = sectionHits(activeSection);
      els.recent.hidden = true;
      els.favourites.hidden = true;
      els.history.hidden = true;
      els.status.textContent = `${activeSection.ro || activeSection.name} · ${matches.length} articole`;
      els.results.append(...matches.map(resultCard));
      return;
    }
    els.status.textContent = `${hits.length} poziții indexate · caută cod sau denumire`;
    renderRecent();
    renderFavourites();
    renderHistory();
    return;
  }
  activeGroup = null;
  activeDepth = null;
  activeSection = null;
  renderDepths();
  renderSections();
  els.worklist.hidden = true;
  els.recent.hidden = true;
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

// one tap back into the drawing that was open last time
function renderRecent() {
  const hit = lastOpened ? hitByCode(lastOpened) : null;
  els.recent.hidden = !hit;
  els.recentList.replaceChildren();
  if (!hit) return;
  els.recentList.append(
    chip(`${hit.code} · p.${hit.page}`, false, () => open(hit)),
  );
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

// short screen recordings of the app itself, made with tools/make_tutorials.py
const TUTORIALS = [
  {
    file: "cod.gif",
    name: "Caută după cod",
    text: "Scrie codul (ex. 7093), apasă pe rezultat și vezi pagina din catalog cu codul încadrat. Cu + / − mărești desenul.",
  },
  {
    file: "denumire.gif",
    name: "Caută după denumire",
    text: "Nu știi codul? Scrie denumirea în română: garnitură, cercevea, prag, montant.",
  },
  {
    file: "categorii.gif",
    name: "Categorii",
    text: "Apasă o grupă (Sisteme, Componente, Glisante), apoi sistemul dorit — ex. S 8000.",
  },
  {
    file: "lista.gif",
    name: "Listă și note",
    text: "În pagina articolului: ＋ Listă îl adaugă la lista de lucru, iar nota proprie rămâne pe telefonul tău.",
  },
];

function showTutorial(index) {
  const tutorial = TUTORIALS[index];
  els.tutImage.src = `tut/${tutorial.file}`;
  els.tutImage.alt = tutorial.name;
  els.tutText.textContent = tutorial.text;
  els.tutList.replaceChildren();
  TUTORIALS.forEach((item, position) => {
    els.tutList.append(
      chip(item.name, position === index, () => showTutorial(position)),
    );
  });
}

function hitByCode(code) {
  return (
    hits.find((item) => item.code === code && item.heading) ||
    hits.find((item) => item.code === code)
  );
}

// a short pick list the user builds while walking the shop, sent in one message
function renderWorklist() {
  els.worklist.hidden = worklist.length === 0;
  els.worklistTitle.textContent = `List\u0103 de lucru (${worklist.length})`;
  els.worklistItems.replaceChildren();
  for (const code of worklist) {
    const hit = hitByCode(code);
    if (!hit) continue;
    els.worklistItems.append(
      chip(`${code} · p.${hit.page}`, false, () => open(hit)),
    );
  }
}

function worklistText() {
  const link = `${location.origin}${location.pathname}`;
  const lines = worklist.map((code) => {
    const hit = hitByCode(code);
    const name = hit ? label(hit) : "";
    const page = hit ? ` · pagina ${hit.page}` : "";
    return `${code}${name ? ` · ${name}` : ""}${page}`;
  });
  return `Listă articole catalog:\n${lines.join("\n")}\n${link}`;
}

async function sendWorklist() {
  if (!worklist.length) return;
  const text = worklistText();
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
  } catch (error) {
    if (error.name === "AbortError") return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

function updateListButton() {
  const inList = current && worklist.includes(current.code);
  els.addList.textContent = inList ? "\u2212 Listă" : "\uff0b Listă";
}

// two drawings next to each other, for choosing between similar profiles
function renderCompare() {
  els.compareBody.replaceChildren();
  for (const hit of comparing) {
    const pane = document.createElement("div");
    pane.className = "comparePane";
    if (hit.thumb) {
      const img = document.createElement("img");
      img.src = `data/thumbs/${hit.thumb}`;
      img.alt = `Articol ${hit.code}`;
      pane.append(img);
    }
    const code = document.createElement("div");
    code.className = "code";
    code.textContent = `${hit.code} · p.${hit.page}`;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = label(hit);
    pane.append(code, meta);
    if (notes[hit.code]) {
      const note = document.createElement("div");
      note.className = "cardNote";
      note.textContent = `\u270e ${notes[hit.code]}`;
      pane.append(note);
    }
    els.compareBody.append(pane);
  }
}

function addToCompare() {
  if (!current) return;
  comparing = [
    ...comparing.filter((hit) => hit.code !== current.code),
    current,
  ];
  comparing = comparing.slice(-2);
  if (comparing.length < 2) {
    els.compareAdd.textContent = "⇄ Al doilea?";
    return;
  }
  els.compareAdd.textContent = "⇄ Compară";
  renderCompare();
  els.compare.showModal();
}

// prints only the catalog page, so it can also be saved as PDF from the print dialog
function printCurrent() {
  if (!current) return;
  els.printImage.src = els.pageImage.src;
  const run = () => window.print();
  if (els.printImage.complete) run();
  else els.printImage.onload = run;
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

async function shareCurrent(withPage) {
  if (!current) return;
  const link = `${location.origin}${location.pathname}#${current.code}`;
  const name = label(current);
  const text = `Articol ${current.code}${name ? ` · ${name}` : ""} · pagina ${
    current.page
  }\n${link}`;
  try {
    const sources = withPage
      ? [
          [
            `data/pages/${String(current.page).padStart(3, "0")}.webp`,
            `pagina-${current.page}.webp`,
          ],
        ]
      : [];
    if (current.thumb) {
      sources.unshift([`data/thumbs/${current.thumb}`, `${current.code}.webp`]);
    }
    const files = await Promise.all(
      sources.map(async ([url, name]) => {
        const blob = await (await fetch(url)).blob();
        return new File([blob], name, { type: blob.type });
      }),
    );
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
  lastOpened = hit.code;
  localStorage.setItem(LAST_KEY, lastOpened);
  els.viewerTitle.textContent = `${hit.code} · pagina ${hit.page}`;
  els.favourite.textContent = favourites.has(keyOf(hit)) ? "★" : "☆";
  els.note.value = notes[hit.code] || "";
  updateListButton();
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
  activeGroup = null;
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
els.share.addEventListener("click", () => shareCurrent(false));
els.sharePage.addEventListener("click", () => shareCurrent(true));
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
els.note.addEventListener("input", () => {
  if (!current) return;
  const text = els.note.value.trim();
  if (text) notes[current.code] = text;
  else delete notes[current.code];
  saveNotes();
});
els.addList.addEventListener("click", () => {
  if (!current) return;
  worklist = worklist.includes(current.code)
    ? worklist.filter((code) => code !== current.code)
    : [...worklist, current.code];
  saveWorklist();
  updateListButton();
  renderWorklist();
});
els.worklistSend.addEventListener("click", sendWorklist);
els.worklistClear.addEventListener("click", () => {
  worklist = [];
  saveWorklist();
  renderWorklist();
  updateListButton();
});
els.compareAdd.addEventListener("click", addToCompare);
els.compareClose.addEventListener("click", () => els.compare.close());
els.compareReset.addEventListener("click", () => {
  comparing = [];
  els.compareAdd.textContent = "⇄ Compară";
  els.compare.close();
});
els.printPage.addEventListener("click", printCurrent);
els.help.addEventListener("click", () => els.guide.showModal());
els.backupSave.addEventListener("click", saveBackup);
els.backupLoad.addEventListener("click", () => els.backupFile.click());
els.backupFile.addEventListener("change", async () => {
  const file = els.backupFile.files[0];
  els.backupFile.value = "";
  if (file) await loadBackup(file);
});
els.guideTut.addEventListener("click", () => {
  localStorage.setItem(GUIDE_KEY, "1");
  els.guide.close();
  showTutorial(0);
  els.tutorials.showModal();
});
els.tutClose.addEventListener("click", () => {
  els.tutImage.removeAttribute("src");
  els.tutorials.close();
});
els.guideClose.addEventListener("click", () => {
  localStorage.setItem(GUIDE_KEY, "1");
  els.guide.close();
});
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

// a small file the user can send to the new phone, so notes and list survive
function saveBackup() {
  const data = {
    app: "catalog",
    date: new Date().toISOString(),
    notes,
    worklist,
    favourites: [...favourites],
    history,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "catalog-date.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function loadBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.notes && typeof data.notes === "object") {
      Object.assign(notes, data.notes);
      saveNotes();
    }
    if (Array.isArray(data.worklist)) {
      worklist = [...new Set([...worklist, ...data.worklist])];
      saveWorklist();
    }
    if (Array.isArray(data.favourites)) {
      data.favourites.forEach((key) => favourites.add(key));
      saveFavourites();
    }
    if (Array.isArray(data.history)) {
      history = [...new Set([...data.history, ...history])].slice(
        0,
        MAX_HISTORY,
      );
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
    els.guide.close();
    els.query.value = "";
    render("");
    els.status.textContent = "Datele au fost încărcate";
  } catch {
    els.status.textContent = "Fișierul nu a putut fi citit";
  }
}

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
    if (!localStorage.getItem(GUIDE_KEY)) els.guide.showModal();
    else if (!shared) els.query.focus();
  } catch (error) {
    els.status.textContent = `Catalogul nu a putut fi încărcat: ${error.message}`;
  }
}

els.watermark.textContent = new Array(400).fill("aurelcirlan.ro").join(" ");

applyTheme(localStorage.getItem(THEME_KEY) || "dark");

// a new release takes over on its own, so the phone never shows a stale version
if ("serviceWorker" in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register("sw.js").then(
    (registration) => {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) registration.update();
      });
    },
    () => {},
  );
}

boot();
