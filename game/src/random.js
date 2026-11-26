// A small seeded random number generator (mulberry32). The same seed always advances a flight
// the same way, which is what lets the screenshot scenes in shots.js replay a chosen moment.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed drawn from the clock, for a real play session that owes nothing to repeat exactly. */
export function freshSeed() {
  return (Date.now() ^ Math.floor(performance.now() * 1000)) | 0;
}
