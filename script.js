
// ===========================
// Fog / Stars / Emergence
// Canvas Particle System + Lightning Engine + Emergence Spiral (Balanced v1.2)
// - Stars: 1200, A+C random colors, center suction, twinkle
// - Spiral: 3-layer core, slow visible swirl, stronger near center,
//           outer stable, core direction gently random-waves (consciousness-like)
// - Lightning: A1+A2+A3+A4, random color/thickness/timing, additive with safe fade
// ===========================

// ---- CONFIG (STARS) ----
const STAR_COUNT = 1200;
const CENTER_GRAVITY = 0.0016;  // <-- stronger suction to avoid blow-out
const MAX_SPEED = 1.5;
const MIN_SPEED = 0.02;
const SOFTENING = 0.8;
const CENTER_RESPAWN_RADIUS = 8;

// Twinkle
const TWINKLE_BASE = 0.55;
const TWINKLE_AMP  = 0.35;
const TWINKLE_RATE = 450;

// Star size (px)
const STAR_MIN_R = 0.6;
const STAR_MAX_R = 1.6;

// Stars palette: A + C only
const STAR_PALETTE = [
  "#ffffff", // A: white
  "#aee0ff"  // C: blue-white
];

// ---- SPIRAL (EMERGENCE) ----
// 3-layer core swirl, slow but visible.
// Outer: stable left-rotation.
// Layer2+3: very slow drift between left/right.
// Core (layer1): softly random direction changes (not too fast).
const SPIRAL = {
  // radii are based on min(w,h)
  r1: 0.10,  // core
  r2: 0.20,  // mid
  r3: 0.30,  // outer-core edge
  maxStrength: 0.025, // <-- reduced to prevent outward fling
  outerDirection: 1,  // stable direction outside core (1=ccw, -1=cw)
  driftPhase: 0,      // slow drift for layer2/3
  driftSpeed: 0.00012, // smaller = slower drift
  coreDirection: 1,
  coreTimer: 0,
  coreInterval: 2200 + Math.random() * 1500 // 2.2〜3.7s
};

function updateSpiral(dtMs) {
  // slow drift (layer2/3): sinusoidal sign
  SPIRAL.driftPhase += dtMs * SPIRAL.driftSpeed;

  // core direction gentle random flip
  SPIRAL.coreTimer += dtMs;
  if (SPIRAL.coreTimer > SPIRAL.coreInterval) {
    SPIRAL.coreTimer = 0;
    SPIRAL.coreInterval = 2200 + Math.random() * 1500;
    if (Math.random() < 0.55) SPIRAL.coreDirection *= -1; // soft randomness
  }
}

// ---- CANVAS SETUP (STARS) ----
const starsCanvas = document.getElementById("stars");
const starsCtx = starsCanvas.getContext("2d", { alpha: true });

// ---- CANVAS SETUP (LIGHTNING) ----
const lightningCanvas = document.getElementById("lightning");
const lightningCtx = lightningCanvas.getContext("2d", { alpha: true });

let w, h, dpr;
let centerX, centerY, maxDist;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = window.innerWidth;
  h = window.innerHeight;

  starsCanvas.width = Math.floor(w * dpr);
  starsCanvas.height = Math.floor(h * dpr);
  starsCanvas.style.width = w + "px";
  starsCanvas.style.height = h + "px";
  starsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  lightningCanvas.width = Math.floor(w * dpr);
  lightningCanvas.height = Math.floor(h * dpr);
  lightningCanvas.style.width = w + "px";
  lightningCanvas.style.height = h + "px";
  lightningCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  centerX = w / 2;
  centerY = h / 2;
  maxDist = Math.hypot(centerX, centerY);
}
resize();
window.addEventListener("resize", resize);

// ===========================
// STARS
// ===========================
class Star {
  constructor() { this.respawn(true); }

  respawn(initial=false) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;

    const dist = Math.hypot(this.x - centerX, this.y - centerY);
    this.speedFactor = 1 - dist / maxDist;

    this.radius = STAR_MIN_R + Math.random() * (STAR_MAX_R - STAR_MIN_R);

    // A+C random color
    this.color = STAR_PALETTE[(Math.random() * STAR_PALETTE.length) | 0];

    this.twinkleOffset = Math.random() * Math.PI * 2;
    this.alpha = 1;

