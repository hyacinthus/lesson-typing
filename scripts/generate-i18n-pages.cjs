/**
 * Post-build script: generates per-language entry pages and sitemap.xml
 * Run after `vite build` to create i18n subpath pages in dist/.
 */

const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const META_PATH = path.resolve(__dirname, '..', 'src', 'i18n-meta.json');
const LOCALES_DIR = path.resolve(__dirname, '..', 'src', 'locales');

const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
const baseUrl = meta.baseUrl;
const languages = Object.keys(meta.languages);
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');

// The pages with an entry page of their own, /<lang>/<subpath>/index.html, for
// search engines and link previews. The Caddyfile serves it where it exists,
// and /<lang>/index.html for the app's other paths.
const PAGES = [
  { subpath: '', priority: 0.9, texts: (lang) => meta.languages[lang] },
  {
    subpath: 'download',
    priority: 0.7,
    texts: (lang) => {
      const locale = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${lang}.json`), 'utf-8'));
      return { title: locale.download.title, description: locale.download.subtitle };
    },
    // The desktop app, where the home page has the web app
    structuredData: { '@type': 'SoftwareApplication', operatingSystem: 'macOS, Windows, Linux' },
    // A lazily loaded page, which the app would ask for only once it runs
    chunk: 'DownloadPage',
  },
];

const pageUrl = (lang, subpath) => `${baseUrl}/${lang}/${subpath}`;

// ---------------------------------------------------------------------------
// 1. Build hreflang link tags (used in every page)
// ---------------------------------------------------------------------------
/** A page's URL in each language, and the default one. */
function alternates(subpath) {
  return [...languages.map((lang) => [lang, pageUrl(lang, subpath)]), ['x-default', pageUrl('en', subpath)]];
}

function hreflangTags(subpath) {
  return alternates(subpath)
    .map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${href}" />`)
    .join('\n    ');
}

// ---------------------------------------------------------------------------
// 2. Generate per-language entry pages
// ---------------------------------------------------------------------------
/** Text for HTML, where a quote would end an attribute. */
const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const STRUCTURED_DATA = /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/;
const structuredData = JSON.parse(template.match(STRUCTURED_DATA)[2]);
const assets = fs.readdirSync(path.join(DIST, 'assets'));

function entryPage(lang, page) {
  const texts = page.texts(lang);
  const [title, description, ogDescription] = [texts.title, texts.description, texts.ogDescription ?? texts.description].map(escapeHtml);
  const langUrl = pageUrl(lang, page.subpath);

  let html = template;

  // <html lang="...">
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`);

  // <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);

  // meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${description}"`
  );

  // og:title
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${title}"`
  );

  // og:description
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${ogDescription}"`
  );

  // og:url
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${langUrl}"`
  );

  // twitter:title
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${title}"`
  );

  // twitter:description
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${ogDescription}"`
  );

  // canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${langUrl}"`
  );

  // Structured data, with "<" escaped so that no text ends the script
  const data = { ...structuredData, name: texts.title, url: langUrl, description: texts.description, ...page.structuredData };
  html = html.replace(STRUCTURED_DATA, (_, open, _json, close) => `${open}${JSON.stringify(data).replace(/</g, '\\u003c')}${close}`);

  // Inject hreflang tags (and the page's chunk) before </head>
  const head = [hreflangTags(page.subpath)];
  if (page.chunk) {
    const chunk = assets.find((file) => file.startsWith(`${page.chunk}-`) && file.endsWith('.js'));
    if (!chunk) throw new Error(`No ${page.chunk} chunk in dist/assets`);
    head.push(`<link rel="modulepreload" crossorigin href="/assets/${chunk}">`);
  }
  html = html.replace('</head>', `    ${head.join('\n    ')}\n  </head>`);

  return html;
}

for (const page of PAGES) {
  for (const lang of languages) {
    const file = path.posix.join(lang, page.subpath, 'index.html');
    fs.mkdirSync(path.join(DIST, lang, page.subpath), { recursive: true });
    fs.writeFileSync(path.join(DIST, file), entryPage(lang, page));
    console.log(`Generated: ${file}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Replace root index.html with a redirect page
// ---------------------------------------------------------------------------
const supportedLangs = JSON.stringify(languages);

const redirectHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lesson Typing - Elementary School Typing Practice</title>
    <meta name="description" content="Free typing practice for elementary school students. Practice with real curriculum texts in 9 languages." />
    <link rel="canonical" href="${baseUrl}/en/" />
    ${hreflangTags('')}
    <noscript><meta http-equiv="refresh" content="0;url=/en/" /></noscript>
    <script>
      (function() {
        var supported = ${supportedLangs};
        var stored = '';
        try { stored = localStorage.getItem('lesson-typing-language') || ''; } catch(e) {}
        var nav = (navigator.language || '').split('-')[0].toLowerCase();
        var lang = (supported.indexOf(stored) !== -1 ? stored : (supported.indexOf(nav) !== -1 ? nav : 'en'));
        // Keeps the page, e.g. /download -> /<lang>/download
        location.replace('/' + lang + location.pathname + location.search + location.hash);
      })();
    </script>
  </head>
  <body>
    <noscript>
      <p>Redirecting to <a href="/en/">English version</a>...</p>
    </noscript>
  </body>
</html>
`;

fs.writeFileSync(path.join(DIST, 'index.html'), redirectHtml);
console.log('Generated: index.html (redirect)');

// ---------------------------------------------------------------------------
// 4. Generate sitemap.xml
// ---------------------------------------------------------------------------
function buildAlternates(subpath) {
  return alternates(subpath)
    .map(([lang, href]) => `      <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`)
    .join('\n');
}

// Per-language entries (root URL excluded — it is a noindex redirect)
const urlEntries = PAGES.flatMap((page) =>
  languages.map(
    (lang) =>
      `  <url>\n    <loc>${pageUrl(lang, page.subpath)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${page.priority}</priority>\n${buildAlternates(page.subpath)}\n  </url>`
  )
);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);
console.log('Generated: sitemap.xml');
