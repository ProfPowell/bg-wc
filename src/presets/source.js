import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';

const DEFAULT_LISTING = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Hello, world</title>
  <link rel="stylesheet" href="/style.css">
  <script type="module" src="/app.js"></script>
</head>
<body>
  <header class="site-nav">
    <a href="/" class="logo">Pint</a>
    <nav>
      <a href="/work">Work</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section class="hero">
      <h1>An extension of your team.</h1>
      <p class="lede">Websites, apps, and software, built to last.</p>
      <a href="/contact" class="cta">Start a conversation</a>
    </section>
    <section class="services">
      <article class="card">
        <h3>Strategy</h3>
        <p>Roadmaps, audits, discovery.</p>
      </article>
      <article class="card">
        <h3>Design</h3>
        <p>Identity, systems, UX.</p>
      </article>
      <article class="card">
        <h3>Engineering</h3>
        <p>Web, mobile, platform.</p>
      </article>
    </section>
    <section class="proof">
      <blockquote>
        "They felt like part of our team from day one."
        <cite>— Director of Engineering, Fortune 100</cite>
      </blockquote>
    </section>
  </main>
  <footer>
    <small>&copy; 2026 Pint, Inc.</small>
  </footer>
  <script>
    (function () {
      const links = document.querySelectorAll('a[data-prefetch]');
      links.forEach((a) => a.addEventListener('mouseenter', () => fetch(a.href)));
    }());
  </script>
</body>
</html>`;

const FLICKER_TTL = 0.35;

function tokenize(line) {
  const out = [];
  let rest = line;
  const push = (type, text) => out.push({ type, text });
  const ws = rest.match(/^\s*/)[0];
  if (ws) push('text', ws);
  rest = rest.slice(ws.length);

  while (rest.length > 0) {
    if (rest.startsWith('<')) {
      const m = rest.match(/^<\/?[\w!-]+/);
      if (m) {
        push('tag', m[0]);
        rest = rest.slice(m[0].length);
        continue;
      }
      push('text', '<');
      rest = rest.slice(1);
      continue;
    }
    if (rest[0] === '>' || rest.startsWith('/>')) {
      const tk = rest.startsWith('/>') ? '/>' : '>';
      push('tag', tk);
      rest = rest.slice(tk.length);
      continue;
    }
    const attr = rest.match(/^\s*[\w-]+=/);
    if (attr) {
      push('text', attr[0].match(/^\s*/)[0]);
      push('attr', attr[0].trim());
      rest = rest.slice(attr[0].length);
      continue;
    }
    const str = rest.match(/^"[^"]*"/);
    if (str) {
      push('string', str[0]);
      rest = rest.slice(str[0].length);
      continue;
    }
    const ch = rest.match(/^[^<>]+/);
    if (ch) {
      push('text', ch[0]);
      rest = rest.slice(ch[0].length);
      continue;
    }
    push('text', rest[0]);
    rest = rest.slice(1);
  }
  return out;
}

export function create({ c2d, getColors, getParams: _getParams }) {
  let w = 0, h = 0;
  let lines = null;
  let lastText = null;
  let lastSeed = -1;
  let rng = mulberry32(1);
  let scroll = 0;
  let lastT = 0;
  let flickers = [];
  let flickerAcc = 0;

  function rgb(v, a) {
    return `rgba(${(v[0] * 255) | 0},${(v[1] * 255) | 0},${(v[2] * 255) | 0},${a})`;
  }

  function colorFor(tokType, c) {
    return tokType === 'tag' ? c.primary
      : tokType === 'attr' ? c.accent
      : tokType === 'string' ? c.info
      : c.fg;
  }

  function alphaFor(tokType) {
    return tokType === 'tag' ? 0.4
      : tokType === 'attr' ? 0.45
      : tokType === 'string' ? 0.45
      : 0.25;
  }

  function ensure(params) {
    const text = (params.text && params.text.length > 0) ? params.text : DEFAULT_LISTING;
    if (text !== lastText) {
      lastText = text;
      lines = text.split('\n').map(tokenize);
      scroll = 0;
      flickers = [];
    }
    const seed = params.seed | 0;
    if (seed !== lastSeed) {
      lastSeed = seed;
      rng = mulberry32(seed || 1);
    }
  }

  function fontSizeFor(params) {
    return Math.max(9, Math.min(14, 9 + params.density * 5));
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;
    scroll += dt * 16;

    const fontSize = fontSizeFor(params);
    const lineH = fontSize * 1.4;
    c2d.font = `${fontSize}px ui-monospace, monospace`;
    c2d.textBaseline = 'top';

    const totalH = lines.length * lineH;
    const offY = -((scroll) % totalH);

    flickerAcc += dt;
    const flickerRate = 0.4 + params.intensity * 2.0;
    while (flickerAcc > 1 / flickerRate) {
      flickerAcc -= 1 / flickerRate;
      const li = Math.floor(rng() * lines.length);
      const tokens = lines[li];
      if (!tokens || tokens.length === 0) continue;
      const ti = Math.floor(rng() * tokens.length);
      flickers.push({ li, ti, ttl: FLICKER_TTL });
    }
    for (let i = flickers.length - 1; i >= 0; i--) {
      flickers[i].ttl -= dt;
      if (flickers[i].ttl <= 0) flickers.splice(i, 1);
    }

    for (let pass = 0; pass < 2; pass++) {
      const baseY = offY + pass * totalH;
      for (let i = 0; i < lines.length; i++) {
        const y = baseY + i * lineH;
        if (y < -lineH || y > h) continue;
        let x = 8;
        for (let ti = 0; ti < lines[i].length; ti++) {
          const tok = lines[i][ti];
          const flick = flickers.find((f) => f.li === i && f.ti === ti);
          const baseAlpha = alphaFor(tok.type);
          const a = flick ? Math.min(1, baseAlpha + 0.5 * (flick.ttl / FLICKER_TTL)) : baseAlpha;
          c2d.fillStyle = rgb(colorFor(tok.type, c), a);
          c2d.fillText(tok.text, x, y);
          x += c2d.measureText(tok.text).width;
        }
      }
    }
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame,
    staticFrame(params) {
      ensure(params);
      const c = getColors();
      clearAndFill(c2d, w, h, c.bg);
      const fontSize = fontSizeFor(params);
      const lineH = fontSize * 1.4;
      c2d.font = `${fontSize}px ui-monospace, monospace`;
      c2d.textBaseline = 'top';
      for (let i = 0; i < lines.length; i++) {
        const y = i * lineH;
        if (y > h) break;
        let x = 8;
        for (const tok of lines[i]) {
          c2d.fillStyle = rgb(colorFor(tok.type, c), alphaFor(tok.type));
          c2d.fillText(tok.text, x, y);
          x += c2d.measureText(tok.text).width;
        }
      }
    },
    dispose() {
      lines = null;
      lastText = null;
      flickers = [];
    },
  };
}
