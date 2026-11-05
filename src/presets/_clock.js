// Fixed-step clock for stateful presets (gl-wc-beh4).
//
// The preset contract hands frame() a speed-scaled `t`. Presets that carry
// state between frames (ping-pong fields, accumulation buffers, agent arrays,
// growth) must integrate that state from ELAPSED TIME, never from "one step per
// frame() call" — per-call stepping runs twice as fast at 120 Hz, ignores
// speed=0, and mutates on every repeated call at the same t (so snapshots and
// reduced-motion stills advance the simulation).
//
// fixedStep(hz) turns the absolute t into a whole number of discrete steps:
//
//   const clock = fixedStep(60);
//   frame(t, params) {
//     const n = clock.advance(t);          // 0 when t did not move
//     for (let i = 0; i < n; i++) step(clock.time - (n - 1 - i) / hz);
//     display(params);
//   }
//
// Properties (pinned by test/time-rule.spec.js and test/clock-unit.mjs):
//   - Identical t → 0 steps → the state is untouched; display() is a pure
//     function of the state and t, so repeated calls are pixel-identical.
//   - The step count derives from the absolute elapsed time, not from an
//     accumulated per-frame delta, so a 60 Hz and a 120 Hz walk to the same t
//     take exactly the same step sequence (no float drift) and converge.
//   - Bounded: a single call yields at most `maxSteps` (default: 0.1 s worth,
//     matching the host's MAX_DT_S clamp); the surplus is dropped, so a long
//     stall can never trigger a catch-up spiral.
//   - t moving backwards (only a new instance ever does) re-bases the clock.
export function fixedStep(hz, maxSteps = Math.max(1, Math.round(hz * 0.1))) {
  let t0 = null; // t of the first advance() — the clock's epoch
  let done = 0; // whole steps accounted for since the epoch (taken or dropped)

  return {
    hz,
    // Whole steps elapsed since the previous advance(), capped at maxSteps.
    advance(t) {
      if (!(t >= 0)) return 0;
      if (t0 === null || t < t0) {
        t0 = t;
        done = 0;
        return 0;
      }
      // Epsilon absorbs i/hz rounding so a frame landing exactly on a step
      // boundary counts it (otherwise 59.9999 would floor to 59).
      const target = Math.floor((t - t0) * hz + 1e-6);
      let n = target - done;
      if (n > maxSteps) n = maxSteps;
      done = target;
      return n;
    },
    // Simulation time of the most recent step (seconds since the epoch).
    get time() {
      return done / hz;
    },
    reset() {
      t0 = null;
      done = 0;
    },
  };
}
