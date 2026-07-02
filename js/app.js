// ============================================================
//  APP — Bootstrap dell'edizione Gotham Déco.
//  Sicurezza: frame-busting protetto da try/catch (una pagina
//  incorniciata in un iframe sandbox non deve rompere il boot),
//  nessun innerHTML con dati dinamici, storage sempre guardato.
// ============================================================

try {
  if (window.self !== window.top) {
    window.top.location.replace(window.self.location.href);
  }
} catch {
  /* iframe sandbox senza allow-top-navigation: si prosegue comunque */
}

import { initReader } from "./reader.js";
import { initMenu } from "./menu.js";
import { initThemeSong } from "./themesong.js";
import { initRoulette } from "./roulette.js";
import { initInstall } from "./pwa.js";
import { initIntro } from "./intro.js";

// ── Disclaimer multilingua (textContent only, niente markup) ─

const DISCLAIMERS = [
  { label: "Italiano", text: "Progetto fan-made no-profit a scopo di studio e passione personale. Personaggi, immagini e marchi appartengono ai rispettivi proprietari. Nessuna affiliazione o autorizzazione ufficiale." },
  { label: "English", text: "Non-profit fan-made project for personal study and passion. Characters, images and trademarks belong to their respective owners. No affiliation or official authorization." },
  { label: "Español", text: "Proyecto de fans sin ánimo de lucro, con fines de estudio y pasión personal. Los personajes, imágenes y marcas pertenecen a sus respectivos propietarios. Sin afiliación ni autorización oficial." },
  { label: "Français", text: "Projet de fans à but non lucratif, à des fins d'étude et de passion personnelle. Les personnages, images et marques appartiennent à leurs propriétaires respectifs. Aucune affiliation ni autorisation officielle." },
  { label: "Deutsch", text: "Nicht-kommerzielles Fan-Projekt zu Studien- und Leidenschaftszwecken. Charaktere, Bilder und Marken gehören ihren jeweiligen Eigentümern. Keine Zugehörigkeit oder offizielle Genehmigung." },
  { label: "Русский", text: "Некоммерческий фанатский проект для личного изучения. Персонажи, изображения и товарные знаки принадлежат их владельцам. Без аффилиации и официального разрешения." },
  { label: "العربية", text: "مشروع من إنشاء المعجبين غير ربحي لأغراض الدراسة والشغف الشخصي. الشخصيات والصور والعلامات التجارية ملك لأصحابها. لا يوجد أي ارتباط أو ترخيص رسمي.", rtl: true },
  { label: "中文", text: "非营利粉丝项目，仅供个人学习与兴趣。角色、图像和商标均归各自所有者所有。无任何官方关联或授权。" },
  { label: "日本語", text: "非営利のファン制作・個人的な学習と情熱のためのプロジェクトです。キャラクター・画像・商標は各権利者に帰属します。公式とは一切関係ありません。" }
];

function setupDisclaimer() {
  const select = document.getElementById("lang-select");
  const target = document.getElementById("disclaimer-text");
  if (!select || !target) return;

  const def = document.createElement("option");
  def.value = "";
  def.textContent = "🌐 Lingua avviso…";
  select.appendChild(def);

  DISCLAIMERS.forEach((entry, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = entry.label;
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    if (select.value === "") return;
    const entry = DISCLAIMERS[Number(select.value)];
    if (!entry) return;
    target.textContent = entry.text;
    if (entry.rtl) target.setAttribute("dir", "rtl");
    else target.removeAttribute("dir");
  });
}

// ── Rivelazione progressiva delle sezioni ────────────────────
//  Con JS attivo le sezioni entrano in scena in modo scaglionato;
//  senza JS restano semplicemente visibili (nessun contenuto perso).

function setupReveal() {
  document.documentElement.classList.add("js");
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.documentElement.classList.add("is-ready");
    });
  });
}

// ── Effetti ambientali ridotti quando serve ──────────────────
//  prefers-reduced-motion è gestito in CSS; qui spegniamo la
//  pioggia anche quando la scheda è in background (batteria).

function setupAmbientPause() {
  document.addEventListener("visibilitychange", () => {
    document.documentElement.classList.toggle("fx-paused", document.hidden);
  });
}

// ── Service worker / PWA installabile ────────────────────────
//  Stessa URL registrata dalle pagine secondarie (site-menu.js:
//  "./sw.js?v=12") → un solo scriptURL condiviso, niente
//  re-registrazioni/reload navigando tra home e sezioni. In
//  sviluppo (localhost) il worker viene disattivato per non
//  servire cache vecchia durante le modifiche.

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const isLocalDev =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "::1";

  try {
    if (isLocalDev) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
      return;
    }

    if (!window.isSecureContext) return;
    await navigator.serviceWorker.register("./sw.js?v=12", { updateViaCache: "none" });
  } catch (error) {
    console.warn("Service worker non registrato:", error);
  }
}

initIntro();
setupReveal();
setupDisclaimer();
setupAmbientPause();
initMenu();
initReader();
initThemeSong();
initRoulette();
initInstall();
registerServiceWorker();
