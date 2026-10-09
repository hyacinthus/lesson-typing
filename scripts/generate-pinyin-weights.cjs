/**
 * Writes the pinyin length of every CJK ideograph for the desktop app
 * (desktop/internal/engine/pinyin_weights.bin), so that its keystroke
 * counts for Chinese match the web app's, which asks pinyin-pro the same
 * question per character (src/utils/statsCalculator.ts).
 *
 * One byte per code point, in the ranges isHanCharacter accepts:
 * U+3400–U+4DBF, U+4E00–U+9FFF, U+F900–U+FAFF.
 *
 * Run through `go generate ./internal/engine` in desktop/ after upgrading
 * pinyin-pro.
 */

const fs = require('fs');
const path = require('path');
const { pinyin } = require('pinyin-pro');

const RANGES = [
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xf900, 0xfaff],
];

const OUT = path.resolve(__dirname, '..', 'desktop', 'internal', 'engine', 'pinyin_weights.bin');

const bytes = [];
for (const [from, to] of RANGES) {
  for (let code = from; code <= to; code++) {
    const syllables = pinyin(String.fromCodePoint(code), { toneType: 'none', type: 'array' });
    const weight = Math.max(1, syllables.join('').length);
    if (weight > 255) {
      throw new Error(`U+${code.toString(16)} has an implausible pinyin length ${weight}`);
    }
    bytes.push(weight);
  }
}

fs.writeFileSync(OUT, Buffer.from(bytes));
console.log(`Wrote ${bytes.length} weights to ${path.relative(process.cwd(), OUT)}`);