    if (!initial) {
      // outer bias respawn for nicer flow
      if (Math.random() < 0.7) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.max(w, h) * (0.45 + Math.random() * 0.55);
        this.x = centerX + Math.cos(ang) * r;
        this.y = centerY + Math.sin(ang) * r;
      }
    }
  }

  update(t, dtMs) {
    const dx = centerX - this.x;
    const dy = centerY - this.y;
    const dist = Math.hypot(dx, dy) + SOFTENING;

    // center suction speed profile
    const speed = MIN_SPEED + this.speedFactor * (MAX_SPEED - MIN_SPEED);
    const ndx = dx / dist;
    const ndy = dy / dist;

    // base gravity
    this.x += ndx * speed * CENTER_GRAVITY;
    this.y += ndy * speed * CENTER_GRAVITY;

    // ---- Spiral add-on (3 layers) ----
    const minSide = Math.min(w, h);
    const r1 = SPIRAL.r1 * minSide;
    const r2 = SPIRAL.r2 * minSide;
    const r3 = SPIRAL.r3 * minSide;

    const rx = this.x - centerX;
    const ry = this.y - centerY;
    const r = Math.hypot(rx, ry) + 0.0001;

    if (r < r3) {
      // tangential unit vector
      const tx = -ry / r;
      const ty =  rx / r;

      // layer strength
      let layerStrength;
      if (r < r1) layerStrength = 1.0;
      else if (r < r2) layerStrength = 0.6;
      else layerStrength = 0.3;

      // stronger near center, zero at r3
      let strength = SPIRAL.maxStrength * layerStrength * (1 - r / r3);

      // direction: core random-ish, outer stable w/ slow drift
      let dir;
      if (r < r1) {
        dir = SPIRAL.coreDirection;
        strength *= 0.4; // core stabilizer (avoid blow-out)
      } else {
        // slow drift between left/right for layer2/3
        const drift = Math.sin(SPIRAL.driftPhase);
        dir = (Math.abs(drift) < 0.15) ? SPIRAL.outerDirection : Math.sign(drift);
      }

      // apply swirl (scaled by dt for consistency)
      const dtScale = Math.min(2, dtMs / 16.67);
      this.x += tx * strength * dir * dtScale * 60;
      this.y += ty * strength * dir * dtScale * 60;

      // small damping near core to keep calm nucleus
      if (r < r1) {
        this.x = centerX + rx * 0.995;
        this.y = centerY + ry * 0.995;
      }
    }

    // twinkle
    this.alpha = TWINKLE_BASE + Math.sin(t / TWINKLE_RATE + this.twinkleOffset) * TWINKLE_AMP;

    // respawn when swallowed
    if (dist < CENTER_RESPAWN_RADIUS) {
      this.respawn(false);
    }
  }

  draw() {
    starsCtx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
    starsCtx.beginPath();
    starsCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    starsCtx.fillStyle = this.color;
    starsCtx.fill();
  }
}

const stars = Array.from({ length: STAR_COUNT }, () => new Star());

// ===========================
// LIGHTNING (A1 + A2 + A3 + A4)
// ===========================

// Lightning palette (random)
const LIGHTNING_PALETTE = [
  "#ffffff",
  "#aee0ff",
  "#c7b8ff"
];

// Random thickness range
const THICKNESS_MIN = 0.6;
const THICKNESS_MAX = 2.4;

// A4 flash / bloom
let flashAlpha = 0;
let bloomRadius = 0;
let bloomAlpha = 0;

function triggerFlash() {
  flashAlpha = 0.20 + Math.random() * 0.25;
  bloomRadius = 40 + Math.random() * 140;
  bloomAlpha = 0.25 + Math.random() * 0.30;
}

// Utility: draw a jagged lightning path between two points
function buildBoltPath(x0, y0, x1, y1, segments = 14, jitter = 26) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const jx = (Math.random() - 0.5) * jitter;
    const jy = (Math.random() - 0.5) * jitter;
    pts.push([x + jx, y + jy]);
  }
  return pts;
}

// Utility: stroke a path with optional branching
function strokeBolt(points, color, thickness, branchChance = 0.25) {
  lightningCtx.strokeStyle = color;
  lightningCtx.lineWidth = thickness;
  lightningCtx.lineCap = "round";
  lightningCtx.lineJoin = "round";

  lightningCtx.beginPath();
  lightningCtx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    lightningCtx.lineTo(points[i][0], points[i][1]);

    if (Math.random() < branchChance && i < points.length - 2) {
      const [bx, by] = points[i];
      const angle = Math.random() * Math.PI * 2;
      const len = 30 + Math.random() * 120;
      const ex = bx + Math.cos(angle) * len;
      const ey = by + Math.sin(angle) * len;
      const branchPts = buildBoltPath(bx, by, ex, ey, 6, 18);
      lightningCtx.beginPath();
      lightningCtx.moveTo(branchPts[0][0], branchPts[0][1]);
      for (let j = 1; j < branchPts.length; j++) {
        lightningCtx.lineTo(branchPts[j][0], branchPts[j][1]);
      }
      lightningCtx.stroke();
    }
  }
  lightningCtx.stroke();
}

