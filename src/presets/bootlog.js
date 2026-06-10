import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// bootlog — a scrolling boot / kernel log. Lines appear over time with [ OK ]
// markers in the success colour (and the rare [FAIL] in error), on a schedule
// that mixes quick bursts with occasional stalls. The log scrolls up as it
// fills. Set the `text` attribute (lines split on '|') to override the message
// bodies. `density` = line height / how many lines fit. Deterministic from `t`.

const POOL = [
  'starting kernel',
  'probing pci bus',
  'mounting /dev/sda1',
  'loading module ext4',
  'bringing up eth0',
  'dhcp lease acquired',
  'starting systemd-journald',
  'initializing gpu driver',
  'scanning usb devices',
  'starting sshd',
  'calibrating clock source',
  'enabling swap',
  'loading firmware blob',
  'starting cron',
  'mounting /home',
  'checking filesystem',
  'starting network manager',
  'reticulating splines',
  'warming caches',
  'starting display manager',
];

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function lines(params) {
    const txt = (host?.getAttribute('text') || params.text || '').trim();
    return txt ? txt.split('|').map((s) => s.trim()) : POOL;
  }

  function build(params) {
    const msgs = lines(params);
    const key = `${params.seed | 0}|${msgs.join('|')}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    // Schedule: each entry appears at an accumulating time, with bursts (small
    // gaps) and occasional stalls (large gaps).
    const entries = [];
    let tt = 0.2;
    for (let i = 0; i < 240; i++) {
      const msg = msgs[i % msgs.length];
      const stall = rng() < 0.12;
      tt += stall ? 0.8 + rng() * 1.4 : 0.06 + rng() * 0.18;
      const status = rng() < 0.04 ? 'FAIL' : 'OK';
      entries.push({ t: tt, msg, status, suffix: (rng() * 9999) | 0 });
    }
    cache = { key, entries };
    return cache;
  }

  function frame(t, params) {
    const { entries } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const fg = c.fg || [0.85, 0.9, 0.85];
    const ok = c.success || [0.3, 0.9, 0.4];
    const err = c.error || [0.95, 0.3, 0.3];
    const dim = c.info || c.primary || [0.5, 0.7, 0.6];

    const density = params.density ?? 0.5;
    const lh = Math.max(12, Math.min(w, h) * (0.05 - 0.025 * density));
    c2d.font = `${(lh * 0.78) | 0}px monospace`;
    c2d.textBaseline = 'middle';
    const rows = Math.floor(h / lh) + 1;

    // How many entries have appeared by now. Offset the clock so a frozen first
    // frame (speed=0) already shows a screenful rather than an empty console.
    const teff = t + 5;
    let shown = 0;
    while (shown < entries.length && entries[shown].t <= teff) shown++;
    if (shown === 0) return;

    const first = Math.max(0, shown - rows);
    const pad = lh * 0.3;
    for (let i = first; i < shown; i++) {
      const e = entries[i];
      const y = (i - first) * lh + lh / 2;
      const isLast = i === shown - 1;
      const tag = isLast ? '[ .. ]' : e.status === 'OK' ? '[ OK ]' : '[FAIL]';
      const tagCol = isLast ? dim : e.status === 'OK' ? ok : err;
      c2d.fillStyle = rgb(dim, 0.7);
      const stamp = `[${(e.t * 1.37).toFixed(3)}]`;
      c2d.fillText(stamp, pad, y);
      const stampW = c2d.measureText(stamp).width + pad;
      c2d.fillStyle = rgb(fg, isLast ? 1 : 0.9);
      c2d.fillText(`  ${e.msg} #${e.suffix}`, stampW, y);
      c2d.fillStyle = rgb(tagCol, 1);
      c2d.fillText(tag, w - c2d.measureText(tag).width - pad, y);
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      frame(6, params); // a screenful of log
    },
    dispose() {
      cache = null;
    },
  };
}
