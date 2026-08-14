// ============================================================
//  READER — Rendering a tre layer, page-flip 3D, gesti unificati
//  (Pointer Events: mouse + touch + penna), zoom, progresso.
//  Tutte le animazioni usano solo transform/opacity (GPU-safe);
//  le variabili CSS sono impostate via CSSOM (compatibile con la
//  CSP rigida: nessun attributo style inline nell'HTML).
// ============================================================

import {
  VOLUMES, PAGES, VOLUME_STARTS, TOTAL_PAGES,
  volumeForPage, storageGet, storageSet
} from "./data.js";

const LAST_PAGE_KEY = "last-page";
const ZOOM_KEY = "zoom";
const SWIPE_TRIGGER_RATIO = 0.22;
const FLIP_MS = 340;

const els = {
  stage: document.getElementById("stage"),
  imgPrev: document.getElementById("img-prev"),
  imgCurrent: document.getElementById("img-current"),
  imgNext: document.getElementById("img-next"),
  chip: document.getElementById("reader-chip"),
  volTitle: document.getElementById("reader-vol-title"),
  status: document.getElementById("reader-status"),
  counter: document.getElementById("page-counter"),
  progress: document.getElementById("progress"),
  progressFill: document.getElementById("progress-fill"),
  btnPrev: document.getElementById("btn-prev"),
  btnNext: document.getElementById("btn-next"),
  jumpInput: document.getElementById("jump-input"),
  jumpBtn: document.getElementById("jump-btn"),
  zoomRange: document.getElementById("zoom-range"),
  zoomOutput: document.getElementById("zoom-output"),
  zoomReset: document.getElementById("zoom-reset")
};

const state = {
  page: 0,
  renderToken: 0,
  animating: false
};

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Utility CSS var sullo stage ──────────────────────────────

function setStageVar(name, value) {
  els.stage.style.setProperty(name, value);
}

function setStageTransition(enabled) {
  els.stage.classList.toggle("is-animated", enabled);
}

function setDrag(deltaX) {
  const width = els.stage.getBoundingClientRect().width || 1;
  const progress = Math.max(-1, Math.min(deltaX / width, 1));
  setStageVar("--drag-x", `${deltaX}px`);
  setStageVar("--drag-p", `${progress}`);
}

// ── Stato UI (contatore, chip, progresso, bottoni) ───────────

function updateStatus(message) {
  if (els.status) els.status.textContent = message;
}

function updateChrome() {
  const pageNumber = state.page + 1;
  const volume = VOLUMES[volumeForPage(state.page)];

  els.chip.textContent = volume.code;
  els.volTitle.textContent = volume.name;
  els.counter.textContent = `Tavola ${pageNumber} di ${TOTAL_PAGES}`;
  els.btnPrev.disabled = state.page === 0;
  els.btnNext.disabled = state.page === TOTAL_PAGES - 1;
  els.progressFill.style.setProperty(
    "--progress",
    `${(pageNumber / TOTAL_PAGES) * 100}%`
  );
  updateStatus(`Pagina ${pageNumber} di ${TOTAL_PAGES} — ${volume.code}, ${volume.name}`);
}

// Tacche dei volumi sulla barra di progresso (posizioni derivate).
function buildProgressMarkers() {
  VOLUME_STARTS.forEach((start, i) => {
    if (i === 0) return;
    const marker = document.createElement("i");
    marker.className = "progress-marker";
    marker.style.setProperty("--at", `${(start / TOTAL_PAGES) * 100}%`);
    els.progress.appendChild(marker);
  });
}

// ── Rendering dei layer ──────────────────────────────────────

function renderLayer(img, index, token, isCurrent) {
  const entry = index >= 0 && index < TOTAL_PAGES ? PAGES[index] : null;
  if (!entry) {
    img.removeAttribute("src");
    img.parentElement.classList.add("is-empty");
    return;
  }

  img.parentElement.classList.remove("is-empty");
  const preload = new Image();
  preload.onload = () => {
    if (token !== state.renderToken) return;
    img.src = entry.src;
    if (isCurrent && preload.naturalWidth > 0 && preload.naturalHeight > 0) {
      setStageVar("--page-ar", `${preload.naturalWidth / preload.naturalHeight}`);
    }
  };
  preload.onerror = () => {
    if (token !== state.renderToken) return;
    img.removeAttribute("src");
    img.parentElement.classList.add("is-empty");
    if (isCurrent) updateStatus(`Immagine non trovata: ${entry.src}`);
  };
  preload.src = entry.src;
}

