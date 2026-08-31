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
const LISTS_KEY = "catalog.lists";
const LIST_NAME_KEY = "catalog.listName";
const DEFAULT_LIST = "Lista mea";
const GUIDE_KEY = "catalog.guide";
const LAST_KEY = "catalog.last";
const ZOOM_KEY = "catalog.zoom";
const MAX_RESULTS = 60;
const MAX_SECTION_RESULTS = 400;
const MAX_HISTORY = 8;
const NEIGHBOUR_LIMIT = 20;
const CODE_RE = /\d{4}/g;
const MAX_SUGGESTIONS = 8;
const SUGGESTION_HISTORY_KEY = "catalog.suggestionHistory";
const LANG_KEY = "catalog.lang";

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
  shared: document.getElementById("shared"),
  sharedTitle: document.getElementById("sharedTitle"),
  sharedSave: document.getElementById("sharedSave"),
  sharedClose: document.getElementById("sharedClose"),
  recent: document.getElementById("recent"),
  recentList: document.getElementById("recentList"),
  recentClear: document.getElementById("recentClear"),
  favouriteClear: document.getElementById("favouriteClear"),
  worklist: document.getElementById("worklist"),
  worklistTitle: document.getElementById("worklistTitle"),
  worklistItems: document.getElementById("worklistItems"),
  worklistSend: document.getElementById("worklistSend"),
  worklistClear: document.getElementById("worklistClear"),
  worklistNew: document.getElementById("worklistNew"),
  worklistDrop: document.getElementById("worklistDrop"),
  listNames: document.getElementById("listNames"),
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
  scanSheet: document.getElementById("scanSheet"),
  sheetScan: document.getElementById("sheetScan"),
  sheetFile: document.getElementById("sheetFile"),
  sheetStatus: document.getElementById("sheetStatus"),
  scanStatus: document.getElementById("scanStatus"),
  progressBar: document.getElementById("progress-bar"),
  progressBarFill: document.getElementById("progress-bar-fill"),
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
  feedback: document.getElementById("feedback"),
  feedbackBox: document.getElementById("feedbackBox"),
  feedbackClose: document.getElementById("feedbackClose"),
  tutorials: document.getElementById("tutorials"),
  tutList: document.getElementById("tutList"),
  tutImage: document.getElementById("tutImage"),
  tutText: document.getElementById("tutText"),
  tutClose: document.getElementById("tutClose"),
  zoomIn: document.getElementById("zoomIn"),
  zoomOut: document.getElementById("zoomOut"),
  fit: document.getElementById("fit"),
  zoomMode: document.getElementById("zoomMode"),
  suggestions: document.getElementById("suggestions"),
  search: document.querySelector(".search"),
  lang: document.getElementById("lang"),
};

let hits = [];
let sections = [];
// articles that were dropped from the current edition, kept so old codes still work
const OLD_LABEL = "catalog vechi";
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
let suggestionHistory = JSON.parse(localStorage.getItem(SUGGESTION_HISTORY_KEY) || "[]");
let currentLang = localStorage.getItem(LANG_KEY) || "ro";

