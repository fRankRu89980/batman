// ============================================================
//  THEME SONG — Player audio "Concentrazione e Mindset" con
//  visualizzatore GIF (animato in riproduzione, fotogramma
//  statico su canvas in pausa). Portato dalla versione classica,
//  reso autonomo e più leggero (senza il modal video separato).
// ============================================================

export function initThemeSong() {
  const card = document.querySelector(".theme-song-card");
  const player = document.getElementById("theme-song-player");
  const gif = document.getElementById("theme-song-visual-animated");
  const staticCanvas = document.getElementById("theme-song-visual-static");
  const playBtn = document.getElementById("theme-song-play");
  const playIcon = document.getElementById("theme-song-play-icon");
  const muteBtn = document.getElementById("theme-song-mute");
  const muteIcon = document.getElementById("theme-song-mute-icon");
  const progress = document.getElementById("theme-song-progress");
  const time = document.getElementById("theme-song-time");

  if (!card || !player || !gif || !staticCanvas || !playBtn || !playIcon ||
      !muteBtn || !muteIcon || !progress || !time) {
    return;
  }

  const ctx = staticCanvas.getContext("2d");
  if (!ctx) return;

  const baseSrc = gif.dataset.src || gif.src;

  function drawStaticFrame() {
    ctx.clearRect(0, 0, staticCanvas.width, staticCanvas.height);
    try {
      ctx.drawImage(gif, 0, 0, staticCanvas.width, staticCanvas.height);
    } catch { /* la gif potrebbe non essere ancora decodificata */ }
  }

  function restartGif() {
    gif.src = "";
    window.requestAnimationFrame(() => { gif.src = baseSrc; });
  }

  function format(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function updateTime() {
    const current = player.currentTime || 0;
    const duration = Number.isFinite(player.duration) ? player.duration : 0;
    time.textContent = `${format(current)} / ${format(duration)}`;
  }

  function updateProgress() {
    const duration = Number.isFinite(player.duration) ? player.duration : 0;
    const current = player.currentTime || 0;
    progress.value = duration > 0 ? (current / duration) * 100 : 0;
    updateTime();
  }

  function setPlayUi(playing) {
    card.classList.toggle("is-playing", playing);
    playBtn.setAttribute("aria-pressed", playing ? "true" : "false");
    playBtn.setAttribute("aria-label", playing ? "Metti in pausa la theme song" : "Riproduci la theme song");
    playIcon.textContent = playing ? "❚❚" : "▶";
  }

  function setMuteUi() {
    const muted = player.muted || player.volume === 0;
    card.classList.toggle("is-muted", muted);
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    muteBtn.setAttribute("aria-label", muted ? "Riattiva audio" : "Disattiva audio");
    muteIcon.textContent = muted ? "🔇" : "🔊";
  }

  if (gif.complete) drawStaticFrame();
  else gif.addEventListener("load", drawStaticFrame, { once: true });

  setPlayUi(false);
  setMuteUi();
  updateProgress();

  playBtn.addEventListener("click", async () => {
    if (player.paused) {
      try { await player.play(); }
      catch (error) { console.warn("Avvio theme song non riuscito:", error); }
      return;
    }
    player.pause();
  });

  muteBtn.addEventListener("click", () => {
    player.muted = !player.muted;
    setMuteUi();
  });

  progress.addEventListener("input", () => {
    const duration = Number.isFinite(player.duration) ? player.duration : 0;
    if (duration <= 0) return;
    player.currentTime = (Number(progress.value) / 100) * duration;
    updateProgress();
  });

  player.addEventListener("loadedmetadata", updateProgress);
  player.addEventListener("timeupdate", updateProgress);
  player.addEventListener("volumechange", setMuteUi);
  player.addEventListener("play", () => { restartGif(); setPlayUi(true); });

  ["pause", "ended"].forEach(eventName => {
    player.addEventListener(eventName, () => {
      setPlayUi(false);
      drawStaticFrame();
      if (eventName === "ended") {
        player.currentTime = 0;
        updateProgress();
      }
    });
  });
}
