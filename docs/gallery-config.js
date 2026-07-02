// Shared between docs/gallery.js and test/gallery-context-budget.spec.js so
// the enforced budget and the tested budget can't drift apart. Keep this
// module side-effect-free — the test imports it in node.

// Most live WebGL backgrounds allowed at once. Headroom below the browser's
// ~16 live-WebGL-context limit for the persistent hero context and the brief
// overlap while an outgoing group's contexts are still being reclaimed. Only
// WebGL presets count toward this — Canvas2D cards hold no GPU context, so they
// always mount when visible (and never get starved by the budget).
export const MAX_WEBGL = 8;