const translations = {
  ro: {
    placeholder: "Cod sau denumire",
    statusLoading: "Se încarcă catalogul…",
    statusIndexed: "poziții indexate · caută cod sau denumire",
    statusResults: "rezultate",
    statusEmpty: "Niciun rezultat",
    scanSheet: "📄 Scanează dispoziția",
    recent: "Ultimul articol deschis",
    favourites: "Favorite",
    history: "Căutări recente",
    worklist: "Listă de lucru",
    send: "trimite",
    newList: "listă nouă",
    delete: "șterge",
    clear: "golește",
    depths: "Adâncime constructivă",
    categories: "Categorii",
    back: "Înapoi",
    share: "Trimite",
    sharePage: "📄",
    favorite: "Favorit",
    addList: "＋ Listă",
    compare: "⇄ Compară",
    print: "🖨 Printează",
    zoomIn: "+",
    zoomOut: "−",
    fitPage: "Toată pagina",
    zoomArticle: "🔎 Articol",
    close: "×",
    theme: "☀",
    lang: "🌐",
    help: "?",
    sheetScan: "📄 Scanează dispoziția",
    scanClose: "Înapoi",
    scanStatus: "Apropie codul de chenar",
    scanTorch: "💡 Lumină",
    scanShot: "Citește acum",
    sheetStatusHidden: true,
    shared: "Listă primită",
    sharedSave: "salvează la mine",
    sharedClose: "închide",
    recentClear: "șterge",
    favouriteClear: "golește",
    historyClear: "golește",
    worklistClear: "golește",
    worklistDrop: "șterge",
    addList: "＋ Listă",
    compareAdd: "⇄ Compară",
    compareClose: "Înapoi",
    compareReset: "Golește",
    guide: "Cum se folosește",
    guideClose: "Am înțeles",
    help: "Cum se folosește",
    theme: "☀",
    lang: "🌐",
  },
  en: {
    placeholder: "Code or name",
    statusLoading: "Loading catalog…",
    statusIndexed: "positions indexed · search code or name",
    statusResults: "results",
    statusEmpty: "No results",
    scanSheet: "📄 Scan sheet",
    recent: "Last opened article",
    favourites: "Favorites",
    history: "Recent searches",
    worklist: "Worklist",
    send: "send",
    newList: "new list",
    delete: "delete",
    clear: "clear",
    depths: "Construction depth",
    categories: "Categories",
    back: "Back",
    share: "Share",
    sharePage: "📄",
    favorite: "Favorite",
    addList: "＋ List",
    compare: "⇄ Compare",
    print: "🖨 Print",
    zoomIn: "+",
    zoomOut: "−",
    fitPage: "Full page",
    zoomArticle: "🔎 Article",
    close: "×",
    theme: "☀",
    lang: "🌐",
    help: "?",
    sheetScan: "📄 Scan sheet",
    scanClose: "Back",
    scanStatus: "Bring code closer to frame",
    scanTorch: "💡 Light",
    scanShot: "Read now",
    sheetStatusHidden: true,
    shared: "Received list",
    sharedSave: "save to mine",
    sharedClose: "close",
    recentClear: "clear",
    favouriteClear: "clear",
    historyClear: "clear",
    worklistClear: "clear",
    worklistDrop: "delete",
    addList: "＋ List",
    compareAdd: "⇄ Compare",
    compareClose: "Back",
    compareReset: "Clear",
    guide: "How to use",
    guideClose: "Got it",
    help: "How to use",
    theme: "☀",
    lang: "🌐",
  },
  de: {
    placeholder: "Code oder Name",
    statusLoading: "Katalog wird geladen…",
    statusIndexed: "Positionen indexiert · Code oder Name suchen",
    statusResults: "Ergebnisse",
    statusEmpty: "Keine Ergebnisse",
    scanSheet: "📄 Scan Blatt",
    recent: "Zuletzt geöffneter Artikel",
    favourites: "Favoriten",
    history: "Letzte Suchen",
    worklist: "Arbeitsliste",
    send: "senden",
    newList: "neue Liste",
    delete: "löschen",
    clear: "leeren",
    depths: "Aufbautiefe",
    categories: "Kategorien",
    back: "Zurück",
    share: "Teilen",
    sharePage: "📄",
    favorite: "Favorit",
    addList: "＋ Liste",
    compare: "⇄ Vergleichen",
    print: "🖨 Drucken",
    zoomIn: "+",
    zoomOut: "−",
    fitPage: "Gesamte Seite",
    zoomArticle: "🔎 Artikel",
    close: "×",
    theme: "☀",
    lang: "🌐",
    help: "?",
    sheetScan: "📄 Scan Blatt",
    scanClose: "Zurück",
    scanStatus: "Code näher an Rahmen bringen",
    scanTorch: "💡 Licht",
    scanShot: "Jetzt lesen",
    sheetStatusHidden: true,
    shared: "Empfangene Liste",
    sharedSave: "zu mir speichern",
    sharedClose: "schließen",
    recentClear: "löschen",
    favouriteClear: "leeren",
    historyClear: "leeren",
    worklistClear: "leeren",
    worklistDrop: "löschen",
    addList: "＋ Liste",
    compareAdd: "⇄ Vergleichen",
    compareClose: "Zurück",
    compareReset: "Leeren",
    guide: "So verwenden",
    guideClose: "Verstanden",
    help: "So verwenden",
    theme: "☀",
    lang: "🌐",
  },
};

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  updateLanguage();
}

