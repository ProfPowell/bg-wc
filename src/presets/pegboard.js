import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// pegboard — a backlit toy peg board. Translucent pegs glow against a black
// perforated board; seeded pictures (star, heart, rocket, rainbow arc, drawn
// as authored coordinate grids) fill peg by peg, hold lit, then clear for the
// next. Pegs composite a pre-rendered core+halo sprite — no per-frame
// shadowBlur; unlit holes stay faintly visible. `density` = board resolution,
// `intensity` = peg glow. Deterministic from `t`.

const FILL_SEC = 0.06; // seconds per peg while filling
const HOLD_SEC = 4;
const CLEAR_SEC = 1.2;
const START_OFF = 6; // clock offset so a frozen first frame shows a lit picture

// Pictures as row strings on a 13×11 grid: '.'=empty, letters = palette slot.
const PICTURES = [
  // star
  [
    '......a......',
    '.....aaa.....',
    '.....aaa.....',
    'aaaaaaaaaaaaa',
    '.aaaaaaaaaaa.',
    '...aaaaaaa...',
    '....aaaaa....',
    '...aaa.aaa...',
    '..aaa...aaa..',
    '.aa.......aa.',
    '.............',
  ],
  // heart
  [
    '..bbb...bbb..',
    '.bbbbb.bbbbb.',
    'bbbbbbbbbbbbb',
    'bbbbbbbbbbbbb',
    'bbbbbbbbbbbbb',
    '.bbbbbbbbbbb.',
    '..bbbbbbbbb..',
    '...bbbbbbb...',
    '....bbbbb....',
    '.....bbb.....',
    '......b......',
  ],
  // rocket
  [
    '......c......',
    '.....ccc.....',
    '.....ccc.....',
    '....ccccc....',
    '....ccccc....',
    '....ccccc....',
    '...ccccccc...',
    '..cc.ccc.cc..',
    '.cc..ccc..cc.',
    '.....ddd.....',
    '....d.d.d....',
  ],
  // rainbow arc
  [
    '....aaaaa....',
    '..aabbbbbaa..',
    '.abbcccccbba.',
    'abbccdddccbba',
    'abccd...dccba',
    'bccd.....dccb',
    'bcd.......dcb',
    '.............',
    '.............',
    '.............',
    '.............',
  ],
];

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let board = null;
  let sprites = new Map();
  let geo = null; // { pitch, ox, oy, cols, rows }

  function layout(params) {
    const cols = 17 + Math.round((params.density ?? 0.5) * 14);
    const pitch = w / cols;
    const rows = Math.ceil(h / pitch);
    if (geo && geo.cols === cols && geo.rows === rows && geo.w === w) return geo;
    geo = { cols, rows, pitch, w };
    board = null;
    return geo;
  }

  function boardLayer(g) {
    if (board && board.width === w && board.height === h) return board;
    board = document.createElement('canvas');
    board.width = w;
    board.height = h;
    const o = board.getContext('2d');
    o.fillStyle = 'rgb(8,8,10)';
    o.fillRect(0, 0, w, h);
    // Unlit holes: faint rims.
    o.fillStyle = 'rgba(255,255,255,0.05)';
    for (let r = 0; r < g.rows; r++) {
      for (let q = 0; q < g.cols; q++) {
        o.beginPath();
        o.arc((q + 0.5) * g.pitch, (r + 0.5) * g.pitch, g.pitch * 0.16, 0, Math.PI * 2);
        o.fill();
      }
    }
    return board;
  }

  function pegSprite(col, intensity) {
    const key = `${rgb(col)}|${intensity.toFixed(2)}`;
    let s = sprites.get(key);
    if (s) return s;
    const S = 48;
    s = document.createElement('canvas');
    s.width = S;
    s.height = S;
    const o = s.getContext('2d');
    const g = o.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.18, rgb(col, 1));
    g.addColorStop(0.34, rgb(col, 0.5 + 0.3 * intensity));
    g.addColorStop(1, rgb(col, 0));
    o.fillStyle = g;
    o.fillRect(0, 0, S, S);
    sprites.set(key, s);
    return s;
  }

  // Pegs for picture `idx`, centred on the board, in seeded fill order.
  function pegsFor(idx, g, params) {
    const pic = PICTURES[idx % PICTURES.length];
    const ph = pic.length;
    const pw = pic[0].length;
    const ox = Math.floor((g.cols - pw) / 2);
    const oy = Math.floor((g.rows - ph) / 2);
    const pegs = [];
    for (let r = 0; r < ph; r++)
      for (let q = 0; q < pw; q++) {
        const ch = pic[r][q];
        if (ch !== '.') pegs.push({ q: ox + q, r: oy + r, slot: ch.charCodeAt(0) - 97 });
      }
    const rng = mulberry32((params.seed | 0 || 1) ^ (idx * 40503));
    for (let i = pegs.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      [pegs[i], pegs[j]] = [pegs[j], pegs[i]];
    }
    return pegs;
  }

  function frame(t0, params) {
    const t = t0 + START_OFF;
    const g = layout(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    c2d.drawImage(boardLayer(g), 0, 0);
    const roles = [c.accent, c.warning, c.info, c.success, c.primary].filter(Boolean);
    if (!roles.length) roles.push([1, 0.6, 0.3]);
    const intensity = params.intensity ?? 0.5;

    // Seeded picture order, advancing one per cycle.
    const rng = mulberry32(params.seed | 0 || 1);
    const order = [0, 1, 2, 3];
    for (let i = order.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
    // Cycle length depends on this picture's peg count.
    let tt = t;
    let pi = 0;
    let pegs = pegsFor(order[0], g, params);
    for (let guard = 0; guard < 64; guard++) {
      const cyc = pegs.length * FILL_SEC + HOLD_SEC + CLEAR_SEC;
      if (tt < cyc) break;
      tt -= cyc;
      pi = (pi + 1) % order.length;
      pegs = pegsFor(order[pi], g, params);
    }

    const fillT = pegs.length * FILL_SEC;
    let lit;
    let alpha = 1;
    if (tt < fillT) lit = Math.floor(tt / FILL_SEC);
    else if (tt < fillT + HOLD_SEC) lit = pegs.length;
    else {
      lit = pegs.length;
      alpha = 1 - (tt - fillT - HOLD_SEC) / CLEAR_SEC;
    }

    c2d.globalAlpha = Math.max(0, alpha);
    const ps = g.pitch * 1.7;
    for (let i = 0; i < lit; i++) {
      const peg = pegs[i];
      const col = roles[peg.slot % roles.length];
      const x = (peg.q + 0.5) * g.pitch;
      const y = (peg.r + 0.5) * g.pitch;
      c2d.drawImage(pegSprite(col, intensity), x - ps / 2, y - ps / 2, ps, ps);
    }
    c2d.globalAlpha = 1;
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      board = null;
      geo = null;
      sprites = new Map();
    },
    frame,
    staticFrame(params) {
      const g = layout(params);
      // First picture in the seeded order, fully lit (same shuffle as frame).
      const rng = mulberry32(params.seed | 0 || 1);
      const order = [0, 1, 2, 3];
      for (let i = order.length - 1; i > 0; i--) {
        const j = (rng() * (i + 1)) | 0;
        [order[i], order[j]] = [order[j], order[i]];
      }
      const pegs = pegsFor(order[0], g, params);
      frame(pegs.length * FILL_SEC + 0.5, params);
    },
    dispose() {
      board = null;
      geo = null;
      sprites = new Map();
    },
  };
}
