/**
 * Clean up Genius metadata from lyrics content, fix duplicates, and remove wrong content.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LESSONS_DIR = path.join(__dirname, "..", "lessons");
const MIN_CHARS = 300;

function countCjk(content) {
  let count = 0;
  for (const ch of content) {
    const code = ch.codePointAt(0);
    if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) || (code >= 0x20000 && code <= 0x2a6df)) count++;
  }
  return count;
}

function getDifficulty(charCount) {
  if (charCount < 200) return 2;
  if (charCount < 400) return 3;
  if (charCount < 600) return 4;
  if (charCount < 900) return 5;
  return 6;
}

function cleanContent(text) {
  let lines = text.split("\n");

  // Remove Genius metadata lines at the start
  // Patterns: "X Contributors...", "TranslationsEnglish", "X ContributorsSongName Lyrics"
  while (lines.length > 0) {
    const first = lines[0].trim();
    if (first === "") {
      lines.shift();
      continue;
    }
    if (first.match(/^\d+\s+Contributor/i)) {
      lines.shift();
      continue;
    }
    if (first.match(/^Translations?\w*/i)) {
      lines.shift();
      continue;
    }
    if (first.match(/Lyrics\s*$/i) && first.length < 200) {
      lines.shift();
      continue;
    }
    break;
  }

  // Remove [Verse], [Chorus] etc section headers
  lines = lines.filter(l => !l.trim().match(/^\[.*\]$/));

  // Trim
  lines = lines.map(l => l.trim());
  while (lines.length > 0 && lines[0] === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

  // Collapse multiple blank lines
  const result = [];
  let emptyCount = 0;
  for (const line of lines) {
    if (line === "") {
      emptyCount++;
      if (emptyCount <= 1) result.push(line);
    } else {
      emptyCount = 0;
      result.push(line);
    }
  }

  return result.join("\n");
}

function processFile(lang) {
  const filePath = path.join(LESSONS_DIR, lang, "lyrics-8.json");
  if (!fs.existsSync(filePath)) return;

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  let cleaned = 0;
  let flagged = 0;

  const seenContent = new Map(); // hash -> order

  for (const lesson of data.lessons) {
    // Clean metadata
    const original = lesson.content;
    lesson.content = cleanContent(lesson.content);

    if (lesson.content !== original) {
      cleaned++;
    }

    // Check for duplicates
    const contentHash = lesson.content.substring(0, 200);
    if (seenContent.has(contentHash)) {
      console.log(`  [${lang}] #${lesson.order} "${lesson.title}" is DUPLICATE of #${seenContent.get(contentHash)} - clearing`);
      lesson.content = "";
      flagged++;
    } else {
      seenContent.set(contentHash, lesson.order);
    }

    // Check for wrong content (novel text in Chinese)
    if (lang === "chinese" && (lesson.content.includes("小说") || lesson.content.includes("老陈处长"))) {
      console.log(`  [${lang}] #${lesson.order} "${lesson.title}" has NOVEL TEXT - clearing`);
      lesson.content = "";
      flagged++;
    }

    // Check for way too long content (likely wrong page)
    if (lesson.content.length > 3000) {
      console.log(`  [${lang}] #${lesson.order} "${lesson.title}" is TOO LONG (${lesson.content.length}) - clearing`);
      lesson.content = "";
      flagged++;
    }

    // Recalculate counts
    lesson.characterCount = lesson.content.length;
    lesson.cjkCharCount = countCjk(lesson.content);
    lesson.difficulty = getDifficulty(lesson.characterCount);
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");

  const empty = data.lessons.filter(l => l.content.length < MIN_CHARS).length;
  console.log(`  [${lang}] Cleaned: ${cleaned}, Flagged/cleared: ${flagged}, Now short/empty: ${empty}`);
}

const languages = ["chinese", "english", "japanese", "korean", "spanish", "portuguese", "french", "italian", "german"];
for (const lang of languages) {
  console.log(`Processing ${lang}...`);
  processFile(lang);
}
console.log("\nDone! Now run fetch-lyrics.cjs and replace-missing-lyrics.cjs to fill gaps.");