function updateLanguage() {
  const t = translations[currentLang];

  // Update placeholder
  els.query.placeholder = t.placeholder;

  // Update theme button
  els.theme.textContent = document.documentElement.dataset.theme === "light" ? "🌙" : "☀";

  // Update language button
  els.lang.textContent = currentLang.toUpperCase();

  // Update status messages (simplified for now)
  if (els.status.textContent.includes("Se încarcă") || els.status.textContent.includes("Loading") || els.status.textContent.includes("Katalog")) {
    els.status.textContent = t.statusLoading;
  }

  // Update scan sheet button
  if (els.sheetScan) {
    els.sheetScan.textContent = t.scanSheet;
  }

  // This will need to be expanded for all UI elements
}

function cycleLanguage() {
  const langs = ['ro', 'en', 'de'];
  const currentIndex = langs.indexOf(currentLang);
  const nextIndex = (currentIndex + 1) % langs.length;
  setLanguage(langs[nextIndex]);
}
let worklist = JSON.parse(localStorage.getItem(WORKLIST_KEY) || "[]");
// several named lists (one per site or per job), the active one is the worklist
let lists = JSON.parse(localStorage.getItem(LISTS_KEY) || "{}");
let listName = localStorage.getItem(LIST_NAME_KEY) || DEFAULT_LIST;
if (!lists[listName]) lists[listName] = worklist;
let lastOpened = localStorage.getItem(LAST_KEY) || "";
// "page" shows the whole sheet, "article" opens close to the drawing
let zoomMode = localStorage.getItem(ZOOM_KEY) || "page";
let sharedList = [];
let sharedName = "";
let sharedKind = "";

