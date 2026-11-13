// Central tuning knobs. Tweak gameplay here instead of hunting through systems.
export const CONFIG = {
  track: {
    width: 14,              // playable width (x from -width/2 to +width/2)
    segmentLength: 40,      // length of one recycled track chunk
    segmentCount: 8,        // chunks alive at once (view distance = length * count)
    tiltDeg: 12,            // visual downhill angle of the whole world
  },

  speed: {
    start: 20,              // units / sec
    accel: 0.8,             // units / sec² — the run keeps getting faster
    max: 110,
    penaltyMultiplier: 0.45 // speed while ragdolled
  },

  steer: {
    responsiveness: 9,      // how fast the player follows the mouse (higher = snappier)
    ragdollWobble: 3.5,     // random drift while ragdolled
  },

  player: {
    gravity: 38,
    rampLaunch: 16,         // vertical velocity when hitting a ramp
    radius: 0.7,
  },

  ramp: {
    lifetime: 4,            // seconds before the ramp despawns
    distanceAhead: 22,      // spawn this far in front of the player
    width: 4,
    length: 6,
    cooldown: 0.5,
    cost: 0,                // set > 0 later to make building cost cookies
  },

  obstacles: {
    perSegment: 2,          // average blocks per segment
    safeStartDistance: 120, // no obstacles in the first N units
  },

  economy: {
    clickValue: 1,
    passivePerSec: 0.5,     // base passive income
    passivePerSpeed: 0.02,  // bonus passive income per unit of speed
  },

  penalty: {
    recoverCost: 25,        // cookies to pay (Space) to exit ragdoll
    autoRecoverSec: 6,      // if you can't pay, you eventually recover anyway
  },

  popups: {
    firstDelay: 8,          // seconds before the first pop-up
    minInterval: 10,
    maxInterval: 18,
    wordTimeLimit: 20,
    wordReward: 40,
    windshieldDuration: 6,
  },
};
