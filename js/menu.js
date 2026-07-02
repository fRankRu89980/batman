// ============================================================
//  MENU — Drawer di navigazione completo (tutte le pagine).
//  Accessibile: aria-expanded, inert quando chiuso, ESC per
//  chiudere, focus trap fra i link, ripristino del focus.
//  Su desktop il drawer è nascosto (la masthead-nav copre la
//  navigazione); su mobile è l'unico menu.
// ============================================================

export function initMenu() {
  const toggle = document.getElementById("hamburger-toggle");
  const drawer = document.getElementById("site-drawer");
  const overlay = document.getElementById("site-drawer-overlay");
  if (!toggle || !drawer || !overlay) return;

  const links = Array.from(drawer.querySelectorAll(".site-drawer-link"));
  let open = false;
  let lastFocus = null;

  // Nasconde le icone dei link che non si caricano (asset mancante).
  drawer.querySelectorAll(".site-drawer-link-icon").forEach(icon => {
    const hide = () => icon.classList.add("is-missing");
    if (icon.complete && icon.naturalWidth === 0) hide();
    else icon.addEventListener("error", hide, { once: true });
  });

  function openDrawer() {
    open = true;
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Chiudi menu principale");
    overlay.hidden = false;
    drawer.classList.add("is-open");
    drawer.removeAttribute("inert");
    drawer.removeAttribute("aria-hidden");
    document.body.classList.add("drawer-open");
    if (links[0] && typeof links[0].focus === "function") links[0].focus();
  }

  function closeDrawer() {
    open = false;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Apri menu principale");
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true;
    overlay.hidden = true;
    document.body.classList.remove("drawer-open");
    if (drawer.contains(document.activeElement)) {
      (lastFocus && typeof lastFocus.focus === "function" ? lastFocus : toggle).focus();
    }
  }

  toggle.addEventListener("click", () => (open ? closeDrawer() : openDrawer()));
  overlay.addEventListener("click", closeDrawer);
  links.forEach(link => link.addEventListener("click", closeDrawer));

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && open) { closeDrawer(); return; }
    if (event.key !== "Tab" || !open || links.length === 0) return;

    // Focus trap: mantiene il tab fra i link del drawer.
    const first = links[0];
    const last = links[links.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}