function saveNotes() {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function saveSuggestionHistory() {
  localStorage.setItem(SUGGESTION_HISTORY_KEY, JSON.stringify(suggestionHistory));
}

function addToSuggestionHistory(term) {
  const clean = term.trim();
  if (!clean) return;
  suggestionHistory = [clean, ...suggestionHistory.filter((item) => item !== clean)].slice(
    0,
    MAX_HISTORY,
  );
  saveSuggestionHistory();
}

function getSuggestions(term) {
  const clean = normalise(term.trim());
  if (!clean || clean.length < 2) return [];

  const suggestions = [];
  const seen = new Set();

  // Add codes first (priority)
  for (const hit of hits) {
    if (hit.code.includes(clean) && !seen.has(hit.code)) {
      suggestions.push({ type: 'code', value: hit.code });
      seen.add(hit.code);
    }
  }

  // Add from history
  for (const item of suggestionHistory) {
    if (normalise(item).includes(clean) && !seen.has(item)) {
      suggestions.push({ type: 'history', value: item });
      seen.add(item);
    }
  }

  // Add names from articles
  for (const hit of hits) {
    if (hit.haystack.includes(clean)) {
      if (hit.ro && !seen.has(hit.ro)) {
        suggestions.push({ type: 'name', value: hit.ro });
        seen.add(hit.ro);
      }
      if (hit.name && !seen.has(hit.name)) {
        suggestions.push({ type: 'name', value: hit.name });
        seen.add(hit.name);
      }
    }
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
}

function renderSuggestions(term) {
  const suggestions = getSuggestions(term);
  if (suggestions.length === 0) {
    els.suggestions.hidden = true;
    return;
  }

  els.suggestions.hidden = false;
  els.suggestions.replaceChildren();

  for (const suggestion of suggestions) {
    const item = document.createElement("div");
    item.className = "suggestionItem";

    const span = document.createElement("span");
    if (suggestion.type === 'code') {
      span.className = "suggestionCode";
    } else {
      span.className = "suggestionName";
    }
    span.textContent = suggestion.value;
    item.append(span);

    item.addEventListener("click", () => {
      els.query.value = suggestion.value;
      els.suggestions.hidden = true;
      remember(suggestion.value);
      addToSuggestionHistory(suggestion.value);
      render(suggestion.value);
    });
    els.suggestions.append(item);
  }
}

// Hide suggestions when clicking outside
document.addEventListener("click", (e) => {
  if (!els.query.parentElement.contains(e.target)) {
    els.suggestions.hidden = true;
  }
});

function saveWorklist() {
  lists[listName] = worklist;
  localStorage.setItem(WORKLIST_KEY, JSON.stringify(worklist));
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  localStorage.setItem(LIST_NAME_KEY, listName);
}

function useList(name) {
  listName = name;
  worklist = lists[name] || [];
  saveWorklist();
  renderWorklist();
  updateListButton();
  render(els.query.value);
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
  addToSuggestionHistory(clean);
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

function flatten(index, old = false) {
  const bySection = pageSections(index);
  const flat = [];
  for (const article of index.articles) {
    for (const hit of article.hits) {
      flat.push({
        code: article.code,
        name: article.name,
        ro: article.ro,
        old,
        haystack: normalise(
          `${article.name} ${article.ro} ${bySection.get(hit.page) || ""} ${
            old ? OLD_LABEL : ""
          }`,
        ),
        ...hit,
      });
    }
  }
  return flat;
}

// articles kept from the previous catalog edition live in data/old
function assets(hit) {
  return hit.old ? "data/old/" : "data/";
}

function thumbUrl(hit) {
  return `${assets(hit)}thumbs/${hit.thumb}`;
}

function pageUrl(hit) {
  return `${assets(hit)}pages/${String(hit.page).padStart(3, "0")}.webp`;
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
      const fresh = Number(Boolean(a.old)) - Number(Boolean(b.old));
      if (fresh) return fresh;
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
  return `${hit.code}|${hit.page}${hit.old ? "|v" : ""}`;
}

function label(hit) {
  const parts = [hit.ro, hit.name].filter(Boolean);
  const text = parts.length ? parts.join(" · ") : hit.title || "";
  return hit.old ? `${text}${text ? " · " : ""}${OLD_LABEL}` : text;
}

function resultCard(hit) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "card";

  if (hit.thumb) {
    const img = document.createElement("img");
    img.src = thumbUrl(hit);
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
    .filter((hit) => !hit.old && pages.has(hit.page) && hit.heading)
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

// a list someone sent on WhatsApp, opened straight from the link
function renderShared() {
  const found = sharedList.map(hitByCode).filter(Boolean);
  const kind = sharedKind || "primit\u0103";
  els.shared.hidden = false;
  els.sharedTitle.textContent = sharedName
    ? `${sharedName} · ${kind} (${found.length})`
    : `List\u0103 ${kind} (${found.length})`;
  els.recent.hidden = true;
  els.favourites.hidden = true;
  els.history.hidden = true;
  els.depths.hidden = true;
  els.sections.hidden = true;
  els.status.textContent =
    sharedKind === "scanat\u0103"
      ? `Am g\u0103sit ${found.length} articole pe dispozi\u021bie \u2014 verific\u0103 lista`
      : `Ai primit ${found.length} articole`;
  els.results.append(...found.map(resultCard));
}

function render(term) {
  els.results.replaceChildren();
  els.shared.hidden = true;
  if (!term.trim()) {
    renderDepths();
    renderSections();
    renderWorklist();
    if (sharedList.length) {
      renderShared();
      return;
    }
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
  els.depths.hidden = true;
els.sections.hidden = true;
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
  {
    file: "trimite.gif",
    name: "Trimite lista",
    text: "Adaugi articolele cu ＋, apeși „trimite” și alegi WhatsApp. Cine deschide linkul vede „Listă primită” cu desenele și o poate salva la el cu „salvează la mine”.",
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
  const names = Object.keys(lists);
  els.worklist.hidden = worklist.length === 0 && names.length < 2;
  els.worklistTitle.textContent = `${listName} (${worklist.length})`;
  els.worklistDrop.hidden = names.length < 2;
  els.listNames.replaceChildren();
  if (names.length > 1) {
    for (const name of names) {
      els.listNames.append(
        chip(`${name} (${lists[name].length})`, name === listName, () =>
          useList(name),
        ),
      );
    }
  }
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
  const link = `${location.origin}${location.pathname}?lista=${worklist.join(",")}`;
  const lines = worklist.map((code) => {
    const hit = hitByCode(code);
    const name = hit ? label(hit) : "";
    const page = hit ? ` · pagina ${hit.page}` : "";
    return `${code}${name ? ` · ${name}` : ""}${page}`;
  });
  return `${listName}:\n${lines.join("\n")}\n${link}&nume=${encodeURIComponent(listName)}`;
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
      img.src = thumbUrl(hit);
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
      item.page === hit.page &&
      Boolean(item.old) === Boolean(hit.old) &&
      !seen.has(item.code) &&
      seen.add(item.code),
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
      ? [[pageUrl(current), `pagina-${current.page}.webp`]]
      : [];
    if (current.thumb) {
      sources.unshift([thumbUrl(current), `${current.code}.webp`]);
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
  els.viewerTitle.textContent = `${hit.code} · pagina ${hit.page}${
    hit.old ? ` · ${OLD_LABEL}` : ""
  }`;
  els.favourite.textContent = favourites.has(keyOf(hit)) ? "★" : "☆";
  els.note.value = notes[hit.code] || "";
  updateListButton();
  els.pageImage.src = pageUrl(hit);
  els.pageImage.alt = `Pagina ${hit.page}`;
  renderNeighbours(hit);
  if (!els.viewer.open) els.viewer.showModal();
  els.pageImage.onload = () => {
    naturalWidth = els.pageImage.naturalWidth;
    if (zoomMode === "article" && current.x !== undefined) {
      zoom = 1;
      applyZoom();
      scrollToMarker();
    } else {
      fitPage();
      scrollToMarker();
    }
  };
}

// the whole sheet on the screen, so nothing has to be zoomed out by hand
function fitPage() {
  const ratio = els.pageImage.naturalHeight / naturalWidth || 1;
  zoom = Math.min(
    els.stage.clientWidth / naturalWidth,
    els.stage.clientHeight / (naturalWidth * ratio),
  );
  applyZoom();
  els.stage.scrollTo({ left: 0, top: 0 });
}

function setZoomMode(mode) {
  zoomMode = mode;
  localStorage.setItem(ZOOM_KEY, mode);
  els.zoomMode.textContent =
    mode === "page" ? "\ud83d\udd0e Articol" : "\u25a1 Pagina";
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
    // without a camera the sheet can still be read from a photo
    stream = null;
    els.scanStatus.textContent =
      "Camera nu este disponibilă — folosește 📄 Dispoziție";
    els.scanTorch.hidden = true;
    els.scanner.showModal();
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

function updateProgress(progress) {
  if (els.progressBar && els.progressBarFill) {
    els.progressBar.hidden = false;
    els.progressBarFill.style.width = `${progress}%`;
  }
}

function hideProgress() {
  if (els.progressBar) {
    els.progressBar.hidden = true;
  }
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

// article numbers on a picking list: extract first 4 digits (GEALAN catalog code)
// More permissive regex: match any text containing 4+ consecutive digits
const SHEET_CODE_RE = /\d{4,}/;
// the codes sit in the left column; quantities and stock live further right
const SHEET_COLUMN = 0.45;
const SHEET_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.,-/QRGX";
// multiple readings with different settings to catch codes from various distances
const SHEET_PASSES = [
  { width: 1900, mode: "6", contrast: 1.8 },
  { width: 2800, mode: "11", contrast: 2.0 },
  { width: 3200, mode: "6", contrast: 2.5 },
  { width: 3800, mode: "11", contrast: 3.0 },
  { width: 4500, mode: "6", contrast: 3.5 },
  { width: 5000, mode: "11", contrast: 4.0 },
];

// the first four digits of an article number are the catalog code
function sheetCodes(words, width, found) {
  for (const word of words) {
    const text = word.text.trim();
    
    // Skip if outside column
    if (word.bbox.x0 / width > SHEET_COLUMN) {
      continue;
    }
    
    // Extract all digits from the recognized text
    const digits = text.replace(/\D/g, '');
    
    // Check if we have at least 4 digits
    if (digits.length >= 4) {
      const code = digits.slice(0, 4);
      
      if (hitByCode(code) && !found.includes(code)) {
        found.push(code);
      }
    }
  }
}

function sheetCanvas(bitmap, target, contrast = 1.6) {
  const scale = target / bitmap.width;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  
  // Enhanced preprocessing with multiple filters
  context.filter = `grayscale(1) contrast(${contrast}) brightness(1.1) saturate(1.2)`;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  
  return canvas;
}

// the sheet can be read from the scanner or straight from the main screen
function sheetStatus(text) {
  if (els.scanner.open) els.scanStatus.textContent = text;
  els.sheetStatus.hidden = false;
  els.sheetStatus.textContent = text;
}

async function readSheet(file) {
  scanning = false;
  sheetStatus("Citesc dispozi\u021bia\u2026 dureaz\u0103 ~60 de secunde");
  try {
    // Validate file
    if (!file) {
      sheetStatus("Eroare: Niciun fișier selectat");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      sheetStatus("Eroare: Poza e prea mare (max 10MB)");
      return;
    }

    if (!file.type.startsWith('image/')) {
      sheetStatus("Eroare: Fișierul nu este o imagine (selectează JPG, PNG, WEBP)");
      return;
    }

    const bitmap = await createImageBitmap(file);
    const worker = await getRecogniser();
    await worker.setParameters({ tessedit_char_whitelist: SHEET_CHARS });
    const found = [];
    const totalPasses = SHEET_PASSES.length;
    sheetStatus("Inițiez scanarea...");
    updateProgress(5);

    for (let i = 0; i < SHEET_PASSES.length; i++) {
      const pass = SHEET_PASSES[i];
      const progress = Math.round(((i + 1) / totalPasses) * 100);
      sheetStatus(`Scanare ${i + 1}/${totalPasses} (${progress}%)…`);
      updateProgress(progress);
      const canvas = sheetCanvas(bitmap, pass.width, pass.contrast);
      await worker.setParameters({ tessedit_pageseg_mode: pass.mode });
      const result = await worker.recognize(canvas);
      sheetCodes(result.data.words || [], canvas.width, found);
      sheetStatus(`Scanare ${i + 1}/${totalPasses} (${progress}%) - Am găsit ${found.length} articole…`);
    }
    
    hideProgress();
    
    await worker.setParameters({ tessedit_char_whitelist: "0123456789" });
    
    if (!found.length) {
      sheetStatus(
        "Nu am găsit coduri — sfaturi: fotografiază mai de aproape, asigură-te că poza e clară, cu lumină bună, și că coloana Articol e vizibilă",
      );
      return;
    }
    closeScanner();
    els.sheetStatus.hidden = true;
    sharedList = found;
    sharedName = "Dispoziție";
    sharedKind = "scanată";
    els.query.value = "";
    render("");
  } catch (error) {
    console.error('Sheet scan error:', error);
    sheetStatus(`Eroare: ${error.message || 'Poza nu a putut fi citită'} — încearcă cu o altă poza sau verifică formatul (JPG, PNG)`);
  }
}

// keeps reading frames until a catalog code shows up, so nothing has to be timed
async function scanLoop() {
  if (scanning || !stream) return;
  scanning = true;
  els.scanStatus.textContent = "Inițiez camera...";
  updateProgress(10);
  await new Promise((resolve) => setTimeout(resolve, 500));
  
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
        hideProgress();
        return;
      }
      const progress = Math.min(10 + (round * 5), 90);
      updateProgress(progress);
      els.scanStatus.textContent = seen
        ? `Am citit ${seen}, dar nu e în catalog (încercare ${round + 1})`
        : `Caut codul… (încercare ${round + 1}) ține telefonul nemișcat`;
    } catch (error) {
      console.error('Scan loop error:', error);
      els.scanStatus.textContent = `Eroare: ${error.message || 'Scanarea nu a putut porni'} — verifică permisiunile pentru camera`;
      hideProgress();
      return;
    }
  }
}

els.query.addEventListener("input", () => {
  const term = els.query.value;
  renderSuggestions(term);
  render(term);
});
els.clear.addEventListener("click", () => {
  els.query.value = "";
  activeGroup = null;
  activeSection = null;
  els.suggestions.hidden = true;
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
els.zoomMode.addEventListener("click", () => {
  setZoomMode(zoomMode === "page" ? "article" : "page");
  if (zoomMode === "article") {
    zoom = 1;
    applyZoom();
    scrollToMarker();
  } else {
    fitPage();
  }
});
els.share.addEventListener("click", () => shareCurrent(false));
els.sharePage.addEventListener("click", () => shareCurrent(true));
els.theme.addEventListener("click", () =>
  applyTheme(
    document.documentElement.dataset.theme === "light" ? "dark" : "light",
  ),
);
els.lang.addEventListener("click", cycleLanguage);
els.scan.addEventListener("click", openScanner);
els.scanShot.addEventListener("click", scanLoop);
els.scanTorch.addEventListener("click", toggleTorch);
els.scanSheet.addEventListener("click", () => els.sheetFile.click());
els.sheetScan.addEventListener("click", () => els.sheetFile.click());
els.sheetFile.addEventListener("change", () => {
  const file = els.sheetFile.files?.[0];
  els.sheetFile.value = "";
  if (file) readSheet(file);
});
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
els.sharedSave.addEventListener("click", () => {
  const known = sharedList.filter(hitByCode);
  // a received list keeps its name, so it does not mix with the current job
  if (sharedName && sharedName !== listName) {
    lists[sharedName] = [...new Set([...(lists[sharedName] || []), ...known])];
    listName = sharedName;
    worklist = lists[sharedName];
  } else {
    worklist = [...new Set([...worklist, ...known])];
  }
  saveWorklist();
  closeShared();
});
els.worklistNew.addEventListener("click", () => {
  const name = (
    prompt("Numele listei noi (ex. șantier Ploiești):") || ""
  ).trim();
  if (!name) return;
  if (!lists[name]) lists[name] = [];
  useList(name);
});
els.worklistDrop.addEventListener("click", () => {
  const names = Object.keys(lists);
  if (names.length < 2) return;
  if (!confirm(`Ștergi lista „${listName}”?`)) return;
  delete lists[listName];
  useList(Object.keys(lists)[0]);
});
els.feedback.addEventListener("click", () => {
  els.guide.close();
  els.feedbackBox.showModal();
});
els.feedbackClose.addEventListener("click", () => els.feedbackBox.close());
els.sharedClose.addEventListener("click", closeShared);
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
els.recentClear.addEventListener("click", () => {
  lastOpened = "";
  localStorage.removeItem(LAST_KEY);
  renderRecent();
});
els.favouriteClear.addEventListener("click", () => {
  favourites.clear();
  saveFavourites();
  renderFavourites();
  if (current) els.favourite.textContent = "\u2606";
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
// Navigare cu tastatură
let selectedIndex = -1;

document.addEventListener("keydown", (e) => {
  if (els.viewer.open) {
    if (e.key === "Escape") {
      els.viewer.close();
    }
    return;
  }

  if (els.compare.open) {
    if (e.key === "Escape") {
      els.compare.close();
    }
    return;
  }

  if (els.guide.open) {
    if (e.key === "Escape") {
      els.guide.close();
    }
    return;
  }

  const results = els.results.querySelectorAll("li");
  if (!results.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
    updateSelection(results);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    updateSelection(results);
  } else if (e.key === "Enter" && selectedIndex >= 0) {
    const card = results[selectedIndex].querySelector(".card");
    if (card) card.click();
  }
});

function updateSelection(results) {
  results.forEach((li, index) => {
    const card = li.querySelector(".card");
    if (index === selectedIndex) {
      card.style.background = "var(--accent-soft)";
      card.style.borderColor = "var(--accent)";
    } else {
      card.style.background = "";
      card.style.borderColor = "";
    }
  });
}

els.query.addEventListener("input", () => {
  selectedIndex = -1;
});

// a small file the user can send to the new phone, so notes and list survive
function saveBackup() {
  const data = {
    app: "catalog",
    date: new Date().toISOString(),
    notes,
    worklist,
    lists,
    listName,
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
    if (data.lists && typeof data.lists === "object") {
      for (const [name, codes] of Object.entries(data.lists)) {
        if (!Array.isArray(codes)) continue;
        lists[name] = [...new Set([...(lists[name] || []), ...codes])];
      }
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

function closeShared() {
  sharedList = [];
  sharedName = "";
  sharedKind = "";
  window.history.replaceState(null, "", location.pathname);
  render("");
}

// the codes travel either as ?lista=... or #lista=..., depending on the chat app
function listFromLink(hash) {
  const raw =
    new URLSearchParams(location.search).get("lista") ||
    (hash.startsWith("lista=") ? hash.slice(6) : "");
  return raw
    .split(",")
    .map((code) => code.trim())
    .filter((code) => /^\d+$/.test(code));
}

// the articles that disappeared from the current edition, if the archive exists
async function oldHits() {
  try {
    const response = await fetch("data/old/index.json");
    if (!response.ok) return [];
    return flatten(await response.json(), true);
  } catch (error) {
    return [];
  }
}

async function boot() {
  try {
    const response = await fetch("data/index.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const index = await response.json();
    hits = flatten(index);
    sections = index.sections || [];
    hits = hits.concat(await oldHits());

    const hash = decodeURIComponent(location.hash.replace("#", "")).trim();
    sharedList = listFromLink(hash);
    sharedName = (
      new URLSearchParams(location.search).get("nume") || ""
    ).trim();
    const shared = sharedList.length ? "" : hash;
    els.query.value = shared;
    render(shared);
    if (sharedList.length) return;
    if (!localStorage.getItem(GUIDE_KEY)) els.guide.showModal();
    else if (!shared) els.query.focus();
  } catch (error) {
    els.status.textContent = `Catalogul nu a putut fi încărcat: ${error.message}`;
  }
}

els.watermark.textContent = new Array(400).fill("aurelcirlan.ro").join(" ");

applyTheme(localStorage.getItem(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
setZoomMode(zoomMode);
updateLanguage();

// a small, self-dismissing banner reporting how the offline download is going
function offlineToast() {
  let el = document.getElementById("offlineToast");
  if (el) return el;
  el = document.createElement("div");
  el.id = "offlineToast";
  el.className = "offlineToast";
  el.hidden = true;
  document.body.appendChild(el);
  return el;
}

let offlineHideTimer = null;
function showOfflineToast(text, autoHide) {
  const el = offlineToast();
  el.textContent = text;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("shown"));
  clearTimeout(offlineHideTimer);
  if (autoHide) {
    offlineHideTimer = setTimeout(() => {
      el.classList.remove("shown");
      setTimeout(() => (el.hidden = true), 300);
    }, 2500);
  }
}

// a new release takes over on its own, so the phone never shows a stale version
if ("serviceWorker" in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "offline-progress") return;
    if (data.done < data.total) {
      const percent = Math.round((data.done / data.total) * 100);
      showOfflineToast(`Se pregătește catalogul pentru offline… ${percent}%`, false);
    } else {
      showOfflineToast("Catalog pregătit pentru utilizare offline ✓", true);
    }
  });
  navigator.serviceWorker.register("sw.js").then(
    (registration) => {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) registration.update();
      });
    },
    () => {},
  );
  // asks the worker to finish downloading the catalog if a previous
  // attempt was interrupted; near-instant once everything is cached
  navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage("ensure-offline");
  });
}

boot();
