import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// mobile — a kinetic hanging sculpture. A seeded binary tree of rigid wire
// arms: each arm pivots about its hanging point, carries a paddle (circle /
// leaf / crescent in theme roles) on one end and either a child arm or a
// second paddle on the other. Arms behave as coupled damped pendulums — each
// node oscillates about its seeded rest angle, integrated with a fixed
// timestep accumulator from dt = t − lastT, and a gentle periodic impulse
// keeps the sculpture alive. Depth 3–5 by `density`. Wires in `fg` at low
// alpha, paddles filled. Tree shape and paddle assignment are seeded;
// `staticFrame` shows the settled rest pose.

const STEP = 1 / 120; // fixed physics timestep (s)
const PADDLES = ['circle', 'leaf', 'crescent'];

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null; // { key, root }  — node: {len,pivot,drop,rest,th,om,left,right,paddle,ci}
  let lastT = 0;
  let acc = 0;
  let impulseT = 0;

  function buildNode(rng, depth, maxDepth, scale) {
    const node = {
      len: scale * (0.55 + rng() * 0.4), // beam half-spread basis (unit coords)
      pivot: 0.34 + rng() * 0.2, // fraction of beam left of the pivot
      drop: scale * (0.12 + rng() * 0.16), // wire drop from parent to this pivot
      rest: (rng() - 0.5) * 0.18, // seeded rest tilt
      th: 0,
      om: 0,
      phase: rng() * Math.PI * 2,
      paddle: PADDLES[(rng() * PADDLES.length) | 0],
      ci: (rng() * 5) | 0,
      childLeft: rng() < 0.5, // which beam end carries the child arm
      left: null,
      right: null,
    };
    node.th = node.rest;
    // One end always carries the paddle; the other may carry a child arm.
    if (depth < maxDepth && rng() < 0.85) {
      node.left = buildNode(rng, depth + 1, maxDepth, scale * 0.62);
    }
    return node;
  }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const maxDepth = 3 + Math.round((params.density ?? 0.5) * 2); // 3..5
    const root = buildNode(rng, 1, maxDepth, 0.5);
    cache = { key, root };
    lastT = 0;
    acc = 0;
    impulseT = 0;
    return cache;
  }

  // One physics step: each node is a damped oscillator about its rest angle,
  // weakly coupled to its parent's angular velocity (the parent drags it).
  function stepNode(node, parentOm, impulse) {
    const stiff = 1.6;
    const damp = 0.55;
    node.om +=
      (-(node.th - node.rest) * stiff -
        node.om * damp +
        parentOm * 0.35 +
        impulse * Math.sin(node.phase)) *
      STEP;
    node.th += node.om * STEP;
    if (node.left) stepNode(node.left, node.om, impulse * 0.7);
    if (node.right) stepNode(node.right, node.om, impulse * 0.7);
  }

  function drawPaddle(kind, x, y, s, col) {
    c2d.fillStyle = rgb(col);
    c2d.beginPath();
    if (kind === 'circle') {
      c2d.arc(x, y, s, 0, Math.PI * 2);
    } else if (kind === 'leaf') {
      c2d.moveTo(x, y - s);
      c2d.quadraticCurveTo(x + s * 1.2, y, x, y + s);
      c2d.quadraticCurveTo(x - s * 1.2, y, x, y - s);
    } else {
      // crescent: full disc with a bite clipped by a second arc
      c2d.arc(x, y, s, Math.PI * 0.25, Math.PI * 1.75);
      c2d.arc(x + s * 0.55, y, s * 0.72, Math.PI * 1.62, Math.PI * 0.38, true);
    }
    c2d.closePath();
    c2d.fill();
  }

  // Recursively draw: wire drop to the pivot, tilted beam, paddle(s)/child.
  function drawNode(node, px, py, unit, roles, wire, padScale) {
    const pivX = px;
    const pivY = py + node.drop * unit;
    c2d.beginPath();
    c2d.moveTo(px, py);
    c2d.lineTo(pivX, pivY);
    c2d.stroke();

    const cosT = Math.cos(node.th);
    const sinT = Math.sin(node.th);
    const lenL = node.len * node.pivot * unit;
    const lenR = node.len * (1 - node.pivot) * unit;
    const lx = pivX - cosT * lenL;
    const ly = pivY - sinT * lenL;
    const rx = pivX + cosT * lenR;
    const ry = pivY + sinT * lenR;
    c2d.beginPath();
    c2d.moveTo(lx, ly);
    c2d.lineTo(rx, ry);
    c2d.stroke();

    const ps = Math.max(5, node.len * unit * 0.16) * padScale;
    // One seeded end carries the child arm; the other hangs this node's paddle
    // on a short wire (leaves hang a small second paddle instead of a child).
    const [chX, chY, pdX, pdY] = node.childLeft ? [lx, ly, rx, ry] : [rx, ry, lx, ly];
    c2d.beginPath();
    c2d.moveTo(pdX, pdY);
    c2d.lineTo(pdX, pdY + ps * 0.9);
    c2d.stroke();
    drawPaddle(node.paddle, pdX, pdY + ps * 1.7, ps, roles[node.ci % roles.length]);
    if (node.left) {
      drawNode(node.left, chX, chY, unit, roles, wire, padScale);
    } else {
      c2d.beginPath();
      c2d.moveTo(chX, chY);
      c2d.lineTo(chX, chY + ps * 0.9);
      c2d.stroke();
      drawPaddle('circle', chX, chY + ps * 1.5, ps * 0.7, roles[(node.ci + 2) % roles.length]);
    }
  }

  function draw(params) {
    const { root } = cache;
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const roles = [c.primary, c.accent, c.info, c.warning, c.error].filter(Boolean);
    if (!roles.length) roles.push(c.fg || [0.4, 0.4, 0.45]);
    const wire = c.fg || [0.5, 0.5, 0.55];
    c2d.strokeStyle = rgb(wire, 0.45);
    c2d.lineWidth = Math.max(1, Math.min(w, h) * 0.0035);
    c2d.lineCap = 'round';
    const unit = Math.min(w, h) * 1.5;
    const padScale = 0.9 + (params.intensity ?? 0.5) * 0.5;
    drawNode(root, w / 2, h * 0.02, unit, roles, wire, padScale);
  }

  function frame(t, params) {
    build(params);
    let dt = t - lastT;
    lastT = t;
    if (!(dt >= 0)) dt = 0;
    acc = Math.min(acc + dt, 0.25);
    while (acc >= STEP) {
      // A soft impulse swells every ~9s so the mobile never fully settles.
      impulseT += STEP;
      const swell = Math.max(0, Math.sin((impulseT / 9) * Math.PI * 2)) ** 8;
      stepNode(cache.root, 0, swell * 0.5);
      acc -= STEP;
    }
    draw(params);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      build(params);
      // Rest pose: zero all motion at the seeded rest angles.
      (function settle(n) {
        n.th = n.rest;
        n.om = 0;
        if (n.left) settle(n.left);
        if (n.right) settle(n.right);
      })(cache.root);
      draw(params);
    },
    dispose() {
      cache = null;
    },
  };
}