// A1: ambient random lightning across screen
function lightningA1() {
  const color = LIGHTNING_PALETTE[(Math.random() * LIGHTNING_PALETTE.length) | 0];
  const thickness = THICKNESS_MIN + Math.random() * (THICKNESS_MAX - THICKNESS_MIN);

  const x0 = Math.random() * w;
  const y0 = -20;
  const x1 = Math.random() * w;
  const y1 = h + 20;

  const pts = buildBoltPath(x0, y0, x1, y1, 16, 30);
  strokeBolt(pts, color, thickness, 0.30);
  triggerFlash();
}

// A2: radial lightning from center (active)
function lightningA2() {
  const color = LIGHTNING_PALETTE[(Math.random() * LIGHTNING_PALETTE.length) | 0];
  const thickness = THICKNESS_MIN + Math.random() * (THICKNESS_MAX - THICKNESS_MIN);

  const rays = 3 + ((Math.random() * 4) | 0);
  for (let r = 0; r < rays; r++) {
    const angle = Math.random() * Math.PI * 2;
    const len = Math.max(w, h) * (0.35 + Math.random() * 0.55);
    const x1 = centerX + Math.cos(angle) * len;
    const y1 = centerY + Math.sin(angle) * len;
    const pts = buildBoltPath(centerX, centerY, x1, y1, 10, 22);
    strokeBolt(pts, color, thickness, 0.22);
  }
  triggerFlash();
}

// A3: inverse lightning from outside to center
function lightningA3() {
  const color = LIGHTNING_PALETTE[(Math.random() * LIGHTNING_PALETTE.length) | 0];
  const thickness = THICKNESS_MIN + Math.random() * (THICKNESS_MAX - THICKNESS_MIN);

  const angle = Math.random() * Math.PI * 2;
  const r = Math.max(w, h) * (0.60 + Math.random() * 0.60);
  const x0 = centerX + Math.cos(angle) * r;
  const y0 = centerY + Math.sin(angle) * r;

  const pts = buildBoltPath(x0, y0, centerX, centerY, 14, 26);
  strokeBolt(pts, color, thickness, 0.28);
  triggerFlash();
}

// Schedule A1 random interval max 10s
function scheduleA1() {
  const delay = 1000 + Math.random() * 9000;
  setTimeout(() => {
    lightningA1();

    if (Math.random() < 0.75) {
      setTimeout(lightningA2, 80 + Math.random() * 220);
      if (Math.random() < 0.45) {
        setTimeout(lightningA2, 220 + Math.random() * 380);
      }
    }

    if (Math.random() < 0.55) {
      setTimeout(lightningA3, 140 + Math.random() * 600);
    }

    scheduleA1();
  }, delay);
}
scheduleA1();

function scheduleA3() {
  const delay = 1500 + Math.random() * 9500;
  setTimeout(() => {
    if (Math.random() < 0.65) lightningA3();
    scheduleA3();
  }, delay);
}
scheduleA3();

function scheduleA2() {
  const delay = 1200 + Math.random() * 5500;
  setTimeout(() => {
    if (Math.random() < 0.70) lightningA2();
    scheduleA2();
  }, delay);
}
scheduleA2();

// ===========================
// MAIN ANIMATION LOOP
// ===========================
let lastTime = performance.now();

function animate(now) {
  const dtMs = now - lastTime;
  lastTime = now;

  const t = now;

  // update spiral state
  updateSpiral(dtMs);

  // Clear stars canvas
  starsCtx.globalCompositeOperation = "source-over";
  starsCtx.clearRect(0, 0, w, h);

  // Draw stars far -> near
  stars.sort((a, b) => a.speedFactor - b.speedFactor);

  for (const s of stars) {
    const dist = Math.hypot(s.x - centerX, s.y - centerY);
    s.speedFactor = 1 - dist / maxDist;
    s.update(t, dtMs);
    s.draw();
  }
  starsCtx.globalAlpha = 1;

  // Fade lightning WITHOUT black veil
  lightningCtx.globalCompositeOperation = "destination-out";
  lightningCtx.fillStyle = "rgba(0,0,0,0.15)";
  lightningCtx.fillRect(0, 0, w, h);

  // Additive lightning
  lightningCtx.globalCompositeOperation = "lighter";

  // A4 Flash overlay
  if (flashAlpha > 0.001) {
    lightningCtx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
    lightningCtx.fillRect(0, 0, w, h);
    flashAlpha *= 0.86;
  } else {
    flashAlpha = 0;
  }

  // A4 Center bloom / halo
  if (bloomAlpha > 0.001) {
    const grad = lightningCtx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, bloomRadius
    );
    grad.addColorStop(0, `rgba(255,255,255,${bloomAlpha})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    lightningCtx.fillStyle = grad;
    lightningCtx.beginPath();
    lightningCtx.arc(centerX, centerY, bloomRadius, 0, Math.PI * 2);
    lightningCtx.fill();

    bloomAlpha *= 0.88;
    bloomRadius *= 0.985;
  } else {
    bloomAlpha = 0;
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
