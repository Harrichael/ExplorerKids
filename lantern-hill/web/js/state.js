// Frame state that more than one module writes. Imported bindings are read-only in ES
// modules, so anything shared and mutable lives on this object instead of in a `let`.

export const game = {
  world: null,      // the world the player is in: HQ or a field trip stop
  elapsed: 0,
  cutscene: false,  // a scripted sequence has taken control away from the player
  cutCam: null,     // (pos, look) => void, steering the camera during a cutscene
  camShake: 0,
  nearest: null,    // the NPC in talking range, if any
  reach: [],        // usables in range, each at the index of its key in USE_KEYS (input.js)
  activity: null    // 'flashcards', 'book' or a page turn's 'storybook' while one fills the screen; the world pauses behind it
};
