// ============================================================
//  ROULETTE NAPOLETANA — ruota 2D (canvas) + ponte all'overlay 3D.
//  Logica portata dalla versione classica (app-entertainment.js),
//  resa autonoma: la pallina è posizionata via style diretto,
//  senza dipendere dal runtime-CSS di app.css.
// ============================================================

const NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27,
  13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1,
  20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const NICKNAMES = {
  0: "zero", 1: "l'Italia", 2: "a' criatura", 3: "a' jatta", 4: "o' puorco",
  5: "a' mano", 6: "chella ca guarda nterra", 7: "o' vase", 8: "a' Maronna",
  9: "a' figliata", 10: "e fasule", 11: "e surice", 12: "e surdate",
  13: "Sant'Antonio", 14: "o' mbriaco", 15: "o' guaglione", 16: "o' culo",
  17: "a disgrazia", 18: "o' sanghe", 19: "a' resata", 20: "a' festa",
  21: "a' femmena annura", 22: "o' pazzo", 23: "o' scemo", 24: "e guardie",
  25: "Natale", 26: "Nanninella", 27: "o' cantero", 28: "e zzizze",
  29: "o' pate d'e criature", 30: "e palle d'o tenente", 31: "o' padrone 'e casa",
  32: "o' capitone", 33: "ll'anne 'e Cristo", 34: "a' capa", 35: "l'aucielluzzo",
  36: "e castagnelle"
};

const TAU = Math.PI * 2;

export function initRoulette() {
  const container = document.getElementById("roulette-container");
  const canvas = document.getElementById("roulette-wheel");
  const ball = document.getElementById("roulette-ball");
  const result = document.getElementById("roulette-result");
  const voiceBtn = document.getElementById("roulette-voice-btn");
  const modeBtn = document.getElementById("roulette-mode-btn");
  if (!container || !canvas || !ball || !result || !voiceBtn) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let spinning = false;
  let voiceEnabled = true;
  let ballAngle = -Math.PI / 2;
  let animationId = null;
  let safetyTimer = null;
  let mode3d = !!modeBtn;

  function drawWheel() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 220;
    const innerRadius = 150;
    const segAngle = TAU / NUMBERS.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const outer = ctx.createRadialGradient(cx, cy, 50, cx, cy, radius + 16);
    outer.addColorStop(0, "#8d6b21");
    outer.addColorStop(1, "#4b3308");
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 12, 0, TAU);
    ctx.fillStyle = outer;
    ctx.fill();

    for (let i = 0; i < NUMBERS.length; i++) {
      const start = -Math.PI / 2 + i * segAngle;
      const end = start + segAngle;
      const num = NUMBERS[i];
      let color = "#1f9d55";
      if (num !== 0) color = RED.has(num) ? "#b71c1c" : "#111111";

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 2;
      ctx.stroke();

      const textAngle = start + segAngle / 2;
      const tx = cx + Math.cos(textAngle) * 185;
      const ty = cy + Math.sin(textAngle) * 185;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(num), 0, 0);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, TAU);
    ctx.fillStyle = "#4b2e05";
    ctx.fill();
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, TAU);
    ctx.fillStyle = "#d4af37";
    ctx.fill();
  }

  function positionBall(angle) {
    const rect = canvas.getBoundingClientRect();
    const cx = canvas.offsetLeft + rect.width / 2;
    const cy = canvas.offsetTop + rect.height / 2;
    const r = rect.width * 0.43;
    ball.style.left = `${cx + Math.cos(angle) * r}px`;
    ball.style.top = `${cy + Math.sin(angle) * r}px`;
  }

  const norm = angle => ((angle % TAU) + TAU) % TAU;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  function setDisabled(disabled) {
    container.setAttribute("aria-disabled", disabled ? "true" : "false");
  }

  function setVoice(enabled) {
    voiceEnabled = enabled;
    voiceBtn.textContent = enabled ? "Voce attiva" : "Voce disattivata";
    voiceBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
  }

  function speak(text) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "it-IT";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn("Sintesi vocale roulette non disponibile:", error);
    }
  }

  const resultText = number => {
    const nickname = NICKNAMES[number];
    return nickname ? `${number} - ${nickname}` : `${number}`;
  };

  function spin() {
    if (spinning) return;
    spinning = true;
    setDisabled(true);
    result.textContent = "La pallina gira...";

    if (animationId) { window.cancelAnimationFrame(animationId); animationId = null; }
    if (safetyTimer) { window.clearTimeout(safetyTimer); safetyTimer = null; }

    const winningIndex = Math.floor(Math.random() * NUMBERS.length);
    const winningNumber = NUMBERS[winningIndex];
    const segAngle = TAU / NUMBERS.length;
    const targetAngle = -Math.PI / 2 + winningIndex * segAngle + segAngle / 2;
    const startAngle = norm(ballAngle);
    const normalizedTarget = norm(targetAngle);
    const extraTurns = TAU * (5 + Math.floor(Math.random() * 3));

    let delta = normalizedTarget - startAngle;
    if (delta < 0) delta += TAU;

    const finalAngle = startAngle + extraTurns + delta;
    const duration = 4200;
    const startTime = performance.now();

    function finish() {
      ballAngle = normalizedTarget;
      positionBall(ballAngle);
      const text = resultText(winningNumber);
      result.textContent = `Numero uscito: ${text}`;
      speak(text);
      spinning = false;
      animationId = null;
      setDisabled(false);
    }

    function animate(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const current = startAngle + (finalAngle - startAngle) * easeOutCubic(progress);
      positionBall(current);
      if (progress < 1) animationId = window.requestAnimationFrame(animate);
      else finish();
    }

    animationId = window.requestAnimationFrame(animate);
    safetyTimer = window.setTimeout(() => {
      if (spinning) {
        if (animationId) { window.cancelAnimationFrame(animationId); animationId = null; }
        finish();
      }
    }, duration + 1000);
  }

  function setMode(use3d) {
    mode3d = use3d;
    if (modeBtn) {
      modeBtn.textContent = use3d ? "3D" : "2D";
      modeBtn.setAttribute("aria-pressed", use3d ? "true" : "false");
    }
  }

  function activate() {
    if (mode3d && document.getElementById("roulette3d-overlay")) {
      window.dispatchEvent(new CustomEvent("roulette3d:open"));
      return;
    }
    spin();
  }

  drawWheel();
  positionBall(ballAngle);
  setVoice(true);
  setMode(!!modeBtn);

  if (modeBtn) modeBtn.addEventListener("click", () => setMode(!mode3d));
  container.addEventListener("click", activate);
  container.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });
  voiceBtn.addEventListener("click", () => setVoice(!voiceEnabled));

  // Estrazione dall'overlay 3D → posiziona la pallina 2D e aggiorna il testo.
  window.addEventListener("roulette3d:result", event => {
    const detail = (event && event.detail) || {};
    if (typeof detail.number === "number" && !spinning) {
      const index = NUMBERS.indexOf(detail.number);
      if (index >= 0) {
        const segAngle = TAU / NUMBERS.length;
        ballAngle = norm(-Math.PI / 2 + index * segAngle + segAngle / 2);
        positionBall(ballAngle);
      }
    }
    if (detail.text) result.textContent = `Numero uscito: ${detail.text}`;
  });

  window.addEventListener("resize", () => positionBall(ballAngle));
}
