// fly-through — a composable CSS-3D tunnel the camera flies through.
// Axes (read from the `mode` attribute, space-delimited):
//   profile: ring | corridor | hex | tube   (cross-section shape)
//   path:    straight | helix | wave         (centerline flown)
//   unit:    cube | sphere | pyramid | card  (repeated element)
// Defaults reproduce the reference pen
// (docs/superpowers/plans/found-demos/fly-through/fly.css).

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const PROFILES = ['ring', 'corridor', 'hex', 'tube'];
const PATHS = ['straight', 'helix', 'wave'];
const UNITS = ['cube', 'sphere', 'pyramid', 'card'];
// `orbit` (default) rotates the whole tunnel in view — always full, the best
// resting background. `fly` sends the camera down the tube (immersive, but the
// view is sparse at the phases where you're between rings).
const MOTIONS = ['orbit', 'fly'];

function parseMode(host) {
  const tokens = (host.getAttribute('mode') || '').toLowerCase().split(/\s+/).filter(Boolean);
  return {
    profile: tokens.find((t) => PROFILES.includes(t)) || 'ring',
    path: tokens.find((t) => PATHS.includes(t)) || 'straight',
    unit: tokens.find((t) => UNITS.includes(t)) || 'cube',
    motion: tokens.find((t) => MOTIONS.includes(t)) || 'orbit',
  };
}

function ringTransform(profile, i, N) {
  const a = (i * 720) / N;
  const rad = (d) => (d * Math.PI) / 180;
  if (profile === 'tube') {
    const x = -8 + 8 * Math.cos(rad(a));
    const z = -8 * Math.sin(rad(a));
    const ry = a <= 360 ? a : 720 - a;
    return `translate3d(${x}em, 0em, ${z}em) rotateY(${ry}deg)`;
  }
  // ring (default), corridor, hex share the torus path.
  const x = -10 + 10 * Math.cos(rad(a));
  const y = 5 * Math.cos(rad(a / 2));
  const z = -10 * Math.sin(rad(a));
  const ry = a <= 360 ? a : 720 - a;
  const rx = -15 * Math.sin(rad(a / 2));
  return `translate3d(${x}em, ${y}em, ${z}em) rotateY(${ry}deg) rotateX(${rx}deg)`;
}

function pathOffset(path, i, N) {
  if (path === 'helix') return ` rotateZ(${(i * 360) / N}deg)`;
  if (path === 'wave') return ` translateX(${3 * Math.sin((i / N) * Math.PI * 4)}em)`;
  return '';
}

function unitCount(profile) {
  if (profile === 'corridor') return 4;
  if (profile === 'tube') return 12;
  return 6; // ring, hex
}

function makeUnit(unit, n, count) {
  const ry = (n * 360) / count;
  const el = document.createElement('i');
  el.style.setProperty('--ry', `${ry}deg`);
  const light = 80 - Math.abs((n / count) * 2 - 1) * 45; // 35%..80%
  el.style.setProperty('--light', `${light}%`);
  el.dataset.unit = unit;
  return el;
}

import { rgbCss as rgb } from '../renderer/tokens.js';

// Returns [r, g, b] each 0..255
function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

