/**
 * Replace songs with short/missing lyrics by trying alternatives from a pool.
 * Reuses the Genius fetch logic from fetch-lyrics.cjs.
 *
 * Usage: node scripts/replace-missing-lyrics.cjs
 */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const ACCESS_TOKEN =
  process.env.GENIUS_ACCESS_TOKEN ||
  "LXAinIq689s2Kt5u2Fy2EXBUhuM_sPkSd1W0t-OTvExjx_Ty7MaiLdyyV0NHZAVR";

const LESSONS_DIR = path.join(__dirname, "..", "lessons");
const MIN_CHARS = 300;

// ---- Replacement pools per language (candidates not already in the list) ----
const REPLACEMENTS = {
  chinese: [
    "海阔天空 Beyond", "光辉岁月 Beyond", "真的爱你 Beyond", "喜欢你 Beyond",
    "大鱼 周深", "明天会更好 群星", "恋曲1990 罗大佑",
    "我的歌声里 曲婉婷", "突然的自我 伍佰", "浪子回头 茄子蛋",
    "漂洋过海来看你 李宗盛", "山丘 李宗盛", "给自己的歌 李宗盛",
    "夜空中最亮的星 逃跑计划", "奇妙能力歌 陈粒", "易燃易爆炸 陈粒",
    "你的背包 陈奕迅", "好久不见 陈奕迅", "不要说话 陈奕迅",
    "爱情转移 陈奕迅", "K歌之王 陈奕迅", "岁月神偷 金玟岐",
    "南方姑娘 赵雷", "理想 赵雷", "我曾 隔壁老樊",
    "安静 周杰伦", "以父之名 周杰伦", "搁浅 周杰伦",
    "双截棍 周杰伦", "听妈妈的话 周杰伦", "蒲公英的约定 周杰伦",
    "最长的电影 周杰伦", "半岛铁盒 周杰伦", "珊瑚海 周杰伦",
    "龙卷风 周杰伦", "发如雪 周杰伦", "彩虹 周杰伦",
    "说好不哭 周杰伦", "Mojito 周杰伦",
    "飘向北方 黄明志 王力宏", "需要人陪 王力宏",
    "小情歌 苏打绿", "我好想你 苏打绿",
    "白月光与朱砂痣 大籽", "错位时空 艾辰",
  ],
  english: [
    "Smells Like Teen Spirit Nirvana", "Creep Radiohead",
    "No Tears Left to Cry Ariana Grande", "Thank U Next Ariana Grande",
    "Love Story Taylor Swift", "Cruel Summer Taylor Swift",
    "Havana Camila Cabello", "Photograph Ed Sheeran",
    "Castle on the Hill Ed Sheeran", "A Thousand Years Christina Perri",
    "Call Me Maybe Carly Rae Jepsen", "Titanium David Guetta Sia",
    "Chandelier Sia", "Cheap Thrills Sia",
    "Wake Me Up Avicii", "Levels Avicii",
    "Firework Katy Perry", "Roar Katy Perry",
    "Born This Way Lady Gaga", "Poker Face Lady Gaga",
    "Just The Way You Are Bruno Mars", "Grenade Bruno Mars",
    "Sugar Maroon 5", "Payphone Maroon 5",
    "See You Again Wiz Khalifa", "Believer Imagine Dragons",
    "Thunder Imagine Dragons", "Something Just Like This Chainsmokers Coldplay",
    "Don't Stop Believin Journey",
    "Take Me to Church Hozier", "Stitches Shawn Mendes",
  ],
  japanese: [
    "猫 DISH//", "Cry Baby Official髭男dism", "I LOVE... Official髭男dism",
    "白日 King Gnu", "一途 King Gnu", "BOY King Gnu",
    "残響散歌 Aimer", "カタオモイ Aimer",
    "Butter-Fly 和田光司", "only my railgun fripSide",
    "God knows... 涼宮ハルヒ", "ライオン May'n",
    "シャルル バルーン", "ロキ みきとP",
    "廻廻奇譚 Eve", "群青 YOASOBI",
    "ベテルギウス 優里", "ビリミリオン 優里",
    "踊り子 Vaundy", "怪獣の花唄 Vaundy",
    "春よ来い 松任谷由実", "やさしさに包まれたなら 松任谷由実",
    "世界が終るまでは WANDS", "全力少年 スキマスイッチ",
    "奏 スキマスイッチ", "空も飛べるはず スピッツ",
    "チェリー スピッツ", "ロビンソン スピッツ",
    "天体観測 BUMP OF CHICKEN", "カルマ BUMP OF CHICKEN",
    "瞬き back number", "水平線 back number",
    "高嶺の花子さん back number", "クリスマスソング back number",
    "未来予想図II DREAMS COME TRUE", "LOVE LOVE LOVE DREAMS COME TRUE",
    "涙そうそう BEGIN 夏川りみ", "島唄 THE BOOM",
    "Everything MISIA", "逢いたくていま MISIA",
  ],
  korean: [
    "여수 밤바다 버스커버스커", "벚꽃 엔딩 버스커버스커",
    "봄봄봄 로이킴", "봄이 좋냐 10cm",
    "나의 옛날이야기 IU", "팔레트 IU",
    "좋을텐데 BIGBANG", "꽃길 BIGBANG",
    "봄날은 간다 아이유", "삐삐 아이유",
    "비가 오는 날엔 비스트", "Fiction 비스트",
    "여행을 떠나요 솔지", "200% AKMU",
    "사랑을 했다 아이콘", "취중진담 김동률",
    "감사 김동률", "출발 김동률",
    "좋니 윤종신", "오래된 노래 스탠딩에그",
    "고백 STANDING EGG", "Little Star Standing Egg",
    "그녀가 조용히 다가와 시크릿", "별 이문세",
    "광화문에서 규현", "아름다운 구속 김경호",
    "나만 바라봐 태양", "눈물 소녀시대",
    "Hype Boy NewJeans", "OMG NewJeans",
    "사랑의 인사 마마무", "HIP 마마무",
    "FEARLESS LE SSERAFIM", "이태원 CLASS OST",
  ],
  spanish: [
    "Clandestino Manu Chao", "Oye Como Va Santana",
    "Maria Maria Santana", "Ciega Sordomuda Shakira",
    "La Bamba Ritchie Valens", "Conga Gloria Estefan",
    "Cielito Lindo tradicional", "Cuando Me Enamoro Enrique Iglesias",
    "Duele el Corazón Enrique Iglesias", "Bonito Jarabe de Palo",
    "La Plata Juanes", "Corazón sin Cara Prince Royce",
    "Darte un Beso Prince Royce", "Propuesta Indecente Romeo Santos",
    "Amorfoda Bad Bunny", "Vete Bad Bunny",
    "Si Tu Novio Te Deja Sola J Balvin",
    "Con Calma Daddy Yankee", "Dura Daddy Yankee",
    "Felices los 4 Maluma", "Borracha Maluma",
    "China Anuel AA", "Relación Sech",
    "Tusa Karol G Nicki Minaj", "Provenza Karol G",
    "La Gozadera Gente de Zona", "Baila Conmigo Selena Gomez",
    "Todo de Ti Rauw Alejandro",
    "La Incondicional Luis Miguel", "Hasta Que Te Conocí Juan Gabriel",
  ],
  french: [
    "Bella Maître Gims", "Est-ce que tu m'aimes Maître Gims",
    "Sapés comme jamais Maître Gims", "Avant toi Vitaa Slimane",
    "Ça va ça vient Vitaa Slimane", "Batterie faible Angèle",
    "Bruxelles je t'aime Angèle", "Djadja Aya Nakamura",
    "Pookie Aya Nakamura", "Le monde est stone Michel Berger",
    "Diego libre dans sa tête Michel Berger", "Quelque chose de Tennessee Johnny Hallyday",
    "Allumer le feu Johnny Hallyday", "Je te promets Johnny Hallyday",
    "Petite Marie Francis Cabrel",
  ],
  italian: [
    "Caruso Lucio Dalla", "Anna e Marco Lucio Dalla",
    "La Donna Cannone Francesco De Gregori",
    "Rimmel Francesco De Gregori", "E penso a te Lucio Battisti",
    "Emozioni Lucio Battisti", "Generale Vasco Rossi",
    "Vita Spericolata Vasco Rossi", "Siamo soli Vasco Rossi",
    "Musica leggerissima Colapesce Dimartino",
    "Noi Noi Noi Coez", "E sempre bello Coez",
    "Makumba Noemi Mvula", "Glicine Noemi",
    "Senza Fine Gino Paoli", "Mille Fedez Achille Lauro Orietta Berti",
    "Rolls Royce Achille Lauro", "Solo Noi Toto Cutugno",
    "L'italiano Toto Cutugno",
    "Azzurro Adriano Celentano",
  ],
  german: [
    "99 Luftballons Nena", "Irgendwie Irgendwo Irgendwann Nena",
    "Verdammt ich lieb dich Matthias Reim",
    "Ein bisschen Frieden Nicole", "Atemlos Helene Fischer",
    "Mein Herz brennt Rammstein", "Ich will Rammstein",
    "Alles aus Liebe Die Toten Hosen",
    "Tage wie diese Die Toten Hosen",
    "Hier kommt Alex Die Toten Hosen",
    "Zeig mir den Platz an der Sonne Ich + Ich",
    "An guten Tagen Johannes Oerding",
    "Kaputt Wincent Weiss",
    "Übermorgen Mark Forster",
    "Kogong Mark Forster",
  ],
};

