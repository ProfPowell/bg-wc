import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// equalizer — 80s hi-fi graphic equalizer. N vertical columns of discrete LED
// segments thump to a synthesized per-band spectrum: each band's level is a
// deterministic function of `t` (a sum of sines at musical ratios plus a slow
// seeded wander), with bass bands heavier/slower than treble. A floating
// peak-hold cap jumps to each band's max then falls under gravity. Segments
// ramp bottom→top through success→warning→error (green→amber→red); unlit
// segments are a dim fg on bg. `density` = band count, `intensity` = drive +
// brightness. `mode`: bars (default) | mirror (mirrored about centre) | dots
// (one moving dot + cap per band). Pure fillRect — cheap. staticFrame freezes
// a plausible spectrum.

const SEG = 16; // LED segments per column (full scale)

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let cache = null;
  // Peak-hold state per band (persists across frames; re-derived if band count changes).
  let peaks = [];
  let peakKey = '';

  function readMode() {
    const m = (host?.getAttribute('mode') || 'bars').toLowerCase();
    return m === 'mirror' || m === 'dots' ? m : 'bars';
  }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const bands = 8 + Math.round((params.density ?? 0.5) * 16); // 8..24
    const tone = [];
    for (let i = 0; i < bands; i++) {
      const f = i / (bands - 1); // 0 bass → 1 treble
      // Each band: two oscillators at seeded musical-ish rates + phases. Bass
      // bands move slower and hit harder; treble flickers faster and lighter.
      tone.push({
        r1: 0.5 + f * 4.5 + rng() * 0.6,
        r2: 1.3 + f * 7 + rng() * 1.2,
        p1: rng() * Math.PI * 2,
        p2: rng() * Math.PI * 2,
        wob: 0.3 + rng() * 0.5,
        wobR: 0.13 + rng() * 0.2,
        gain: (1 - f) * 0.32 + 0.55, // bass louder
      });
    }
    cache = { key, bands, tone };
    return cache;
  }

  // Deterministic 0..1 band level at time t.
  function levelOf(band, t, drive) {
    const a = 0.5 + 0.5 * Math.sin(t * band.r1 + band.p1);
    const b = 0.5 + 0.5 * Math.sin(t * band.r2 + band.p2);
    const wob = 0.5 + 0.5 * Math.sin(t * band.wobR + band.p1 * 1.7);
    let v = (a * 0.6 + b * 0.4) * (0.55 + band.wob * wob * 0.7) * band.gain * drive;
    return Math.min(1, Math.max(0, v));
  }

  function ensurePeaks(bands) {
    const k = `${bands}`;
    if (peakKey !== k || peaks.length !== bands) {
      peaks = new Array(bands).fill(0);
      peakKey = k;
    }
  }

  function frame(t, params) {
    const { bands, tone } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    ensurePeaks(bands);
    const mode = readMode();
    const intensity = params.intensity ?? 0.5;
    const drive = 0.7 + intensity * 0.7;

    const lo = mix(c.success || [0.2, 0.8, 0.3], c.fg || [0.5, 0.5, 0.5], 0.0);
    const mid = c.warning || [0.95, 0.75, 0.2];
    const hi = c.error || [0.95, 0.25, 0.2];
    const off = mix(c.fg || [0.4, 0.4, 0.4], c.bg && c.bg[3] > 0.01 ? c.bg : [0, 0, 0], 0.78);

    const pad = Math.min(w, h) * 0.04;
    const gw = (w - pad * 2) / bands;
    const colW = gw * 0.72;
    const gap = gw * 0.28;
    const baseY = mode === 'mirror' ? h / 2 : h - pad;
    const fullH = mode === 'mirror' ? h / 2 - pad : h - pad * 2;
    const segH = fullH / SEG;
    const litSegH = segH * 0.72; // gap between segments

    const segColor = (s) => {
      const f = s / (SEG - 1);
      return f < 0.6 ? mix(lo, mid, f / 0.6) : mix(mid, hi, (f - 0.6) / 0.4);
    };

    for (let i = 0; i < bands; i++) {
      const lvl = levelOf(tone[i], t, drive);
      // Peak hold: jump up instantly, fall under gravity.
      if (lvl > peaks[i]) peaks[i] = lvl;
      else peaks[i] = Math.max(lvl, peaks[i] - 0.012);
      const x = pad + i * gw + gap / 2;
      const litCount = Math.round(lvl * SEG);
      const peakSeg = Math.min(SEG - 1, Math.round(peaks[i] * SEG));

      const drawColumn = (dir) => {
        if (mode === 'dots') {
          // Single moving dot at the level + the peak cap.
          const yLvl = baseY - dir * (litCount * segH);
          c2d.fillStyle = rgb(segColor(litCount));
          c2d.fillRect(x, yLvl - dir * litSegH, colW, litSegH * dir);
        } else {
          for (let s = 0; s < SEG; s++) {
            const y = baseY - dir * (s + 1) * segH;
            c2d.fillStyle =
              s < litCount ? rgb(segColor(s), 0.55 + 0.45 * intensity) : rgb(off, 0.5);
            c2d.fillRect(x, y, colW, litSegH * dir);
          }
        }
        // Peak-hold cap (bright).
        const yc = baseY - dir * (peakSeg + 1) * segH;
        c2d.fillStyle = rgb(mix(segColor(peakSeg), [1, 1, 1], 0.4));
        c2d.fillRect(x, yc, colW, litSegH * dir);
      };

      drawColumn(1);
      if (mode === 'mirror') drawColumn(-1);
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
      // Freeze a plausible spectrum (peaks pre-settled near levels).
      const { bands, tone } = build(params);
      ensurePeaks(bands);
      for (let i = 0; i < bands; i++) peaks[i] = levelOf(tone[i], 3.1, 1) + 0.08;
      frame(3.1, params);
    },
    dispose() {
      cache = null;
      peaks = [];
    },
  };
}
