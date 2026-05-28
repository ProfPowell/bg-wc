import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ c2d, getColors }) {
  let w = 0, h = 0;
  function frame(/* t, params */) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
  }
  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame,
    staticFrame(params) { frame(0, params); },
  };
}
