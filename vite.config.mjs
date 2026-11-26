// `busy-cli build` hands Vite its own config, and Vite merges this file into it. Before the app is bundled, the
// plugins generate what the app needs, all git-ignored: the sounds (src/sounds/*.snd), the voice clips converted from
// voice/ (src/sounds/<lang>_*.snd, src/voice.gen.ts), the bitmaps (src/art.gen.ts) and the measured nicknames
// (src/nicknames.gen.ts). So a clean clone builds with `busy-cli build` alone, as the BUSY Apps Catalog does.
import { readFileSync } from 'node:fs';
import { buildSounds } from './scripts/sfx.mjs';
import { writeArt } from './scripts/pixels.mjs';
import { buildVoice } from './scripts/voice.mjs';
import { writeNicknames } from './scripts/nicknames.mjs';

/** The third-party code bundled into main.js (specs/13), whose MIT licences ask for their notice in every copy. */
const BUNDLED = ['@busy-app/busy-lib', 'openapi-fetch'];

/** Puts the licence notices back at the top of each script, after minification has stripped every comment. */
const notices = {
  name: 'licence-notices',
  enforce: 'post',
  generateBundle(_, bundle) {
    const text = BUNDLED.map((d) => `${d}:\n${readFileSync(`node_modules/${d}/LICENSE`, 'utf8').trim()}`).join('\n\n');
    const banner = `/*! Bingo for the BUSY Bar, MIT licence (see the repository's LICENSE). Bundled third-party code:\n\n${text.replace(/\*\//g, '* /')}\n*/\n`;
    for (const chunk of Object.values(bundle)) if (chunk.type === 'chunk') chunk.code = banner + chunk.code;
  },
};

export default {
  plugins: [
    { name: 'sounds', buildStart: buildSounds },
    { name: 'art', buildStart: writeArt },
    { name: 'voice', buildStart: buildVoice },
    { name: 'nicknames', buildStart: writeNicknames },
    notices,
  ],
};
