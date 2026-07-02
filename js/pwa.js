// ============================================================
//  PWA — Pulsante "Installa App" + istruzioni iOS.
//  Su Chrome/Android usa il prompt nativo (beforeinstallprompt);
//  su iOS (nessun prompt) mostra le istruzioni "Aggiungi alla Home".
//  La registrazione del service worker è in app.js.
// ============================================================

const DISMISS_KEY = "comic-reader-deco:install-dismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIos() {
  const ua = window.navigator.userAgent;
  const touchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/i.test(ua) || touchMac;
}

function installDismissed() {
  try { return window.localStorage.getItem(DISMISS_KEY) === "1"; }
  catch { return false; }
}

export function initInstall() {
  const button = document.getElementById("install-app-btn");
  const modal = document.getElementById("ios-install-modal");
  if (!button || !modal) return;

  const closeBtn = document.getElementById("ios-install-close");
  const dismissBtn = document.getElementById("ios-install-dismiss");

  let deferredPrompt = null;
  let promptInFlight = false;
  let lastFocus = null;

  function showButton(label) {
    if (isStandalone() || installDismissed()) return;
    button.textContent = label;
    button.setAttribute("aria-label", label);
    button.hidden = false;
  }

  function hideAll() {
    button.hidden = true;
    closeModal();
  }

  function openModal() {
    if (isStandalone()) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    const card = modal.querySelector(".install-modal-card");
    if (card && typeof card.focus === "function") card.focus();
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    promptInFlight = false;
    showButton("Installa App");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hideAll();
  });

  button.addEventListener("click", async () => {
    if (deferredPrompt) {
      if (promptInFlight) return;
      promptInFlight = true;
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        hideAll();
      } catch (error) {
        console.warn("Prompt di installazione non completato:", error);
        if (!isStandalone()) hideAll();
      } finally {
        deferredPrompt = null;
        promptInFlight = false;
      }
      return;
    }

    if (isIos() && !isStandalone()) openModal();
  });

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* no-op */ }
      hideAll();
    });
  }

  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });

  if (isStandalone()) { hideAll(); return; }
  if (isIos() && !installDismissed()) showButton("Aggiungi alla Home");
}