// ---- HTTP / Genius helpers (same as fetch-lyrics.cjs) ----

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
  const containers = [];
  const regex = /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g;
  let match;
  while ((match = regex.exec(body)) !== null) containers.push(match[1]);
  if (containers.length === 0) return null;

  let text = containers.join("\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));

  return cleanLyrics(text);
}

function cleanLyrics(text) {
  let lines = text.split("\n");
  lines = lines.filter((l) => !l.match(/^\[.*\]$/));
  lines = lines.map((l) => l.trim());
  while (lines.length > 0 && lines[0] === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Try to fetch full lyrics for a search query. Returns {title, content, ...} or null. */
async function tryFetchSong(query) {
  const result = await geniusSearch(query);
  if (!result) return null;
  const lyrics = await fetchLyricsFromPage(result.url);
  if (!lyrics || lyrics.length < MIN_CHARS) return null;
  return { geniusTitle: result.full_title, content: lyrics };
}

// ---- Determine display title from genius search query ----
function formatTitle(query, lang) {
  // query is like "Song Artist"
  // We try to split into song + artist
  // For CJK languages, use （）, for others use ()
  const parts = query.split(/\s+/);
  // Heuristic: the last 1-2 words are the artist for CJK, otherwise more complex
  // Just use the genius title as reference
  return query; // Will be overridden below
}

function makeTitleFromQuery(query, lang) {
  // CJK: "歌名 歌手" -> "歌名（歌手）"
  // Others: "Song Artist" -> "Song (Artist)"
  // This is a rough heuristic; we do our best
  if (["chinese"].includes(lang)) {
    const m = query.match(/^(.+?)\s+([\u4e00-\u9fff].+)$/);
    if (m) return `${m[1]}（${m[2]}）`;
  }
  if (["japanese"].includes(lang)) {
    // Try to split at last space before Japanese chars
    const m = query.match(/^(.+?)\s+([^\x00-\x7F].+)$/);
    if (m) return `${m[1]}（${m[2]}）`;
    return query;
  }
  if (["korean"].includes(lang)) {
    const m = query.match(/^(.+?)\s+([가-힣].+)$/);
    if (m) return `${m[1]} (${m[2]})`;
  }
  // Default western: last known artist
  return query;
}

async function processLanguage(lang) {
  const filePath = path.join(LESSONS_DIR, lang, "lyrics-8.json");
  if (!fs.existsSync(filePath)) return;

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const pool = [...(REPLACEMENTS[lang] || [])];
  const existingTitles = new Set(data.lessons.map((l) => l.title.toLowerCase()));

  let replaced = 0;
  let alreadyFull = 0;

  for (const lesson of data.lessons) {
    if (lesson.content && lesson.content.length >= MIN_CHARS) {
      alreadyFull++;
      continue;
    }

    // Try replacements from pool
    let found = false;
    while (pool.length > 0) {
      const candidate = pool.shift();
      // Skip if already in the list
      if (existingTitles.has(candidate.toLowerCase())) continue;

      console.log(`  [${lang}] #${lesson.order} "${lesson.title}" -> trying "${candidate}"...`);
      try {
        const result = await tryFetchSong(candidate);
        if (result) {
          const newTitle = makeTitleFromQuery(candidate, lang);
          console.log(`    -> OK! Replacing with "${newTitle}" (${result.content.length} chars)`);
          lesson.title = newTitle;
          lesson.content = result.content;
          lesson.characterCount = result.content.length;
          lesson.cjkCharCount = countCjk(result.content);
          lesson.difficulty = getDifficulty(lesson.characterCount);
          lesson.id = crypto.randomUUID();
          existingTitles.add(newTitle.toLowerCase());
          replaced++;
          found = true;
          await sleep(400);
          break;
        } else {
          console.log(`    -> No lyrics found, trying next...`);
        }
      } catch (err) {
        console.log(`    -> Error: ${err.message}`);
      }
      await sleep(400);
    }

    if (!found) {
      console.log(`  [${lang}] #${lesson.order} "${lesson.title}" -> no replacement found, keeping as-is`);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`  [${lang}] Done: ${alreadyFull} already full, ${replaced} replaced, ${data.lessons.length - alreadyFull - replaced} still short`);
}

async function main() {
  const languages = Object.keys(REPLACEMENTS);
  console.log(`Replacing missing lyrics for: ${languages.join(", ")}`);
  console.log();

  for (const lang of languages) {
    console.log(`Processing ${lang}...`);
    await processLanguage(lang);
    console.log();
  }
  console.log("All done!");
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
