import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// illuminated — a manuscript page. A large initial capital sits in a framed
// block with a gold-leaf fill swept by an animated sheen; vine marginalia grow
// down the left margin (arc-length reveal, morris-style but page-anchored);
// rubricated line stubs suggest the text body, the opening words picked out in
// red. Parchment is bg softened toward warning with edge darkening, cached
// offscreen. `intensity` = gilding strength, `density` = text-line count.

const VINE_SEC = 14; // seconds for the marginalia to grow fully
const START_OFF = 10; // clock offset so a frozen first frame shows the grown vine

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function parchment(rng, c) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const o = cv.getContext('2d');
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.93, 0.88, 0.76];
    const page = mix(bg, c.warning || [0.85, 0.7, 0.45], 0.12);
    o.fillStyle = rgb(page);
    o.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) {
      o.fillStyle = rgb(rng() < 0.6 ? [0.4, 0.3, 0.15] : [1, 1, 1], 0.02 + rng() * 0.03);
      const r = 2 + rng() * 30;
      o.beginPath();
      o.arc(rng() * w, rng() * h, r, 0, Math.PI * 2);
      o.fill();
    }
    // Edge darkening.
    const g = o.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.3,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.75
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(60,40,10,0.22)');
    o.fillStyle = g;
    o.fillRect(0, 0, w, h);
    return cv;
  }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const c = getColors();
    const page = parchment(rng, c);
    const letter = String.fromCharCode(65 + ((rng() * 26) | 0));

    // Vine: a wandering quadratic path down the left margin + leaf anchors.
    const mx = w * 0.1;
    const pts = [];
    let x = mx;
    let y = h * 0.12;
    pts.push([x, y]);
    while (y < h * 0.92) {
      x = mx + (rng() - 0.5) * w * 0.05;
      y += h * 0.06 + rng() * h * 0.04;
      pts.push([x, y]);
    }
    const cum = [0];
    let total = 0;
    for (let k = 1; k < pts.length; k++) {
      total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      cum.push(total);
    }
    const leaves = [];
    for (let k = 1; k < pts.length - 1; k += 1) {
      if (rng() < 0.8)
        leaves.push({
          at: cum[k] / total,
          x: pts[k][0],
          y: pts[k][1],
          ang: (rng() < 0.5 ? 0 : Math.PI) + (rng() - 0.5) * 0.9,
          size: h * (0.018 + rng() * 0.022),
          ci: rng() < 0.5 ? 0 : 1,
        });
    }

    // Text stubs: rows of varying-width bars right of the capital block.
    const lines = [];
    const n = 10 + Math.round((params.density ?? 0.5) * 14);
    for (let i = 0; i < n; i++) lines.push({ frac: 0.55 + rng() * 0.4, red: i === 0 });

    cache = { key, page, letter, pts, cum, total, leaves, lines };
    return cache;
  }

  function frame(t0, params) {
    const t = t0 + START_OFF;
    const { page, letter, pts, cum, total, leaves, lines } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    c2d.drawImage(page, 0, 0);
    const intensity = params.intensity ?? 0.5;
    const ink = mix(c.fg || [0.2, 0.15, 0.1], [0, 0, 0], 0.2);
    const gold = mix(c.warning || [0.85, 0.65, 0.2], [1, 0.95, 0.6], 0.25);
    const red = c.error || [0.7, 0.15, 0.1];
    const vineCol = mix(c.success || c.primary || [0.3, 0.45, 0.25], ink, 0.25);

    // --- initial capital block with gold leaf + sheen sweep ---
    const bs = Math.min(w, h) * 0.3;
    const bx = w * 0.16;
    const by = h * 0.1;
    c2d.fillStyle = rgb(mix(c.primary || [0.25, 0.3, 0.55], [0, 0, 0], 0.25));
    c2d.fillRect(bx, by, bs, bs);
    c2d.strokeStyle = rgb(gold, 0.9);
    c2d.lineWidth = Math.max(2, bs * 0.02);
    c2d.strokeRect(bx, by, bs, bs);
    const fs = bs * 0.74;
    c2d.font = `700 ${fs | 0}px Georgia, 'Times New Roman', serif`;
    c2d.textAlign = 'center';
    c2d.textBaseline = 'middle';
    // Gold letter, then a moving sheen band clipped to the glyph.
    c2d.fillStyle = rgb(gold);
    c2d.fillText(letter, bx + bs / 2, by + bs * 0.56);
    const sheenX = bx + (((t * 0.18) % 1.6) - 0.3) * bs;
    const g = c2d.createLinearGradient(sheenX - bs * 0.18, by, sheenX + bs * 0.18, by + bs);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,240,${0.25 + 0.45 * intensity})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c2d.save();
    c2d.globalCompositeOperation = 'source-atop';
    c2d.fillStyle = g;
    c2d.font = `700 ${fs | 0}px Georgia, 'Times New Roman', serif`;
    c2d.fillText(letter, bx + bs / 2, by + bs * 0.56);
    c2d.restore();

    // --- vine marginalia, arc-length reveal ---
    const reveal = Math.min(1, t / VINE_SEC);
    const limit = reveal * total;
    c2d.strokeStyle = rgb(vineCol, 0.9);
    c2d.lineWidth = Math.max(1.5, h * 0.004);
    c2d.lineCap = 'round';
    c2d.beginPath();
    c2d.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) {
      if (cum[k] <= limit) c2d.lineTo(pts[k][0], pts[k][1]);
      else {
        const f = Math.max(0, (limit - cum[k - 1]) / (cum[k] - cum[k - 1] || 1));
        if (f > 0)
          c2d.lineTo(
            pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f,
            pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f
          );
        break;
      }
    }
    c2d.stroke();
    for (const lf of leaves) {
      const grow = Math.min(1, Math.max(0, (reveal - lf.at) / 0.08));
      if (grow <= 0) continue;
      const sz = lf.size * grow * (1 + 0.05 * Math.sin(t * 0.7 + lf.x));
      c2d.fillStyle = rgb(lf.ci ? vineCol : gold, 0.9);
      c2d.save();
      c2d.translate(lf.x, lf.y);
      c2d.rotate(lf.ang);
      c2d.beginPath();
      c2d.moveTo(0, 0);
      c2d.quadraticCurveTo(sz, -sz * 0.7, sz * 2, 0);
      c2d.quadraticCurveTo(sz, sz * 0.7, 0, 0);
      c2d.fill();
      c2d.restore();
    }

    // --- rubricated text stubs ---
    const tx = bx + bs + w * 0.05;
    const lh = (h * 0.78) / lines.length;
    const barH = Math.min(lh * 0.42, h * 0.018);
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const y = h * 0.12 + i * lh;
      // Lines below the capital block reclaim the left margin.
      const lx = y > by + bs + barH ? w * 0.16 : tx;
      c2d.fillStyle = rgb(ln.red ? red : ink, ln.red ? 0.8 : 0.45);
      c2d.fillRect(lx, y, (w * 0.92 - lx) * ln.frac, barH);
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(VINE_SEC, params); // fully grown page
    },
    dispose() {
      cache = null;
    },
  };
}
