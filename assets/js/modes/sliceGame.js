import { CANVAS_W, CANVAS_H, COLORS } from '../constants.js';
import { state } from '../state.js';
import { distToSegment } from '../geometry.js';

const GRAVITY = 1100; // px/s^2
const SPAWN_INTERVAL_MIN = 0.6;
const SPAWN_INTERVAL_MAX = 1.3;
const BOMB_CHANCE = 0.15;
const BOMB_PENALTY = 50;
const HALF_SEPARATION = 150; // px/s, how hard the two halves fly apart
// Fingertip detection has some inherent jitter/lag, so the hit test uses a
// slightly larger radius than what's drawn — a near-miss should still count.
const HIT_RADIUS_MULT = 1.5;

function drawStem(ctx, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(r * 0.12, -r * 1.15);
  ctx.stroke();
}

function drawSpeckles(ctx, r, speckles, color, scale = 1) {
  ctx.fillStyle = color;
  for (const s of speckles) {
    ctx.beginPath();
    ctx.arc(s.nx * r, s.ny * r, s.nr * r * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Each type draws whatever makes it instantly readable as that fruit —
// stripes, dimples, a stem — so it doesn't look like a plain colored ball
// until it's actually cut open.
const FRUITS = [
  {
    name: 'melancia',
    rind: '#2f9e44',
    flesh: '#ff6b6b',
    seed: '#1a1a1a',
    decorate(ctx, r) {
      ctx.strokeStyle = '#1b6e2e';
      ctx.lineWidth = Math.max(2, r * 0.14);
      ctx.lineCap = 'round';
      for (const t of [-0.55, -0.18, 0.18, 0.55]) {
        const half = Math.sqrt(Math.max(0, r * r - (t * r) ** 2)) * 0.92;
        ctx.beginPath();
        ctx.moveTo(t * r, -half);
        ctx.lineTo(t * r, half);
        ctx.stroke();
      }
    },
  },
  {
    name: 'laranja',
    rind: '#f77f1a',
    flesh: '#ffb347',
    seed: null,
    decorate(ctx, r, speckles) {
      drawSpeckles(ctx, r, speckles, 'rgba(0,0,0,0.12)');
      drawStem(ctx, r, '#4c7a2f');
    },
  },
  {
    name: 'maçã',
    rind: '#e0393e',
    flesh: '#fff3d6',
    seed: '#6b4423',
    decorate(ctx, r) {
      drawStem(ctx, r, '#5c3a21');
      ctx.fillStyle = '#4c9a3a';
      ctx.beginPath();
      ctx.ellipse(r * 0.18, -r * 0.92, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    name: 'kiwi',
    rind: '#8a6b3d',
    flesh: '#8bc34a',
    seed: '#1a1a1a',
    decorate(ctx, r, speckles) {
      drawSpeckles(ctx, r, speckles, 'rgba(255,255,255,0.35)', 0.6);
    },
  },
  {
    name: 'limão',
    rind: '#c6e05a',
    flesh: '#eaf4b0',
    seed: null,
    decorate(ctx, r, speckles) {
      drawSpeckles(ctx, r, speckles, 'rgba(255,255,255,0.25)', 0.5);
    },
  },
];

function generateSpeckles(count) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * 0.65; // sqrt bias = uniform coverage across the disc
    pts.push({ nx: Math.cos(angle) * d, ny: Math.sin(angle) * d, nr: 0.06 + Math.random() * 0.05 });
  }
  return pts;
}

let fruits = [];
let halves = [];
let particles = [];
let score = 0;
let combo = 0;
let comboTimer = 0;
let spawnTimer = 0;
let wasPinching = false;

export function reset() {
  fruits = [];
  halves = [];
  particles = [];
  score = 0;
  combo = 0;
  comboTimer = 0;
  spawnTimer = 0.4;
  wasPinching = false;
}
reset();

function spawnFruit() {
  const isBomb = Math.random() < BOMB_CHANCE;
  fruits.push({
    x: 60 + Math.random() * (CANVAS_W - 120),
    y: CANVAS_H + 30,
    vx: (Math.random() - 0.5) * 160,
    vy: -(620 + Math.random() * 220), // launched upward, gravity brings it back down
    radius: isBomb ? 22 : 26 + Math.random() * 10,
    type: isBomb ? null : FRUITS[Math.floor(Math.random() * FRUITS.length)],
    // Baked once so texture dots don't jitter between frames.
    speckles: isBomb ? null : generateSpeckles(10),
    isBomb,
    sliced: false,
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 4,
  });
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 220;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: 0.5 + Math.random() * 0.3,
      color,
    });
  }
}

