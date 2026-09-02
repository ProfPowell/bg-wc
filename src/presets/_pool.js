// src/presets/_pool.js
// The seeded-pool scaffold shared by particle / layout presets (gl-wc-e9z1).
//
// A preset lays out its particles (sparks, leaves, tiles…) once from a
// mulberry32(seed) stream and only rebuilds when a layout-affecting param
// changes — typically seed + density, sometimes quality or the canvas size.
// Every preset used to hand-roll the same rebuild/ensure/lastKey trio; this is
// that trio once.
//
//   const ensure = seededPool(
//     (params) => { …build from mulberry32(params.seed)…; return items; },
//     (params) => `${params.seed}|${params.density}|${w}x${h}`,   // optional
//   );
//   function frame(t, params) { const items = ensure(params); … }
//
// `build` may return anything (an array, or an object of several arrays);
// `ensure` returns it, rebuilding only when `keyOf(params)` changes.
export function seededPool(build, keyOf = defaultKey) {
  let items;
  let lastKey = null;
  return function ensure(params) {
    const key = keyOf(params);
    if (key !== lastKey) {
      items = build(params);
      lastKey = key;
    }
    return items;
  };
}

function defaultKey(params) {
  return `${params.seed}|${params.density}`;
}
