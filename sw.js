const CACHE_PREFIX = "comic-reader-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v32`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./redesign.css?v=12",
  "./roulette3d.css?v=12",
  "./js/app.js?v=14",
  "./js/reader.js",
  "./js/data.js",
  "./js/menu.js",
  "./js/themesong.js",
  "./js/roulette.js",
  "./js/pwa.js",
  "./js/intro.js",
  "./app/roulette3d-launch.js?v=12",
  "./storie.html",
  "./personaggi.html",
  "./le-perle-di-bud.html",
  "./meanwhile-the-doctor.html",
  "./crediti.html",
  "./app.css?v=12",
  "./doctor-reader.css?v=14",
  "./js/doctor-reader.js?v=14",
  "./js/doctor-data.js",
  "./site-menu.js?v=14",
  "./manifest.json?v=12",
  "./icons/icon-192.png?v=12",
  "./icons/icon-512.png?v=12"
];

function isAppShellAsset(pathname) {
  return pathname.endsWith("/") ||
    pathname.endsWith("/index.html") ||
    pathname.endsWith("/redesign.css") ||
    pathname.endsWith("/reader.js") ||
    pathname.endsWith("/data.js") ||
    pathname.endsWith("/menu.js") ||
    pathname.endsWith("/themesong.js") ||
    pathname.endsWith("/roulette.js") ||
    pathname.endsWith("/pwa.js") ||
    pathname.endsWith("/intro.js") ||
    pathname.endsWith("/storie.html") ||
    pathname.endsWith("/personaggi.html") ||
    pathname.endsWith("/le-perle-di-bud.html") ||
    pathname.endsWith("/meanwhile-the-doctor.html") ||
    pathname.endsWith("/crediti.html") ||
    pathname.endsWith("/app.css") ||
    pathname.endsWith("/doctor-reader.css") ||
    pathname.endsWith("/doctor-reader.js") ||
    pathname.endsWith("/doctor-data.js") ||
    pathname.endsWith("/app.js") ||
    pathname.endsWith("/site-menu.js") ||
    pathname.endsWith("/manifest.json") ||
    pathname.endsWith("/icon-192.png") ||
    pathname.endsWith("/icon-512.png");
}

function isCacheableStaticAsset(pathname) {
  return /\.(?:css|js|json|png|jpg|jpeg|gif|webp|svg|ico)$/i.test(pathname);
}

function isMediaAsset(pathname) {
  return /\.(?:mp4|mp3|wav|ogg|m4a|webm)$/i.test(pathname);
}

async function cacheNetworkResponse(request, response) {
  if(!response || response.status !== 200) {
    return response;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function handleAppShellRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return cacheNetworkResponse(request, networkResponse);
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if(cachedResponse) {
      return cachedResponse;
    }

    if(request.mode === "navigate") {
      return cache.match("./index.html");
    }

    throw new Error("Risorsa shell non disponibile");
  }
}

async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if(cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  return cacheNetworkResponse(request, networkResponse);
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);

  for(const asset of APP_SHELL) {
    try {
      const request = new Request(asset, { cache: "no-cache" });
      const response = await fetch(request);

      if(!response.ok) {
        console.warn(`[SW] Precache saltato per ${asset}: HTTP ${response.status}`);
        continue;
      }

      await cache.put(request, response.clone());
    } catch (error) {
      console.warn(`[SW] Precache non riuscito per ${asset}:`, error);
    }
  }
}

self.addEventListener("install", event => {
  event.waitUntil(precacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if(requestUrl.origin !== self.location.origin) return;

  if(event.request.headers.has("range")) {
    event.respondWith(fetch(event.request));
    return;
  }
  if(isMediaAsset(requestUrl.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if(event.request.mode === "navigate" || isAppShellAsset(requestUrl.pathname)) {
    event.respondWith(handleAppShellRequest(event.request));
    return;
  }

  if(isCacheableStaticAsset(requestUrl.pathname)) {
    event.respondWith(handleStaticAssetRequest(event.request));
  }
});