const KEYFRAMES = `
@keyframes scene { from { transform: rotateX(-45deg) rotateY(0deg); } to { transform: rotateX(-45deg) rotateY(360deg); } }
@keyframes flyThrough {
	100% {
		transform: translate3d(0em, 5em, calc(0em + var(--perspective))) rotateY(0deg) rotateX(0deg);
	}
	98.6111111111% {
		transform: translate3d(-0.1519224699em, 4.9809734905em, calc(-1.7364817767em + var(--perspective))) rotateY(10deg) rotateX(0.2614672282deg);
	}
	97.2222222222% {
		transform: translate3d(-0.6030737921em, 4.9240387651em, calc(-3.4202014333em + var(--perspective))) rotateY(20deg) rotateX(0.520944533deg);
	}
	95.8333333333% {
		transform: translate3d(-1.3397459622em, 4.8296291314em, calc(-5em + var(--perspective))) rotateY(30deg) rotateX(0.7764571353deg);
	}
	94.4444444444% {
		transform: translate3d(-2.3395555688em, 4.6984631039em, calc(-6.4278760969em + var(--perspective))) rotateY(40deg) rotateX(1.02606043deg);
	}
	93.0555555556% {
		transform: translate3d(-3.5721239031em, 4.5315389352em, calc(-7.6604444312em + var(--perspective))) rotateY(50deg) rotateX(1.2678547852deg);
	}
	91.6666666667% {
		transform: translate3d(-5em, 4.3301270189em, calc(-8.6602540378em + var(--perspective))) rotateY(60deg) rotateX(1.5deg);
	}
	90.2777777778% {
		transform: translate3d(-6.5797985667em, 4.0957602214em, calc(-9.3969262079em + var(--perspective))) rotateY(70deg) rotateX(1.7207293091deg);
	}
	88.8888888889% {
		transform: translate3d(-8.2635182233em, 3.8302222156em, calc(-9.8480775301em + var(--perspective))) rotateY(80deg) rotateX(1.9283628291deg);
	}
	87.5% {
		transform: translate3d(-10em, 3.5355339059em, calc(-10em + var(--perspective))) rotateY(90deg) rotateX(2.1213203436deg);
	}
	86.1111111111% {
		transform: translate3d(-11.7364817767em, 3.2139380484em, calc(-9.8480775301em + var(--perspective))) rotateY(100deg) rotateX(2.2981333294deg);
	}
	84.7222222222% {
		transform: translate3d(-13.4202014333em, 2.8678821818em, calc(-9.3969262079em + var(--perspective))) rotateY(110deg) rotateX(2.4574561329deg);
	}
	83.3333333333% {
		transform: translate3d(-15em, 2.5em, calc(-8.6602540378em + var(--perspective))) rotateY(120deg) rotateX(2.5980762114deg);
	}
	81.9444444444% {
		transform: translate3d(-16.4278760969em, 2.1130913087em, calc(-7.6604444312em + var(--perspective))) rotateY(130deg) rotateX(2.7189233611deg);
	}
	80.5555555556% {
		transform: translate3d(-17.6604444312em, 1.7101007166em, calc(-6.4278760969em + var(--perspective))) rotateY(140deg) rotateX(2.8190778624deg);
	}
	79.1666666667% {
		transform: translate3d(-18.6602540378em, 1.2940952255em, calc(-5em + var(--perspective))) rotateY(150deg) rotateX(2.8977774789deg);
	}
	77.7777777778% {
		transform: translate3d(-19.3969262079em, 0.8682408883em, calc(-3.4202014333em + var(--perspective))) rotateY(160deg) rotateX(2.954423259deg);
	}
	76.3888888889% {
		transform: translate3d(-19.8480775301em, 0.4357787137em, calc(-1.7364817767em + var(--perspective))) rotateY(170deg) rotateX(2.9885840943deg);
	}
	75% {
		transform: translate3d(-20em, 0em, calc(0em + var(--perspective))) rotateY(180deg) rotateX(3deg);
	}
	73.6111111111% {
		transform: translate3d(-19.8480775301em, -0.4357787137em, calc(1.7364817767em + var(--perspective))) rotateY(190deg) rotateX(2.9885840943deg);
	}
	72.2222222222% {
		transform: translate3d(-19.3969262079em, -0.8682408883em, calc(3.4202014333em + var(--perspective))) rotateY(200deg) rotateX(2.954423259deg);
	}
	70.8333333333% {
		transform: translate3d(-18.6602540378em, -1.2940952255em, calc(5em + var(--perspective))) rotateY(210deg) rotateX(2.8977774789deg);
	}
	69.4444444444% {
		transform: translate3d(-17.6604444312em, -1.7101007166em, calc(6.4278760969em + var(--perspective))) rotateY(220deg) rotateX(2.8190778624deg);
	}
	68.0555555556% {
		transform: translate3d(-16.4278760969em, -2.1130913087em, calc(7.6604444312em + var(--perspective))) rotateY(230deg) rotateX(2.7189233611deg);
	}
	66.6666666667% {
		transform: translate3d(-15em, -2.5em, calc(8.6602540378em + var(--perspective))) rotateY(240deg) rotateX(2.5980762114deg);
	}
	65.2777777778% {
		transform: translate3d(-13.4202014333em, -2.8678821818em, calc(9.3969262079em + var(--perspective))) rotateY(250deg) rotateX(2.4574561329deg);
	}
	63.8888888889% {
		transform: translate3d(-11.7364817767em, -3.2139380484em, calc(9.8480775301em + var(--perspective))) rotateY(260deg) rotateX(2.2981333294deg);
	}
	62.5% {
		transform: translate3d(-10em, -3.5355339059em, calc(10em + var(--perspective))) rotateY(270deg) rotateX(2.1213203436deg);
	}
	61.1111111111% {
		transform: translate3d(-8.2635182233em, -3.8302222156em, calc(9.8480775301em + var(--perspective))) rotateY(280deg) rotateX(1.9283628291deg);
	}
	59.7222222222% {
		transform: translate3d(-6.5797985667em, -4.0957602214em, calc(9.3969262079em + var(--perspective))) rotateY(290deg) rotateX(1.7207293091deg);
	}
	58.3333333333% {
		transform: translate3d(-5em, -4.3301270189em, calc(8.6602540378em + var(--perspective))) rotateY(300deg) rotateX(1.5deg);
	}
	56.9444444444% {
		transform: translate3d(-3.5721239031em, -4.5315389352em, calc(7.6604444312em + var(--perspective))) rotateY(310deg) rotateX(1.2678547852deg);
	}
	55.5555555556% {
		transform: translate3d(-2.3395555688em, -4.6984631039em, calc(6.4278760969em + var(--perspective))) rotateY(320deg) rotateX(1.02606043deg);
	}
	54.1666666667% {
		transform: translate3d(-1.3397459622em, -4.8296291314em, calc(5em + var(--perspective))) rotateY(330deg) rotateX(0.7764571353deg);
	}
	52.7777777778% {
		transform: translate3d(-0.6030737921em, -4.9240387651em, calc(3.4202014333em + var(--perspective))) rotateY(340deg) rotateX(0.520944533deg);
	}
	51.3888888889% {
		transform: translate3d(-0.1519224699em, -4.9809734905em, calc(1.7364817767em + var(--perspective))) rotateY(350deg) rotateX(0.2614672282deg);
	}
	50% {
		transform: translate3d(0em, -5em, calc(0em + var(--perspective))) rotateY(360deg) rotateX(0deg);
	}
	48.6111111111% {
		transform: translate3d(0.1519224699em, -4.9809734905em, calc(-1.7364817767em + var(--perspective))) rotateY(350deg) rotateX(-0.2614672282deg);
	}
	47.2222222222% {
		transform: translate3d(0.6030737921em, -4.9240387651em, calc(-3.4202014333em + var(--perspective))) rotateY(340deg) rotateX(-0.520944533deg);
	}
	45.8333333333% {
		transform: translate3d(1.3397459622em, -4.8296291314em, calc(-5em + var(--perspective))) rotateY(330deg) rotateX(-0.7764571353deg);
	}
	44.4444444444% {
		transform: translate3d(2.3395555688em, -4.6984631039em, calc(-6.4278760969em + var(--perspective))) rotateY(320deg) rotateX(-1.02606043deg);
	}
	43.0555555556% {
		transform: translate3d(3.5721239031em, -4.5315389352em, calc(-7.6604444312em + var(--perspective))) rotateY(310deg) rotateX(-1.2678547852deg);
	}
	41.6666666667% {
		transform: translate3d(5em, -4.3301270189em, calc(-8.6602540378em + var(--perspective))) rotateY(300deg) rotateX(-1.5deg);
	}
	40.2777777778% {
		transform: translate3d(6.5797985667em, -4.0957602214em, calc(-9.3969262079em + var(--perspective))) rotateY(290deg) rotateX(-1.7207293091deg);
	}
	38.8888888889% {
		transform: translate3d(8.2635182233em, -3.8302222156em, calc(-9.8480775301em + var(--perspective))) rotateY(280deg) rotateX(-1.9283628291deg);
	}
	37.5% {
		transform: translate3d(10em, -3.5355339059em, calc(-10em + var(--perspective))) rotateY(270deg) rotateX(-2.1213203436deg);
	}
	36.1111111111% {
		transform: translate3d(11.7364817767em, -3.2139380484em, calc(-9.8480775301em + var(--perspective))) rotateY(260deg) rotateX(-2.2981333294deg);
	}
	34.7222222222% {
		transform: translate3d(13.4202014333em, -2.8678821818em, calc(-9.3969262079em + var(--perspective))) rotateY(250deg) rotateX(-2.4574561329deg);
	}
	33.3333333333% {
		transform: translate3d(15em, -2.5em, calc(-8.6602540378em + var(--perspective))) rotateY(240deg) rotateX(-2.5980762114deg);
	}
	31.9444444444% {
		transform: translate3d(16.4278760969em, -2.1130913087em, calc(-7.6604444312em + var(--perspective))) rotateY(230deg) rotateX(-2.7189233611deg);
	}
	30.5555555556% {
		transform: translate3d(17.6604444312em, -1.7101007166em, calc(-6.4278760969em + var(--perspective))) rotateY(220deg) rotateX(-2.8190778624deg);
	}
	29.1666666667% {
		transform: translate3d(18.6602540378em, -1.2940952255em, calc(-5em + var(--perspective))) rotateY(210deg) rotateX(-2.8977774789deg);
	}
	27.7777777778% {
		transform: translate3d(19.3969262079em, -0.8682408883em, calc(-3.4202014333em + var(--perspective))) rotateY(200deg) rotateX(-2.954423259deg);
	}
	26.3888888889% {
		transform: translate3d(19.8480775301em, -0.4357787137em, calc(-1.7364817767em + var(--perspective))) rotateY(190deg) rotateX(-2.9885840943deg);
	}
	25% {
		transform: translate3d(20em, 0em, calc(0em + var(--perspective))) rotateY(180deg) rotateX(-3deg);
	}
	23.6111111111% {
		transform: translate3d(19.8480775301em, 0.4357787137em, calc(1.7364817767em + var(--perspective))) rotateY(170deg) rotateX(-2.9885840943deg);
	}
	22.2222222222% {
		transform: translate3d(19.3969262079em, 0.8682408883em, calc(3.4202014333em + var(--perspective))) rotateY(160deg) rotateX(-2.954423259deg);
	}
	20.8333333333% {
		transform: translate3d(18.6602540378em, 1.2940952255em, calc(5em + var(--perspective))) rotateY(150deg) rotateX(-2.8977774789deg);
	}
	19.4444444444% {
		transform: translate3d(17.6604444312em, 1.7101007166em, calc(6.4278760969em + var(--perspective))) rotateY(140deg) rotateX(-2.8190778624deg);
	}
	18.0555555556% {
		transform: translate3d(16.4278760969em, 2.1130913087em, calc(7.6604444312em + var(--perspective))) rotateY(130deg) rotateX(-2.7189233611deg);
	}
	16.6666666667% {
		transform: translate3d(15em, 2.5em, calc(8.6602540378em + var(--perspective))) rotateY(120deg) rotateX(-2.5980762114deg);
	}
	15.2777777778% {
		transform: translate3d(13.4202014333em, 2.8678821818em, calc(9.3969262079em + var(--perspective))) rotateY(110deg) rotateX(-2.4574561329deg);
	}
	13.8888888889% {
		transform: translate3d(11.7364817767em, 3.2139380484em, calc(9.8480775301em + var(--perspective))) rotateY(100deg) rotateX(-2.2981333294deg);
	}
	12.5% {
		transform: translate3d(10em, 3.5355339059em, calc(10em + var(--perspective))) rotateY(90deg) rotateX(-2.1213203436deg);
	}
	11.1111111111% {
		transform: translate3d(8.2635182233em, 3.8302222156em, calc(9.8480775301em + var(--perspective))) rotateY(80deg) rotateX(-1.9283628291deg);
	}
	9.7222222222% {
		transform: translate3d(6.5797985667em, 4.0957602214em, calc(9.3969262079em + var(--perspective))) rotateY(70deg) rotateX(-1.7207293091deg);
	}
	8.3333333333% {
		transform: translate3d(5em, 4.3301270189em, calc(8.6602540378em + var(--perspective))) rotateY(60deg) rotateX(-1.5deg);
	}
	6.9444444444% {
		transform: translate3d(3.5721239031em, 4.5315389352em, calc(7.6604444312em + var(--perspective))) rotateY(50deg) rotateX(-1.2678547852deg);
	}
	5.5555555556% {
		transform: translate3d(2.3395555688em, 4.6984631039em, calc(6.4278760969em + var(--perspective))) rotateY(40deg) rotateX(-1.02606043deg);
	}
	4.1666666667% {
		transform: translate3d(1.3397459622em, 4.8296291314em, calc(5em + var(--perspective))) rotateY(30deg) rotateX(-0.7764571353deg);
	}
	2.7777777778% {
		transform: translate3d(0.6030737921em, 4.9240387651em, calc(3.4202014333em + var(--perspective))) rotateY(20deg) rotateX(-0.520944533deg);
	}
	1.3888888889% {
		transform: translate3d(0.1519224699em, 4.9809734905em, calc(1.7364817767em + var(--perspective))) rotateY(10deg) rotateX(-0.2614672282deg);
	}
	0% {
		transform: translate3d(0em, 5em, calc(0em + var(--perspective))) rotateY(0deg) rotateX(0deg);
	}
}
`;