// Splits a fruit into two half-discs that fly apart perpendicular to the
// cut line, each keeping the parent's momentum plus a separation impulse.
function spawnHalves(fruit, cutAngle) {
  const perp = { x: -Math.sin(cutAngle), y: Math.cos(cutAngle) };
  for (const side of [1, -1]) {
    halves.push({
      x: fruit.x,
      y: fruit.y,
      vx: fruit.vx + perp.x * HALF_SEPARATION * side,
      vy: fruit.vy + perp.y * HALF_SEPARATION * side - 40,
      radius: fruit.radius,
      // Local frame is rotated so the flat cut edge always sits on the local x-axis.
      rotation: fruit.rotation + cutAngle + (side === 1 ? 0 : Math.PI),
      spin: fruit.spin + side * 3,
      type: fruit.type,
    });
  }
}

function sliceFruit(fruit, cutAngle) {
  fruit.sliced = true;
  if (fruit.isBomb) {
    combo = 0;
    score = Math.max(0, score - BOMB_PENALTY);
    spawnParticles(fruit.x, fruit.y, COLORS.danger, 18);
  } else {
    combo += 1;
    comboTimer = 1.1;
    score += 10 * combo;
    spawnHalves(fruit, cutAngle);
    spawnParticles(fruit.x, fruit.y, fruit.type.flesh, 6);
  }
}

export function update(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnFruit();
    spawnTimer = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
  }

  const { present, fingerPos, prevFingerPos, isPinching, isPointing } = state.hand;

  // Pinch = corte especial: fatia tudo que estiver na tela no instante do gesto.
  if (present && isPinching && !wasPinching) {
    for (const fruit of fruits) {
      if (!fruit.sliced) sliceFruit(fruit, Math.random() * Math.PI * 2);
    }
  }
  wasPinching = isPinching;

  for (const fruit of fruits) {
    if (fruit.sliced) continue;

    fruit.vy += GRAVITY * dt;
    fruit.x += fruit.vx * dt;
    fruit.y += fruit.vy * dt;
    fruit.rotation += fruit.spin * dt;

    // Collision math intentionally uses the raw (unsmoothed) position, not
    // the eased one used for rendering — smoothing would lag behind a fast
    // swipe and shorten its effective reach, causing more missed fruit.
    if (present && isPointing && fingerPos && prevFingerPos && !isPinching) {
      if (distToSegment(fruit, prevFingerPos, fingerPos) < fruit.radius * HIT_RADIUS_MULT) {
        const cutAngle = Math.atan2(fingerPos.y - prevFingerPos.y, fingerPos.x - prevFingerPos.x);
        sliceFruit(fruit, cutAngle);
      }
    }
  }

  for (const half of halves) {
    half.vy += GRAVITY * dt;
    half.x += half.vx * dt;
    half.y += half.vy * dt;
    half.rotation += half.spin * dt;
  }

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  fruits = fruits.filter((f) => !f.sliced && f.y < CANVAS_H + 80);
  halves = halves.filter((h) => h.y < CANVAS_H + 100);

  for (const p of particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += GRAVITY * 0.4 * dt;
  }
  particles = particles.filter((p) => p.age < p.life);
}

function drawWholeFruit(ctx, fruit) {
  ctx.save();
  ctx.translate(fruit.x, fruit.y);
  ctx.rotate(fruit.rotation);

  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
  ctx.fillStyle = fruit.isBomb ? '#2b2f3a' : fruit.type.rind;
  ctx.fill();

  if (!fruit.isBomb) fruit.type.decorate(ctx, fruit.radius, fruit.speckles);

  // Small shine highlight for a bit of depth.
  ctx.beginPath();
  ctx.ellipse(-fruit.radius * 0.35, -fruit.radius * 0.35, fruit.radius * 0.28, fruit.radius * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();

  if (fruit.isBomb) {
    ctx.fillStyle = COLORS.danger;
    ctx.beginPath();
    ctx.arc(0, -fruit.radius - 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Half-disc: flat cut edge (showing the flesh) along the local x-axis,
// curved rind on the outside — this is what makes a slice read as a slice.
function drawHalf(ctx, half) {
  ctx.save();
  ctx.translate(half.x, half.y);
  ctx.rotate(half.rotation);

  ctx.beginPath();
  ctx.arc(0, 0, half.radius, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = half.type.flesh;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, half.radius, 0, Math.PI);
  ctx.lineWidth = 5;
  ctx.strokeStyle = half.type.rind;
  ctx.stroke();

  if (half.type.seed) {
    ctx.fillStyle = half.type.seed;
    for (const sx of [-0.4, 0, 0.4]) {
      ctx.beginPath();
      ctx.arc(sx * half.radius, half.radius * 0.4, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function render(ctx) {
  for (const fruit of fruits) drawWholeFruit(ctx, fruit);
  for (const half of halves) drawHalf(ctx, half);

  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 22px Segoe UI, sans-serif';
  ctx.fillText(`${score}`, CANVAS_W - 16, 34);

  if (combo > 1) {
    ctx.fillStyle = COLORS.accent2;
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    ctx.fillText(`combo x${combo}`, CANVAS_W - 16, 54);
  }
}