function renderPages() {
  const token = ++state.renderToken;
  renderLayer(els.imgCurrent, state.page, token, true);
  renderLayer(els.imgPrev, state.page - 1, token, false);
  renderLayer(els.imgNext, state.page + 1, token, false);
  setStageTransition(false);
  setDrag(0);
}

export function goToPage(index, { animate = false, direction = 0 } = {}) {
  const target = Math.max(0, Math.min(index, TOTAL_PAGES - 1));
  if (target === state.page && els.imgCurrent.getAttribute("src")) return;

  const finalize = () => {
    state.page = target;
    storageSet(LAST_PAGE_KEY, String(target));
    updateChrome();
    renderPages();
    state.animating = false;
  };

  if (animate && direction !== 0 && !prefersReducedMotion() && !state.animating) {
    state.animating = true;
    const width = els.stage.getBoundingClientRect().width || 0;
    setStageTransition(true);
    setDrag(direction > 0 ? -width : width);
    window.setTimeout(finalize, FLIP_MS);
    return;
  }

  finalize();
}

function nextPage(animate = true) {
  if (state.page >= TOTAL_PAGES - 1) return;
  goToPage(state.page + 1, { animate, direction: 1 });
}

function prevPage(animate = true) {
  if (state.page <= 0) return;
  goToPage(state.page - 1, { animate, direction: -1 });
}

// ── Gesti: Pointer Events unificati ─────────────────────────

function setupGestures() {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let mode = null; // "drag" | "scroll"
  let pendingFrame = false;

  const INTENT = 12;

  function endGesture(commit) {
    if (pointerId === null) return;
    pointerId = null;
    els.stage.classList.remove("is-dragging");

    const deltaX = lastX - startX;
    const width = els.stage.getBoundingClientRect().width || 1;
    const beyondEdge =
      (state.page === 0 && deltaX > 0) ||
      (state.page === TOTAL_PAGES - 1 && deltaX < 0);

    if (commit && mode === "drag" && !beyondEdge &&
        Math.abs(deltaX) >= width * SWIPE_TRIGGER_RATIO) {
      if (deltaX < 0) nextPage(true);
      else prevPage(true);
    } else {
      setStageTransition(true);
      setDrag(0);
    }
    mode = null;
  }

  els.stage.addEventListener("pointerdown", event => {
    if (state.animating || pointerId !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerId = event.pointerId;
    startX = lastX = event.clientX;
    startY = event.clientY;
    mode = null;
    setStageTransition(false);
  });

  els.stage.addEventListener("pointermove", event => {
    if (event.pointerId !== pointerId) return;
    lastX = event.clientX;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (!mode) {
      if (Math.abs(deltaX) < INTENT && Math.abs(deltaY) < INTENT) return;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        mode = "drag";
        els.stage.classList.add("is-dragging");
        try { els.stage.setPointerCapture(pointerId); } catch { /* no-op */ }
      } else {
        mode = "scroll"; // lasciamo scorrere la pagina verticalmente
        pointerId = null;
        return;
      }
    }

    if (mode === "drag" && !pendingFrame) {
      pendingFrame = true;
      const frameDelta = deltaX;
      window.requestAnimationFrame(() => {
        pendingFrame = false;
        if (mode !== "drag") return;
        const beyondEdge =
          (state.page === 0 && frameDelta > 0) ||
          (state.page === TOTAL_PAGES - 1 && frameDelta < 0);
        setDrag(beyondEdge ? frameDelta * 0.3 : frameDelta);
      });
    }
  });

  els.stage.addEventListener("pointerup", event => {
    if (event.pointerId !== pointerId) return;
    endGesture(true);
  });

  els.stage.addEventListener("pointercancel", event => {
    if (event.pointerId !== pointerId) return;
    endGesture(false);
  });
}