function styleFor() {
  return `
    .stage { perspective: var(--perspective, 600px); overflow: hidden; display: grid; place-items: center; }
    .stage .scene { position: relative; transform-style: preserve-3d;
      animation-name: var(--fly-anim, scene);
      animation-duration: var(--fly-dur, 48s);
      animation-delay: var(--fly-delay, 0s);
      animation-iteration-count: infinite;
      animation-timing-function: linear; }
    .ring { position: absolute; transform-style: preserve-3d; }
    .ring i { position: absolute; inset: -0.275em -0.55em; transform-style: preserve-3d;
      transform: rotateX(90deg) rotateY(var(--ry, 0deg)) translateZ(1em); }
    .ring i[data-unit='sphere'] { border-radius: 50%; }
    .ring i[data-unit='card'] { inset: -0.4em -0.6em; }
    .ring i[data-unit='pyramid'] { clip-path: polygon(50% 0, 100% 100%, 0 100%); }
    ${KEYFRAMES}
    ${PAUSE_RULE}
  `;
}

export function create({ host, css3d, getColors, getParams }) {
  css3d.mountStyle(styleFor());

  const { profile, path, unit, motion } = parseMode(host);
  const p = getParams();
  const N = Math.max(8, Math.round(8 + p.density * 64));
  const count = unitCount(profile);

  const scene = document.createElement('div');
  scene.className = 'scene';
  for (let i = 0; i < N; i++) {
    const ring = document.createElement('div');
    ring.className = 'ring';
    ring.style.transform = ringTransform(profile, i, N) + pathOffset(path, i, N);
    for (let n = 0; n < count; n++) ring.appendChild(makeUnit(unit, n, count));
    scene.appendChild(ring);
  }
  css3d.stage.appendChild(scene);

  let lastSpeed = null;
  let lastColorKey = null;

  function reconcile() {
    const params = getParams();
    const c = getColors();
    css3d.setVars({
      // `orbit` rotates the whole tunnel (the `scene` keyframe — always full);
      // `fly` sends the camera through it (the `flyThrough` keyframe).
      '--fly-anim': motion === 'fly' ? 'flyThrough' : 'scene',
      // `em` (not px) so perspective tracks the stage font-size set in resize();
      // 25..62em ≈ the prior 400..1000px at the baseline 16px font.
      '--perspective': `${(25 + params.intensity * 37.5).toFixed(1)}em`,
    });
    if (params.speed !== lastSpeed) {
      lastSpeed = params.speed;
      // Orbit reads best slow and majestic; fly wants a quicker pass.
      const dur = (motion === 'fly' ? 24 : 60) / Math.max(0.05, params.speed);
      css3d.setVars({
        '--fly-dur': `${dur.toFixed(2)}s`,
        // Only fly needs a starting offset (skip the degenerate first frame);
        // any orbit angle is already a full view.
        '--fly-delay': motion === 'fly' ? `${(-0.75 * dur).toFixed(2)}s` : '0s',
      });
    }
    const spectrum = params.palette === 'spectrum';
    const key = spectrum ? 'spectrum' : rgb(c.primary) + rgb(c.accent) + rgb(c.info);
    if (key !== lastColorKey) {
      lastColorKey = key;
      const rings = scene.querySelectorAll('.ring');
      const palette = [c.primary, c.accent, c.info];
      rings.forEach((ring, ri) => {
        const baseColor = spectrum
          ? null // handled via HSL per unit
          : palette[ri % palette.length];
        ring.querySelectorAll('i').forEach((face) => {
          const lightFactor = parseFloat(face.style.getPropertyValue('--light') || '60') / 100;
          let rv, gv, bv;
          if (spectrum) {
            const h = (ri * 360) / rings.length;
            [rv, gv, bv] = hslToRgb(h / 360, 0.5, lightFactor * 0.6 + 0.2);
          } else {
            // blend base color towards white by lightFactor
            rv = Math.round((baseColor[0] + (1 - baseColor[0]) * (1 - lightFactor)) * 255);
            gv = Math.round((baseColor[1] + (1 - baseColor[1]) * (1 - lightFactor)) * 255);
            bv = Math.round((baseColor[2] + (1 - baseColor[2]) * (1 - lightFactor)) * 255);
          }
          face.style.backgroundColor = `rgb(${rv}, ${gv}, ${bv})`;
        });
      });
    }
  }

  reconcile();

  return {
    setPlaying(pl) {
      css3d.setPlaying(pl);
    },
    frame() {
      reconcile();
    },
    resize(w, h) {
      // Scale the scene DOWN for small containers (gallery cards), capped at the
      // 16px baseline so a full-viewport hero keeps the tuned look. Perspective
      // is in em, so the tunnel holds its proportions at any size.
      css3d.stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 44))}px`;
    },
    dispose() {
      css3d.dispose();
    },
  };
}
