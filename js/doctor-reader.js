import { DOCTOR_EPISODE } from "./doctor-data.js";

const PAGE_STORAGE_KEY = "comic-reader-deco:doctor:last-page";
const ZOOM_STORAGE_KEY = "comic-reader-deco:doctor:zoom";
const FLIP_MS = 340;
const SWIPE_TRIGGER_RATIO = 0.2;

const root = document.getElementById("doctor-reader");

if (root) initializeDoctorReader(root);

function initializeDoctorReader(readerRoot) {
  const elements = {
    stage: readerRoot.querySelector("#doctor-stage"),
    imgPrev: readerRoot.querySelector("#doctor-img-prev"),
    imgCurrent: readerRoot.querySelector("#doctor-img-current"),
    imgNext: readerRoot.querySelector("#doctor-img-next"),
    previous: readerRoot.querySelector("#doctor-prev"),
    next: readerRoot.querySelector("#doctor-next"),
    status: readerRoot.querySelector("#doctor-reader-status"),
    counter: readerRoot.querySelector("#doctor-counter"),
    progressFill: readerRoot.querySelector("#doctor-progress-fill"),
    jumpInput: readerRoot.querySelector("#doctor-jump-input"),
    jumpButton: readerRoot.querySelector("#doctor-jump-button"),
    zoomRange: readerRoot.querySelector("#doctor-zoom-range"),
    zoomOutput: readerRoot.querySelector("#doctor-zoom-output"),
    zoomReset: readerRoot.querySelector("#doctor-zoom-reset")
  };

  const totalPages = DOCTOR_EPISODE.pages.length;
  const missingElement = Object.values(elements).some(element => !element);

  if (totalPages === 0 || missingElement) {
    if (elements.status) {
      elements.status.textContent = "Il lettore non è disponibile.";
    }
    return;
  }

  const state = {
    page: -1,
    renderToken: 0,
    animating: false
  };

  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* La persistenza è facoltativa: il reader resta utilizzabile. */
    }
  }

  function readSavedPage() {
    const saved = Number.parseInt(readStorage(PAGE_STORAGE_KEY) ?? "", 10);
    return Number.isInteger(saved) && saved >= 0 && saved < totalPages ? saved : 0;
  }

  function setStatus(message) {
    elements.status.textContent = message;
  }

  function setDrag(deltaX) {
    const width = elements.stage.getBoundingClientRect().width || 1;
    const progress = Math.max(-1, Math.min(deltaX / width, 1));
    elements.stage.style.setProperty("--drag-x", `${deltaX}px`);
    elements.stage.style.setProperty("--drag-p", `${progress}`);
  }

  function setAnimated(enabled) {
    elements.stage.classList.toggle("is-animated", enabled);
  }

  function renderLayer(image, index, token, isCurrent = false) {
    const entry = DOCTOR_EPISODE.pages[index];
    const layer = image.parentElement;

    if (!entry) {
      image.removeAttribute("src");
      image.alt = "";
      layer.classList.add("is-empty");
      return;
    }

    layer.classList.remove("is-empty");
    image.removeAttribute("src");
    image.alt = isCurrent ? entry.alt : "";
    const preload = new Image();

    preload.addEventListener("load", () => {
      if (token !== state.renderToken) return;

      image.src = entry.src;
      image.alt = isCurrent ? entry.alt : "";

      if (isCurrent && preload.naturalWidth > 0 && preload.naturalHeight > 0) {
        elements.stage.style.setProperty(
          "--page-ar",
          `${preload.naturalWidth / preload.naturalHeight}`
        );
      }
    }, { once: true });

    preload.addEventListener("error", () => {
      if (token !== state.renderToken) return;
      image.removeAttribute("src");
      image.alt = "";
      layer.classList.add("is-empty");
      if (isCurrent) setStatus(`Tavola non disponibile: ${entry.src}`);
    }, { once: true });

    preload.src = entry.src;
  }

  function renderPages() {
    const token = ++state.renderToken;
    renderLayer(elements.imgPrev, state.page - 1, token);
    renderLayer(elements.imgCurrent, state.page, token, true);
    renderLayer(elements.imgNext, state.page + 1, token);
    setAnimated(false);
    setDrag(0);
  }

  function updateChrome() {
    const pageNumber = state.page + 1;
    const entry = DOCTOR_EPISODE.pages[state.page];

    if (entry.width > 0 && entry.height > 0) {
      elements.stage.style.setProperty("--page-ar", `${entry.width / entry.height}`);
    }

    elements.previous.disabled = state.page === 0;
    elements.next.disabled = state.page === totalPages - 1;
    elements.counter.textContent = `Tavola ${pageNumber} di ${totalPages}`;
    elements.progressFill.style.setProperty(
      "--progress",
      `${(pageNumber / totalPages) * 100}%`
    );
    elements.jumpInput.max = String(totalPages);
    elements.stage.setAttribute("aria-label", `Tavola ${pageNumber} di ${totalPages}`);
    setStatus(`Tavola ${pageNumber} di ${totalPages} — ${DOCTOR_EPISODE.title}`);
  }

  function goToPage(index, { animate = false, direction = 0 } = {}) {
    if (state.animating) return;

    const target = Math.max(0, Math.min(index, totalPages - 1));
    if (target === state.page) {
      updateChrome();
      return;
    }

    const finalize = () => {
      state.page = target;
      writeStorage(PAGE_STORAGE_KEY, String(target));
      updateChrome();
      renderPages();
      state.animating = false;
    };

    if (animate && direction !== 0 && !prefersReducedMotion()) {
      state.animating = true;
      const width = elements.stage.getBoundingClientRect().width || 1;
      setAnimated(true);
      setDrag(direction > 0 ? -width : width);
      window.setTimeout(finalize, FLIP_MS);
      return;
    }

    finalize();
  }

  function nextPage(animate = true) {
    if (state.page < totalPages - 1) {
      goToPage(state.page + 1, { animate, direction: 1 });
    }
  }

  function previousPage(animate = true) {
    if (state.page > 0) {
      goToPage(state.page - 1, { animate, direction: -1 });
    }
  }

  function applyZoom(value) {
    const clamped = Math.max(60, Math.min(140, value));
    readerRoot.style.setProperty("--reader-zoom", `${clamped / 100}`);
    elements.zoomRange.value = String(clamped);
    elements.zoomOutput.textContent = `${clamped}%`;
    writeStorage(ZOOM_STORAGE_KEY, String(clamped));
  }

  function setupZoom() {
    const saved = Number(readStorage(ZOOM_STORAGE_KEY));
    applyZoom(Number.isFinite(saved) && saved > 0 ? saved : 100);

    elements.zoomRange.addEventListener("input", () => {
      applyZoom(Number(elements.zoomRange.value));
    });
    elements.zoomReset.addEventListener("click", () => applyZoom(100));
  }

  function setupControls() {
    elements.previous.addEventListener("click", () => previousPage(true));
    elements.next.addEventListener("click", () => nextPage(true));

    const jump = () => {
      const requested = Number.parseInt(elements.jumpInput.value, 10);
      if (Number.isInteger(requested) && requested >= 1 && requested <= totalPages) {
        goToPage(requested - 1);
        elements.jumpInput.value = "";
        return;
      }

      setStatus(`Inserisci una tavola tra 1 e ${totalPages}.`);
    };

    elements.jumpButton.addEventListener("click", jump);
    elements.jumpInput.addEventListener("keydown", event => {
      if (event.key === "Enter") jump();
    });

    readerRoot.addEventListener("keydown", event => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("input, select, textarea, button, a, [contenteditable='true']")
      ) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextPage(true);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousPage(true);
      } else if (event.key === "Home") {
        event.preventDefault();
        goToPage(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToPage(totalPages - 1);
      }
    });
  }

  function setupGestures() {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let mode = null;
    let pendingFrame = false;
    const intentThreshold = 12;

    function finishGesture(commit) {
      if (pointerId === null) return;

      pointerId = null;
      elements.stage.classList.remove("is-dragging");
      const deltaX = lastX - startX;
      const width = elements.stage.getBoundingClientRect().width || 1;
      const beyondEdge =
        (state.page === 0 && deltaX > 0) ||
        (state.page === totalPages - 1 && deltaX < 0);

      if (
        commit &&
        mode === "drag" &&
        !beyondEdge &&
        Math.abs(deltaX) >= width * SWIPE_TRIGGER_RATIO
      ) {
        if (deltaX < 0) nextPage(true);
        else previousPage(true);
      } else {
        setAnimated(true);
        setDrag(0);
      }

      mode = null;
    }

    elements.stage.addEventListener("pointerdown", event => {
      if (state.animating || pointerId !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      pointerId = event.pointerId;
      startX = lastX = event.clientX;
      startY = event.clientY;
      mode = null;
      setAnimated(false);
    });

    elements.stage.addEventListener("pointermove", event => {
      if (event.pointerId !== pointerId) return;

      lastX = event.clientX;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      if (!mode) {
        if (Math.abs(deltaX) < intentThreshold && Math.abs(deltaY) < intentThreshold) return;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          mode = "drag";
          elements.stage.classList.add("is-dragging");
          try {
            elements.stage.setPointerCapture(pointerId);
          } catch {
            /* Il gesto continua anche senza pointer capture. */
          }
        } else {
          mode = "scroll";
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
            (state.page === totalPages - 1 && frameDelta < 0);
          setDrag(beyondEdge ? frameDelta * 0.3 : frameDelta);
        });
      }
    });

    elements.stage.addEventListener("pointerup", event => {
      if (event.pointerId === pointerId) finishGesture(true);
    });

    elements.stage.addEventListener("pointercancel", event => {
      if (event.pointerId === pointerId) finishGesture(false);
    });

    elements.stage.addEventListener("lostpointercapture", event => {
      if (event.pointerId === pointerId) finishGesture(false);
    });

    window.addEventListener("pointerup", event => {
      if (event.pointerId === pointerId) finishGesture(true);
    });

    window.addEventListener("pointercancel", event => {
      if (event.pointerId === pointerId) finishGesture(false);
    });
  }

  setupZoom();
  setupControls();
  setupGestures();
  goToPage(readSavedPage());
}
