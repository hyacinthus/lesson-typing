/**
 * Fetch full lyrics from Genius API and update lyrics-8.json files.
 *
 * Usage:
 *   node scripts/fetch-lyrics.cjs [language...]
 *   node scripts/fetch-lyrics.cjs english japanese korean spanish french italian german
 *   node scripts/fetch-lyrics.cjs          # all languages with lyrics-8.json
 *
 * Requires GENIUS_ACCESS_TOKEN env var or .env.local with it.
 */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const https = require("https");

const ACCESS_TOKEN =
  process.env.GENIUS_ACCESS_TOKEN ||
  "LXAinIq689s2Kt5u2Fy2EXBUhuM_sPkSd1W0t-OTvExjx_Ty7MaiLdyyV0NHZAVR";

const LESSONS_DIR = path.join(__dirname, "..", "lessons");

// ---------- HTTP helpers ----------

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location, headers).then(resolve, reject);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on("error", reject);
  });
}

async function geniusSearch(query) {
  const url = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;
  const { body } = await httpsGet(url, { Authorization: `Bearer ${ACCESS_TOKEN}` });
  const data = JSON.parse(body);
  if (!data.response || !data.response.hits || data.response.hits.length === 0) return null;
  return data.response.hits[0].result;
}

async function fetchLyricsFromPage(geniusUrl) {
  const { body } = await httpsGet(geniusUrl);

  // Try to extract lyrics from the HTML
  // Genius uses <div data-lyrics-container="true"> for lyrics
  const containers = [];
  const regex = /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    containers.push(match[1]);
  }

  if (containers.length === 0) {
    // Fallback: try to find lyrics in JSON-LD or other patterns
    const jsonLdMatch = body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const ld = JSON.parse(jsonLdMatch[1]);
        if (ld.text) return cleanLyrics(ld.text);
      } catch {}
    }
    return null;
  }

  // Clean HTML to text
  let text = containers.join("\n");
  // Replace <br> and <br/> with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#x27;/g, "'");
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));

  return cleanLyrics(text);
}

function cleanLyrics(text) {
  let lines = text.split("\n");
  // Remove [Verse], [Chorus], [Bridge] etc. section headers
  lines = lines.filter((l) => !l.match(/^\[.*\]$/));
  // Trim each line
  lines = lines.map((l) => l.trim());
  // Remove leading/trailing empty lines
  while (lines.length > 0 && lines[0] === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  // Collapse 3+ consecutive empty lines to 1
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

function countChars(content) {
  return content.length;
}

function countCjk(content) {
  let count = 0;
  for (const ch of content) {
    const code = ch.codePointAt(0);
    // CJK Unified Ideographs: U+4E00 - U+9FFF
    // CJK Extension A: U+3400 - U+4DBF
    // CJK Extension B+: U+20000 - U+2A6DF
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df)
    ) {
      count++;
    }
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

// Extract artist and song name from the title field
function parseTitle(title) {
  // Format: "Song Name (Artist)" or "Song Name（Artist）"
  let match = title.match(/^(.+?)\s*[（(](.+?)[）)]$/);
  if (match) return { song: match[1].trim(), artist: match[2].trim() };
  // Fallback: use the whole thing as search query
  return { song: title, artist: "" };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processLanguage(lang) {
  const filePath = path.join(LESSONS_DIR, lang, "lyrics-8.json");
  if (!fs.existsSync(filePath)) {
    console.log(`  [${lang}] No lyrics-8.json found, skipping`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const lesson of data.lessons) {
    const currentLen = lesson.content ? lesson.content.length : 0;
    // Skip if already has substantial content (>300 chars means likely full lyrics)
    if (currentLen > 300) {
      skipped++;
      continue;
    }

    const { song, artist } = parseTitle(lesson.title);
    const query = artist ? `${song} ${artist}` : song;
    console.log(`  [${lang}] #${lesson.order} Searching: "${query}"...`);

    try {
      const result = await geniusSearch(query);
      if (!result) {
        console.log(`    -> No results found`);
        failed++;
        await sleep(500);
        continue;
      }

      console.log(`    -> Found: "${result.full_title}" (${result.url})`);
      const lyrics = await fetchLyricsFromPage(result.url);

      if (!lyrics || lyrics.length < 100) {
        console.log(`    -> Lyrics too short or not found (${lyrics ? lyrics.length : 0} chars)`);
        failed++;
        await sleep(500);
        continue;
      }

      lesson.content = lyrics;
      lesson.characterCount = countChars(lyrics);
      lesson.cjkCharCount = countCjk(lyrics);
      lesson.difficulty = getDifficulty(lesson.characterCount);
      updated++;
      console.log(`    -> OK: ${lesson.characterCount} chars, ${lyrics.split("\n").length} lines`);
    } catch (err) {
      console.log(`    -> Error: ${err.message}`);
      failed++;
    }

    // Rate limit: ~3 requests per second
    await sleep(400);
  }

  // Write back
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`  [${lang}] Done: ${updated} updated, ${skipped} skipped (already full), ${failed} failed`);
}

async function main() {
  let languages = process.argv.slice(2);
  if (languages.length === 0) {
    // Auto-detect: all subdirs in lessons/ that have lyrics-8.json
    languages = fs
      .readdirSync(LESSONS_DIR)
      .filter((d) => fs.existsSync(path.join(LESSONS_DIR, d, "lyrics-8.json")));
  }

  console.log(`Fetching lyrics for: ${languages.join(", ")}`);
  console.log(`Using Genius API with token: ${ACCESS_TOKEN.substring(0, 8)}...`);
  console.log();

  for (const lang of languages) {
    console.log(`Processing ${lang}...`);
    await processLanguage(lang);
    console.log();
  }

  console.log("All done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