// ── Zoom ─────────────────────────────────────────────────────

function applyZoom(value) {
  const clamped = Math.max(60, Math.min(140, value));
  document.documentElement.style.setProperty("--reader-zoom", `${clamped / 100}`);
  els.zoomRange.value = String(clamped);
  els.zoomOutput.textContent = `${clamped}%`;
  storageSet(ZOOM_KEY, String(clamped));
}

function setupZoom() {
  const saved = Number(storageGet(ZOOM_KEY));
  applyZoom(Number.isFinite(saved) && saved > 0 ? saved : 100);

  els.zoomRange.addEventListener("input", () => {
    applyZoom(Number(els.zoomRange.value));
  });
  els.zoomReset.addEventListener("click", () => applyZoom(100));
}

// ── Navigazione: bottoni, salto pagina, tastiera ─────────────

function setupControls() {
  els.btnPrev.addEventListener("click", () => prevPage(true));
  els.btnNext.addEventListener("click", () => nextPage(true));

  function jump() {
    const page = Number.parseInt(els.jumpInput.value, 10);
    if (Number.isInteger(page) && page >= 1 && page <= TOTAL_PAGES) {
      goToPage(page - 1);
      els.jumpInput.value = "";
    } else {
      updateStatus(`Inserisci una pagina tra 1 e ${TOTAL_PAGES}.`);
    }
  }

  els.jumpBtn.addEventListener("click", jump);
  els.jumpInput.addEventListener("keydown", event => {
    if (event.key === "Enter") jump();
  });

  document.addEventListener("keydown", event => {
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "SELECT")) return;
    if (event.key === "ArrowRight") nextPage(true);
    if (event.key === "ArrowLeft") prevPage(true);
  });
}

// ── Scaffale volumi + ripresa lettura ────────────────────────

function requestedVolumeFromUrl() {
  const requested = new URLSearchParams(window.location.search)
    .get("season")
    ?.trim()
    .toUpperCase();

  if (!requested) return -1;
  return VOLUMES.findIndex(volume => volume.short === requested);
}

function setupShelf() {
  const savedPage = Number.parseInt(storageGet(LAST_PAGE_KEY) ?? "", 10);
  const hasSaved = Number.isInteger(savedPage) && savedPage > 0 && savedPage < TOTAL_PAGES;
  const requestedVolume = requestedVolumeFromUrl();

  if (hasSaved) {
    const savedVolume = volumeForPage(savedPage);
    const badge = document.querySelector(`.tome-resume[data-resume="${savedVolume}"]`);
    if (badge) {
      badge.textContent = `Riprendi da tavola ${savedPage + 1}`;
      badge.hidden = false;
    }
  }

  document.querySelectorAll(".tome-open").forEach(button => {
    button.addEventListener("click", () => {
      const volumeIndex = Number.parseInt(button.dataset.volume, 10);
      if (!Number.isInteger(volumeIndex) || volumeIndex < 0 || volumeIndex >= VOLUME_STARTS.length) {
        return;
      }

      const start = VOLUME_STARTS[volumeIndex];
      const resumeHere = hasSaved && volumeForPage(savedPage) === volumeIndex;
      goToPage(resumeHere ? savedPage : start);

      document.getElementById("reader")?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start"
      });
    });
  });

  return {
    page: requestedVolume >= 0
      ? VOLUME_STARTS[requestedVolume]
      : (hasSaved ? savedPage : 0),
    scrollToReader: requestedVolume >= 0
  };
}

// ── Avvio ────────────────────────────────────────────────────

export function initReader() {
  if (!els.stage || !els.imgCurrent) return;

  buildProgressMarkers();
  setupGestures();
  setupZoom();
  setupControls();

  const initial = setupShelf();
  goToPage(initial.page);

  if (initial.scrollToReader) {
    window.requestAnimationFrame(() => {
      document.getElementById("reader")?.scrollIntoView({
        behavior: "auto",
        block: "start"
      });
    });
  }
}
